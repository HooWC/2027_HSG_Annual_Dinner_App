import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <StatusBar style="light" />

      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="qr-code-outline" size={56} color="#d4a017" />
        </View>
        <Text style={styles.title}>Annual Dinner</Text>
        <Text style={styles.subtitle}>2027 Check-in</Text>
        <Text style={styles.hint}>Scan employee QR code to check in</Text>
      </View>

      <TouchableOpacity
        style={styles.scanButton}
        activeOpacity={0.85}
        onPress={() => router.push('/scan')}
      >
        <Ionicons name="scan" size={28} color="#0f2744" />
        <Text style={styles.scanButtonText}>Scan</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f2744',
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(212, 160, 23, 0.12)',
    borderWidth: 2,
    borderColor: 'rgba(212, 160, 23, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#d4a017',
  },
  hint: {
    marginTop: 16,
    fontSize: 15,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
  scanButton: {
    height: 64,
    borderRadius: 16,
    backgroundColor: '#d4a017',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#d4a017',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  scanButtonText: {
    color: '#0f2744',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
