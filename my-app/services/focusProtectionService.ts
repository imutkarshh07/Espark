import { Platform, Linking, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

const { FocusProtectionModule } = NativeModules;

export interface InstalledApp {
  name: string;
  packageName: string;
  icon?: string; // Base64 data URL (e.g. data:image/png;base64,...)
  isSystemApp?: boolean;
  launchable: boolean;
  enabled?: boolean;
}

export interface FocusProtectionStatus {
  isNativeBuild: boolean;
  isExpoGo: boolean;
  isSupported: boolean;
  hasAccessibilityPermission: boolean;
  hasDeviceAdminPermission: boolean;
  title: string;
  description: string;
  statusBadge: 'ENABLED' | 'PARTIAL' | 'DISABLED' | 'UNAVAILABLE_IN_EXPO_GO';
}

// Fallback curated study apps when running inside Expo Go / non-native environment
const FALLBACK_STUDY_APPS: InstalledApp[] = [
  {
    name: 'Scientific Calculator',
    packageName: 'com.google.android.calculator',
    isSystemApp: true,
    launchable: true,
    enabled: true,
  },
  {
    name: 'Study Notes & PDF Reader',
    packageName: 'com.google.android.apps.docs',
    isSystemApp: false,
    launchable: true,
    enabled: true,
  },
  {
    name: 'Clock & Timer',
    packageName: 'com.google.android.deskclock',
    isSystemApp: true,
    launchable: true,
    enabled: false,
  },
  {
    name: 'Ambient Study Audio',
    packageName: 'com.spotify.music',
    isSystemApp: false,
    launchable: true,
    enabled: true,
  },
  {
    name: 'Emergency Calls',
    packageName: 'com.google.android.dialer',
    isSystemApp: true,
    launchable: true,
    enabled: true,
  },
];

/**
 * Focus Protection Service
 * Bridges React Native with ESpark's native Android AccessibilityService
 * and PackageManager modules.
 */
export const focusProtectionService = {
  /**
   * Determine whether running under a custom native build with FocusProtectionModule
   */
  isNativeAvailable(): boolean {
    return Platform.OS === 'android' && FocusProtectionModule != null;
  },

  /**
   * Determine whether running inside Expo Go
   */
  isExpoGo(): boolean {
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
      FocusProtectionModule == null
    );
  },

  /**
   * Check whether ESpark's FocusAccessibilityService is genuinely enabled in Android Settings
   */
  async isAccessibilityServiceEnabled(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.isAccessibilityServiceEnabled();
      } catch (err) {
        console.warn('[FocusProtection] Native accessibility check error:', err);
      }
    }
    return false;
  },

  /**
   * Open Android Accessibility Settings page
   */
  async openAccessibilitySettings(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.openAccessibilitySettings();
      } catch (err) {
        console.warn('[FocusProtection] Native openAccessibilitySettings error:', err);
      }
    }

    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.ACCESSIBILITY_SETTINGS');
        return true;
      } catch (err) {
        console.warn('[FocusProtection] sendIntent ACCESSIBILITY_SETTINGS fallback error:', err);
      }
    }

    try {
      await Linking.openSettings();
      return true;
    } catch (err) {
      console.warn('[FocusProtection] openSettings failed:', err);
      return false;
    }
  },

  /**
   * Retrieve real installed applications via Android PackageManager
   */
  async getInstalledApps(): Promise<InstalledApp[]> {
    if (this.isNativeAvailable()) {
      try {
        const apps: InstalledApp[] = await FocusProtectionModule.getInstalledApps();
        if (Array.isArray(apps) && apps.length > 0) {
          // Sort alphabetically by app name
          return apps.sort((a, b) => a.name.localeCompare(b.name));
        }
      } catch (err) {
        console.warn('[FocusProtection] Native getInstalledApps error, falling back:', err);
      }
    }

    return FALLBACK_STUDY_APPS;
  },

  /**
   * Launch a real installed Android application
   */
  async launchApp(packageName: string): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        const launched = await FocusProtectionModule.launchApp(packageName);
        if (launched) return true;
      } catch (err) {
        console.warn(`[FocusProtection] Native launchApp error for ${packageName}:`, err);
      }
    }

    // Fallback URL scheme attempts
    try {
      if (packageName === 'com.spotify.music') {
        const can = await Linking.canOpenURL('spotify://');
        if (can) {
          await Linking.openURL('spotify://');
          return true;
        }
      } else if (packageName.includes('dialer')) {
        await Linking.openURL('tel:');
        return true;
      }
    } catch (_: any) {}

    return false;
  },

  /**
   * Synchronize active focus session with native Android SharedPreferences
   * so FocusAccessibilityService can inspect foreground apps.
   */
  async startFocusProtection(endTimeMs: number, allowedPackages: string[]): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.startFocusProtection(endTimeMs, allowedPackages);
      } catch (err) {
        console.warn('[FocusProtection] Native startFocusProtection error:', err);
      }
    }
    return false;
  },

  /**
   * Stop focus protection in native Android SharedPreferences
   */
  async stopFocusProtection(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.stopFocusProtection();
      } catch (err) {
        console.warn('[FocusProtection] Native stopFocusProtection error:', err);
      }
    }
    return false;
  },

  /**
   * Check if ESpark is an active Device Administrator (OS-level uninstall lock)
   */
  async isDeviceAdminActive(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.isDeviceAdminActive();
      } catch (err) {
        console.warn('[FocusProtection] isDeviceAdminActive error:', err);
      }
    }
    return false;
  },

  /**
   * Request Device Administrator permission to lock uninstallation
   */
  async requestDeviceAdmin(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.requestDeviceAdmin();
      } catch (err) {
        console.warn('[FocusProtection] requestDeviceAdmin error:', err);
      }
    }
    return false;
  },

  /**
   * Start Lock Task Mode (Screen Pinning / Kiosk Mode) to lock app on screen
   */
  async startLockTask(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.startLockTask();
      } catch (err) {
        console.warn('[FocusProtection] startLockTask error:', err);
      }
    }
    return false;
  },

  /**
   * Stop Lock Task Mode (Screen Pinning / Kiosk Mode)
   */
  async stopLockTask(): Promise<boolean> {
    if (this.isNativeAvailable()) {
      try {
        return await FocusProtectionModule.stopLockTask();
      } catch (err) {
        console.warn('[FocusProtection] stopLockTask error:', err);
      }
    }
    return false;
  },

  /**
   * Get honest environment status
   */
  async getProtectionStatus(): Promise<FocusProtectionStatus> {
    const isNative = this.isNativeAvailable();
    const isExpo = this.isExpoGo();

    if (isNative) {
      const hasAccessibility = await this.isAccessibilityServiceEnabled();
      const hasDeviceAdmin = await this.isDeviceAdminActive();
      const allEnabled = hasAccessibility && hasDeviceAdmin;
      const partialEnabled = hasAccessibility || hasDeviceAdmin;

      let desc = '';
      if (allEnabled) {
        desc = 'Full Protection Active: Distracting apps, device power-off dialogs, and uninstallation are locked during study sessions.';
      } else if (hasAccessibility) {
        desc = 'App blocking & power-off interception active. Enable Device Admin for OS-level uninstallation lock.';
      } else {
        desc = 'Permissions disabled. Enable Accessibility Service and Device Admin for complete focus lockdown.';
      }

      return {
        isNativeBuild: true,
        isExpoGo: false,
        isSupported: true,
        hasAccessibilityPermission: hasAccessibility,
        hasDeviceAdminPermission: hasDeviceAdmin,
        title: 'Android Strict Focus Protection',
        description: desc,
        statusBadge: allEnabled ? 'ENABLED' : partialEnabled ? 'PARTIAL' : 'DISABLED',
      };
    }

    return {
      isNativeBuild: false,
      isExpoGo: true,
      isSupported: false,
      hasAccessibilityPermission: false,
      hasDeviceAdminPermission: false,
      title: 'Focus Protection (Expo Go)',
      description:
        'Full Focus Protection (app blocking, power-off guard, uninstall lock) requires the ESpark Android build. Expo Go cannot host native services.',
      statusBadge: 'UNAVAILABLE_IN_EXPO_GO',
    };
  },
};
