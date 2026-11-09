import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

export interface FocusApp {
  id: string;
  name: string;
  icon: string;
  category: 'study' | 'utility' | 'music' | 'system' | 'custom';
  enabled: boolean;
  packageName?: string;
  urlScheme?: string;
}

export interface ActiveFocusSession {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  subjectTag: string;
  allowedApps: string[];
  allowedPackages?: string[];
  distractionViolations: number;
  status: 'active' | 'completed' | 'abandoned';
}

const ACTIVE_SESSION_STORAGE_KEY = '@espark_active_focus_session';
const ALLOWED_APPS_STORAGE_KEY = '@espark_allowed_apps_config';
const ALLOWED_PACKAGES_STORAGE_KEY = '@espark_allowed_packages';

export const DEFAULT_STUDY_APPS: FocusApp[] = [
  {
    id: 'calc',
    name: 'Scientific Calculator',
    icon: 'calculate',
    category: 'study',
    enabled: true,
    packageName: 'com.google.android.calculator',
    urlScheme: 'calc://',
  },
  {
    id: 'notes',
    name: 'Study Notes & PDF Reader',
    icon: 'menu-book',
    category: 'study',
    enabled: true,
  },
  {
    id: 'doubt',
    name: 'AI Doubt Solver',
    icon: 'psychology',
    category: 'study',
    enabled: true,
  },
  {
    id: 'clock',
    name: 'Clock & Timer',
    icon: 'schedule',
    category: 'utility',
    enabled: false,
    packageName: 'com.google.android.deskclock',
  },
  {
    id: 'music',
    name: 'Ambient Study Audio',
    icon: 'music-note',
    category: 'music',
    enabled: true,
    urlScheme: 'spotify://',
  },
  {
    id: 'calls',
    name: 'Emergency Calls',
    icon: 'phone',
    category: 'system',
    enabled: true,
    urlScheme: 'tel:',
  },
];

export const DISTRACTING_APPS_PREVIEW = [
  { name: 'Instagram', category: 'Social Media', icon: 'camera-alt' },
  { name: 'YouTube', category: 'Video Streaming', icon: 'smart-display' },
  { name: 'Chrome', category: 'Web Browser', icon: 'public' },
  { name: 'WhatsApp', category: 'Messaging', icon: 'chat' },
  { name: 'Games & Entertainment', category: 'Games', icon: 'sports-esports' },
  { name: 'Netflix', category: 'Streaming', icon: 'movie' },
];

export const focusSessionService = {
  /**
   * Accurate timestamp countdown calculator
   * Eliminates setInterval drift and guarantees proper time calculation across background states
   */
  computeRemainingSeconds(endTime: number): number {
    const diffMs = endTime - Date.now();
    return Math.max(0, Math.round(diffMs / 1000));
  },

  /**
   * Persist active focus session to local storage
   */
  async saveActiveSession(session: ActiveFocusSession): Promise<void> {
    try {
      await AsyncStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (err) {
      console.warn('[FocusSession] Failed to persist active session:', err);
    }
  },

  /**
   * Retrieve active session if one was running before app was killed or backgrounded
   */
  async getActiveSession(): Promise<ActiveFocusSession | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (!raw) return null;
      const parsed: ActiveFocusSession = JSON.parse(raw);
      return parsed;
    } catch (err) {
      console.warn('[FocusSession] Failed to load active session:', err);
      return null;
    }
  },

  /**
   * Clear active session after completion or intentional finish
   */
  async clearActiveSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
    } catch (err) {
      console.warn('[FocusSession] Failed to clear active session:', err);
    }
  },

  /**
   * Load student's customized allowed apps list
   */
  async getSavedAllowedApps(): Promise<FocusApp[]> {
    try {
      const raw = await AsyncStorage.getItem(ALLOWED_APPS_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[FocusSession] Failed to load allowed apps:', err);
    }
    return DEFAULT_STUDY_APPS;
  },

  /**
   * Save student's customized allowed apps list
   */
  async saveAllowedApps(apps: FocusApp[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALLOWED_APPS_STORAGE_KEY, JSON.stringify(apps));
    } catch (err) {
      console.warn('[FocusSession] Failed to save allowed apps:', err);
    }
  },

  /**
   * Load saved allowed package names for real Android apps
   */
  async getSavedAllowedPackages(): Promise<string[]> {
    try {
      const raw = await AsyncStorage.getItem(ALLOWED_PACKAGES_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[FocusSession] Failed to load allowed packages:', err);
    }
    return [
      'com.google.android.calculator',
      'com.google.android.apps.docs',
      'com.spotify.music',
    ];
  },

  /**
   * Save allowed package names for real Android apps
   */
  async saveAllowedPackages(packages: string[]): Promise<void> {
    try {
      await AsyncStorage.setItem(ALLOWED_PACKAGES_STORAGE_KEY, JSON.stringify(packages));
    } catch (err) {
      console.warn('[FocusSession] Failed to save allowed packages:', err);
    }
  },

  /**
   * Attempt opening an allowed app using its URL scheme or package intent
   */
  async launchAllowedApp(app: FocusApp): Promise<boolean> {
    if (app.urlScheme) {
      try {
        const canOpen = await Linking.canOpenURL(app.urlScheme);
        if (canOpen) {
          await Linking.openURL(app.urlScheme);
          return true;
        }
      } catch (err) {
        console.warn(`[FocusSession] Could not launch app scheme ${app.urlScheme}:`, err);
      }
    }
    return false;
  },
};
