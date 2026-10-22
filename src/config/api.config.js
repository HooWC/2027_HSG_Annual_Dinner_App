import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Release APK -> production HTTP API (no SSL)
 * Dev (Expo) -> same PC LAN IP :5308
 */
const PRODUCTION_API_URL = 'http://hschinatruck.fortiddns.com:5308';

function resolveDevApiBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    Constants.manifest?.debuggerHost ||
    '';

  const host = String(hostUri).split(':')[0].trim();

  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    return `http://${host}:5308`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5308';
  }

  return 'http://127.0.0.1:5308';
}

export const API_BASE_URL = __DEV__ ? resolveDevApiBaseUrl() : PRODUCTION_API_URL;

export const API_ENDPOINTS = {
  HEALTH: '/health',
  SCAN_CHECKIN: '/USERS/scan-checkin',
  BY_EMPLOYEE: (employeeId) => `/USERS/by-employee/${encodeURIComponent(employeeId)}`,
  AVATAR: (employeeId) => `/USERS/avatar/${encodeURIComponent(employeeId)}`,
};
