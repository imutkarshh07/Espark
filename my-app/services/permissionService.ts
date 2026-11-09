import { Platform, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { focusProtectionService } from './focusProtectionService';
import { safeStorage } from './safeStorage';

export type PermissionStatusType = 'granted' | 'denied' | 'undetermined';

export interface PermissionDetails {
  id: 'camera' | 'mediaLibrary' | 'notifications' | 'accessibility';
  title: string;
  subtitle: string;
  description: string;
  status: PermissionStatusType;
  icon: string;
  isCrucial: boolean;
}

const PERMISSION_ONBOARDED_KEY = '@espark_permissions_onboarded_v1';

export const permissionService = {
  /**
   * Check Camera permission status
   */
  async checkCamera(): Promise<PermissionStatusType> {
    try {
      const res = await ImagePicker.getCameraPermissionsAsync();
      if (res.granted) return 'granted';
      if (res.status === 'denied' && !res.canAskAgain) return 'denied';
      if (res.status === 'denied') return 'denied';
      return 'undetermined';
    } catch (e) {
      console.warn('[PermissionService] Check camera error:', e);
      return 'undetermined';
    }
  },

  /**
   * Request Camera permission
   */
  async requestCamera(): Promise<boolean> {
    try {
      const res = await ImagePicker.requestCameraPermissionsAsync();
      return res.granted;
    } catch (e) {
      console.warn('[PermissionService] Request camera error:', e);
      return false;
    }
  },

  /**
   * Check Media Library (Photos) permission status
   */
  async checkMediaLibrary(): Promise<PermissionStatusType> {
    try {
      const res = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (res.granted) return 'granted';
      if (res.status === 'denied') return 'denied';
      return 'undetermined';
    } catch (e) {
      console.warn('[PermissionService] Check media library error:', e);
      return 'undetermined';
    }
  },

  /**
   * Request Media Library permission
   */
  async requestMediaLibrary(): Promise<boolean> {
    try {
      const res = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return res.granted;
    } catch (e) {
      console.warn('[PermissionService] Request media library error:', e);
      return false;
    }
  },

  /**
   * Check Notifications permission
   */
  async checkNotifications(): Promise<PermissionStatusType> {
    try {
      // In modern Android (API 33+), notifications can be checked or default to granted in Expo
      const stored = await safeStorage.getItem('@espark_notifications_enabled');
      if (stored === 'true') return 'granted';
      if (stored === 'false') return 'denied';
      return 'undetermined';
    } catch (e) {
      return 'undetermined';
    }
  },

  /**
   * Request Notifications permission
   */
  async requestNotifications(): Promise<boolean> {
    try {
      await safeStorage.setItem('@espark_notifications_enabled', 'true');
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Check Android Accessibility Service for Focus Mode
   */
  async checkAccessibility(): Promise<PermissionStatusType> {
    try {
      if (Platform.OS !== 'android') return 'granted';
      const status = await focusProtectionService.getProtectionStatus();
      if (status.hasAccessibilityPermission) return 'granted';
      if (status.isExpoGo) return 'undetermined';
      return 'denied';
    } catch (e) {
      return 'undetermined';
    }
  },

  /**
   * Open Android Accessibility Settings to grant Focus Protection service
   */
  async openAccessibilitySettings(): Promise<void> {
    try {
      await focusProtectionService.openAccessibilitySettings();
    } catch (e) {
      await this.openAppSettings();
    }
  },

  /**
   * Open the native OS App Settings page for manual permission grants
   */
  async openAppSettings(): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL('app-settings:');
      } else {
        await Linking.openSettings();
      }
    } catch (e) {
      console.warn('[PermissionService] Failed to open app settings:', e);
    }
  },

  /**
   * Get comprehensive status for all app permissions
   */
  async getAllStatuses(): Promise<PermissionDetails[]> {
    const [camera, media, notif, accessibility] = await Promise.all([
      this.checkCamera(),
      this.checkMediaLibrary(),
      this.checkNotifications(),
      this.checkAccessibility(),
    ]);

    return [
      {
        id: 'camera',
        title: 'Camera Access',
        subtitle: 'Photograph textbook questions & diagrams',
        description: 'Enables instant snapshot solving in the AI Doubt Solver. Take photos of complex math derivations, chemical equations, and biology diagrams for step-by-step guidance.',
        status: camera,
        icon: 'camera-alt',
        isCrucial: true,
      },
      {
        id: 'mediaLibrary',
        title: 'Photo Library & Gallery',
        subtitle: 'Attach screenshots and saved question papers',
        description: 'Allows you to select stored question images, downloaded diagrams, or textbook scans from your device gallery to analyze with AI.',
        status: media,
        icon: 'photo-library',
        isCrucial: true,
      },
      {
        id: 'notifications',
        title: 'Study Notifications & Timers',
        subtitle: 'Focus session alerts and streak tracking',
        description: 'Sends gentle reminders when your study break ends, keeps track of your daily study streak, and alerts you when mock test reports are ready.',
        status: notif,
        icon: 'notifications-active',
        isCrucial: false,
      },
      {
        id: 'accessibility',
        title: 'Focus & Anti-Tamper Guard',
        subtitle: 'Prevents power-off, uninstalls & distracting apps',
        description: 'Enables system-level focus lockdown during active study sessions. Automatically intercepts and dismisses hardware power-off / restart menus, prevents uninstallation attempts, and blocks distracting social apps until your study timer completes.',
        status: accessibility,
        icon: 'security',
        isCrucial: false,
      },
    ];
  },

  /**
   * Request essential permissions (Camera + Photos + Notifications) in sequence
   */
  async requestAllEssentials(): Promise<{
    camera: boolean;
    mediaLibrary: boolean;
    notifications: boolean;
  }> {
    const camera = await this.requestCamera();
    const mediaLibrary = await this.requestMediaLibrary();
    const notifications = await this.requestNotifications();

    await this.markOnboardingComplete();

    return { camera, mediaLibrary, notifications };
  },

  async hasCompletedOnboarding(): Promise<boolean> {
    try {
      const val = (await safeStorage.getItem(PERMISSION_ONBOARDED_KEY)) || (await AsyncStorage.getItem(PERMISSION_ONBOARDED_KEY));
      return val === 'true';
    } catch {
      return false;
    }
  },

  async markOnboardingComplete(): Promise<void> {
    try {
      await safeStorage.setItem(PERMISSION_ONBOARDED_KEY, 'true');
      await AsyncStorage.setItem(PERMISSION_ONBOARDED_KEY, 'true');
    } catch {
      // ignore
    }
  },
};
