import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL, API_ENDPOINTS } from '../config/api.config';
import { apiJson } from '../utils/apiClient';

export default function ConfirmScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const employeeId = String(params.employeeId || '').trim();
  const qrFullName = String(params.fullName || '').trim();
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);
  const [employeeValid, setEmployeeValid] = useState(false);
  const [displayName, setDisplayName] = useState(qrFullName);
  const [avatarUri, setAvatarUri] = useState(null);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const goHome = () => {
    router.replace('/');
  };

  const goScan = () => {
    router.replace('/scan');
  };

  useEffect(() => {
    let cancelled = false;

    async function verifyEmployee() {
      if (!employeeId) {
        Alert.alert('Invalid Data', 'EMP ID is missing from QR code.', [
          { text: 'OK', onPress: goHome },
        ]);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        // SELECT * FROM Users WHERE EmployeeId = ...
        const user = await apiJson(API_ENDPOINTS.BY_EMPLOYEE(employeeId));
        if (cancelled) return;

        setEmployeeValid(true);
        setDisplayName(user.FullName || qrFullName);
        setAvatarUri(user.avatarUrl ? `${API_BASE_URL}${user.avatarUrl}` : null);

        if (user.Thumping) {
          setAlreadyCheckedIn(true);
          setEmployeeValid(false);
        }
      } catch (error) {
        if (cancelled) return;
        setEmployeeValid(false);

        const notFound =
          error.status === 404 ||
          /not found/i.test(error.message || '');

        if (notFound) {
          setNotFound(true);
        } else {
          Alert.alert(
            'Lookup Failed',
            error.message || 'Unable to verify employee in database.',
            [
              { text: 'Scan Again', onPress: goScan },
              { text: 'Home', onPress: goHome },
            ]
          );
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    verifyEmployee();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const handleCheckIn = async () => {
    if (!employeeId || submitting || !employeeValid) return;

    setSubmitting(true);
    try {
      const result = await apiJson(API_ENDPOINTS.SCAN_CHECKIN, {
        method: 'POST',
        body: JSON.stringify({
          employeeId,
          fullName: displayName || qrFullName,
        }),
      });

      Alert.alert(
        'Success',
        result.message || `${employeeId} checked in successfully.`
      );
      setTimeout(goHome, 900);
    } catch (error) {
      if (error.status === 409 || /already checked in/i.test(error.message || '')) {
        setAlreadyCheckedIn(true);
        setEmployeeValid(false);
        return;
      }
      if (error.status === 404 || /not found/i.test(error.message || '')) {
        setNotFound(true);
        setEmployeeValid(false);
        return;
      }
      Alert.alert('Check-in Failed', error.message || 'Unable to check in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <StatusBar style="light" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Confirm Check-in</Text>
          <Text style={styles.headerSubtitle}>
            {checking ? 'Checking database...' : 'Please verify employee details'}
          </Text>
        </View>

        {alreadyCheckedIn ? (
          <View style={styles.alreadyBox}>
            <Ionicons name="alert-circle" size={18} color="#b42318" />
            <Text style={styles.alreadyTitle}>Already Checked In</Text>
          </View>
        ) : null}

        {notFound ? (
          <View style={styles.notFoundBox}>
            <Ionicons name="person-remove" size={18} color="#b54708" />
            <Text style={styles.notFoundTitle}>Employee Not Found</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <View style={styles.cardIcon}>
            {avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={alreadyCheckedIn || notFound ? styles.avatarSmall : styles.avatar}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={alreadyCheckedIn || notFound ? 72 : 88} color="#0f2744" />
            )}
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>EMP ID</Text>
            <Text style={styles.value}>{employeeId || '—'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{displayName || qrFullName || '—'}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}>
        {!alreadyCheckedIn && !notFound ? (
          <TouchableOpacity
            style={[styles.checkInButton, (submitting || !employeeValid) && styles.buttonDisabled]}
            onPress={handleCheckIn}
            disabled={submitting || checking || !employeeValid}
            activeOpacity={0.85}
          >
            {submitting || checking ? (
              <ActivityIndicator color="#0f2744" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#0f2744" />
                <Text style={styles.checkInText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.backButton}
          onPress={goHome}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2744',
    paddingHorizontal: 24,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  header: {
    marginBottom: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
  },
  alreadyBox: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e10600',
    backgroundColor: '#fff1f0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  alreadyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b42318',
  },
  notFoundBox: {
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f79009',
    backgroundColor: '#fffaeb',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  notFoundTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#b54708',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  cardIcon: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#e8eef5',
  },
  avatarSmall: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e8eef5',
  },
  row: {
    marginVertical: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8a8a8a',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f2744',
  },
  divider: {
    height: 1,
    backgroundColor: '#ececec',
    marginVertical: 10,
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 12,
    backgroundColor: '#0f2744',
  },
  checkInButton: {
    height: 58,
    borderRadius: 14,
    backgroundColor: '#d4a017',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  checkInText: {
    color: '#0f2744',
    fontSize: 18,
    fontWeight: '800',
  },
  backButton: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
