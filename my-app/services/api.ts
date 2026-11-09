import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { safeStorage } from './safeStorage';

// Default development LAN IP of host machine for real physical phone preview builds
const DEV_LAN_IP = '10.140.123.214';

const getBackendBaseUrl = (): string => {
  // 1. Try extracting host IP from Metro / Expo Go environment
  let detectedIp: string | null = null;
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const rawIp = hostUri.split(':')[0];
    if (rawIp && rawIp !== 'localhost' && rawIp !== '127.0.0.1') {
      detectedIp = rawIp;
    }
  }

  if (!detectedIp) {
    const expUrl = (Constants as any).experienceUrl;
    if (typeof expUrl === 'string' && expUrl.includes('://')) {
      const hostPart = expUrl.split('://')[1];
      if (hostPart) {
        const rawIp = hostPart.split('/')[0].split(':')[0];
        if (rawIp && rawIp !== 'localhost' && rawIp !== '127.0.0.1') {
          detectedIp = rawIp;
        }
      }
    }
  }

  // If connected via Metro (Expo Go on physical phone), use the live Metro IP
  if (detectedIp) {
    return `http://${detectedIp}:5000/api`;
  }

  // 2. If explicit EXPO_PUBLIC_API_URL is provided, use it
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl) {
    if (Platform.OS === 'android' && envUrl.includes('localhost')) {
      return Constants.isDevice ? envUrl.replace('localhost', DEV_LAN_IP) : envUrl.replace('localhost', '10.0.2.2');
    }
    return envUrl;
  }

  // 3. Android: Physical device vs Emulator
  if (Platform.OS === 'android') {
    // On physical phone (e.g. installed preview APK), 10.0.2.2 is unreachable, so use LAN IP
    if (Constants.isDevice) {
      return `http://${DEV_LAN_IP}:5000/api`;
    }
    return 'http://10.0.2.2:5000/api';
  }

  // 4. iOS Simulator & Web fallback
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBackendBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // 60s timeout for deep multimodal AI reasoning on images/PDFs
  headers: {
    'Content-Type': 'application/json',
  },
});

const PRIMARY_DEMO_TOKEN_KEY = '@study_insights_demo_token';
const LEGACY_DEMO_TOKEN_KEY = 'espark_demo_token';

// Attach real Supabase access token or explicit demo token
api.interceptors.request.use(async (config) => {
  try {
    // If an Authorization header is already provided on the request, preserve it
    if (config.headers?.Authorization) {
      return config;
    }

    // 1. Try real Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
      return config;
    }

    // 2. Try stored student/demo tokens across safeStorage and AsyncStorage
    const demoToken =
      (await safeStorage.getItem(PRIMARY_DEMO_TOKEN_KEY)) ||
      (await safeStorage.getItem(LEGACY_DEMO_TOKEN_KEY)) ||
      (await AsyncStorage.getItem(PRIMARY_DEMO_TOKEN_KEY)) ||
      (await AsyncStorage.getItem(LEGACY_DEMO_TOKEN_KEY));

    if (demoToken) {
      config.headers.Authorization = `Bearer ${demoToken}`;
      return config;
    }

    // 3. Fallback to default student bearer token so protected educational endpoints never fail on missing header
    config.headers.Authorization = 'Bearer demo-student-token';
  } catch (err) {
    console.warn('[Mobile API] Auth session token lookup failed:', err);
    config.headers.Authorization = 'Bearer demo-student-token';
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // 1. Server returned a structured HTTP response (4xx or 5xx)
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;
      const errorData = responseData?.error || {
        code: status >= 500 ? 'SERVER_ERROR' : 'REQUEST_FAILED',
        message: responseData?.message || error.message || 'Server error',
      };
      return Promise.reject({
        ...errorData,
        status,
        isNetworkError: false,
      });
    }

    // 2. Timeout error
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return Promise.reject({
        code: 'TIMEOUT',
        message: 'ESpark is taking too long to respond. Please try again.',
        isNetworkError: true,
      });
    }

    // 3. Network unreachable / connection refused
    const isConnRefused = error.message?.includes('ECONNREFUSED') || error.code === 'ERR_NETWORK';
    return Promise.reject({
      code: isConnRefused ? 'BACKEND_UNREACHABLE' : 'NETWORK_ERROR',
      message: isConnRefused
        ? `Unable to connect to ESpark backend at ${API_BASE_URL}. Ensure your phone is connected to the same Wi-Fi as your computer and backend is running.`
        : error.message || 'Network error occurred.',
      isNetworkError: true,
    });
  }
);

export default api;
