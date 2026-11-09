import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useAppTheme } from '../context/ThemeContext';
import { AppHeader } from '../components/AppHeader';
import { permissionService, PermissionDetails } from '../services/permissionService';

export default function PermissionsScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();

  const [permissions, setPermissions] = useState<PermissionDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [batchRequesting, setBatchRequesting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const items = await permissionService.getAllStatuses();
      setPermissions(items);
    } catch (e) {
      console.warn('[PermissionsScreen] Load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGrantSingle = async (perm: PermissionDetails) => {
    setRequestingId(perm.id);
    try {
      if (perm.id === 'camera') {
        const granted = await permissionService.requestCamera();
        if (!granted && perm.status === 'denied') {
          showSettingsAlert('Camera Permission', 'Camera access was previously denied. Please enable it in device settings to snap doubt photos.');
        }
      } else if (perm.id === 'mediaLibrary') {
        const granted = await permissionService.requestMediaLibrary();
        if (!granted && perm.status === 'denied') {
          showSettingsAlert('Photo Gallery Access', 'Gallery access was previously denied. Please enable it in device settings to attach doubt diagrams.');
        }
      } else if (perm.id === 'notifications') {
        await permissionService.requestNotifications();
      } else if (perm.id === 'accessibility') {
        await permissionService.openAccessibilitySettings();
      }
      await fetchStatus();
    } catch (err) {
      console.warn('[PermissionsScreen] Grant error:', err);
    } finally {
      setRequestingId(null);
    }
  };

  const showSettingsAlert = (title: string, message: string) => {
    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => permissionService.openAppSettings(),
        },
      ]
    );
  };

  const handleGrantAll = async () => {
    setBatchRequesting(true);
    try {
      await permissionService.requestAllEssentials();
      await fetchStatus();
    } catch (err) {
      console.warn('[PermissionsScreen] Grant all error:', err);
    } finally {
      setBatchRequesting(false);
    }
  };

  const handleFinish = async () => {
    await permissionService.markOnboardingComplete();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const allCrucialGranted = permissions
    .filter((p) => p.isCrucial)
    .every((p) => p.status === 'granted');

  const grantedCount = permissions.filter((p) => p.status === 'granted').length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <AppHeader
        canGoBack
        title="App Permissions"
        subtitle="Manage camera, photos, focus, and notifications"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Card */}
        <View style={[styles.heroCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
          <View style={[styles.heroIconBox, { backgroundColor: colors.primaryFixed }]}>
            <MaterialIcons name="security" size={28} color={colors.primary} />
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={[styles.heroTitle, { color: colors.onSurface }]}>Privacy & Permissions</Text>
            <Text style={[styles.heroDescription, { color: colors.onSurfaceVariant }]}>
              ESpark runs locally on your device. We only request permissions necessary to solve your doubts and protect your focus sessions.
            </Text>
          </View>

          {/* Progress summary banner */}
          <View style={[styles.summaryBanner, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.onSurface }]}>Status</Text>
              <Text style={[styles.summaryValue, { color: allCrucialGranted ? '#10B981' : colors.primary }]}>
                {grantedCount} of {permissions.length} Active
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: colors.surfaceContainerHigh }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: allCrucialGranted ? '#10B981' : colors.primary,
                    width: `${(grantedCount / Math.max(1, permissions.length)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.onSurfaceVariant }]}>Checking device permissions...</Text>
          </View>
        ) : (
          <View style={styles.permissionsList}>
            {permissions.map((perm) => {
              const isGranted = perm.status === 'granted';
              const isDenied = perm.status === 'denied';
              const isBusy = requestingId === perm.id;

              return (
                <View
                  key={perm.id}
                  style={[
                    styles.permCard,
                    {
                      backgroundColor: colors.surfaceContainerLowest,
                      borderColor: isGranted ? '#10B98133' : colors.outlineVariant,
                    },
                  ]}
                >
                  <View style={styles.permHeader}>
                    <View
                      style={[
                        styles.permIconBox,
                        {
                          backgroundColor: isGranted ? '#10B9811A' : colors.surfaceContainerHigh,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={perm.icon as any}
                        size={22}
                        color={isGranted ? '#10B981' : colors.primary}
                      />
                    </View>

                    <View style={styles.permTitleContainer}>
                      <View style={styles.titleBadgeRow}>
                        <Text style={[styles.permTitle, { color: colors.onSurface }]}>{perm.title}</Text>
                        {perm.isCrucial && (
                          <View style={[styles.crucialBadge, { backgroundColor: colors.primaryFixed }]}>
                            <Text style={[styles.crucialBadgeText, { color: colors.onPrimaryFixedVariant }]}>ESSENTIAL</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.permSubtitle, { color: colors.onSurfaceVariant }]}>{perm.subtitle}</Text>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isGranted
                            ? '#10B9811A'
                            : isDenied
                            ? '#EF44441A'
                            : colors.surfaceContainerHigh,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={isGranted ? 'check-circle' : isDenied ? 'cancel' : 'help-outline'}
                        size={14}
                        color={isGranted ? '#10B981' : isDenied ? '#EF4444' : colors.onSurfaceVariant}
                      />
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: isGranted ? '#10B981' : isDenied ? '#EF4444' : colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {isGranted ? 'Granted' : isDenied ? 'Denied' : 'Pending'}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.permDescription, { color: colors.onSurfaceVariant }]}>
                    {perm.description}
                  </Text>

                  {/* Action Button */}
                  <View style={styles.actionRow}>
                    {isGranted ? (
                      <View style={styles.grantedPill}>
                        <MaterialIcons name="done" size={16} color="#10B981" />
                        <Text style={styles.grantedPillText}>Enabled & Ready</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.grantButton,
                          {
                            backgroundColor: isDenied ? colors.surfaceContainerHigh : colors.primary,
                          },
                        ]}
                        onPress={() => handleGrantSingle(perm)}
                        disabled={isBusy}
                        activeOpacity={0.8}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <MaterialIcons
                              name={isDenied ? 'settings' : 'lock-open'}
                              size={16}
                              color={isDenied ? colors.onSurface : '#FFFFFF'}
                            />
                            <Text
                              style={[
                                styles.grantButtonText,
                                { color: isDenied ? colors.onSurface : '#FFFFFF' },
                              ]}
                            >
                              {isDenied ? 'Settings' : 'Allow Access'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Master Actions */}
        <View style={styles.bottomSection}>
          {!allCrucialGranted && (
            <TouchableOpacity
              style={[styles.grantAllButton, { backgroundColor: colors.primary }]}
              onPress={handleGrantAll}
              disabled={batchRequesting}
              activeOpacity={0.8}
            >
              {batchRequesting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="verified" size={20} color="#FFFFFF" />
                  <Text style={styles.grantAllButtonText}>Grant All Essential Permissions</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.systemSettingsButton, { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest }]}
            onPress={() => permissionService.openAppSettings()}
            activeOpacity={0.8}
          >
            <MaterialIcons name="settings" size={18} color={colors.onSurfaceVariant} />
            <Text style={[styles.systemSettingsText, { color: colors.onSurfaceVariant }]}>
              Open Android Device App Settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.doneButton, { backgroundColor: colors.surfaceContainerHigh }]}
            onPress={handleFinish}
            activeOpacity={0.8}
          >
            <Text style={[styles.doneButtonText, { color: colors.onSurface }]}>Continue to ESpark</Text>
            <MaterialIcons name="arrow-forward" size={18} color={colors.onSurface} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroTextContainer: {
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 20,
    fontFamily: 'PlusJakartaSans_700Bold',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  heroDescription: {
    fontSize: 13.5,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 20,
  },
  summaryBanner: {
    borderRadius: 12,
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  loaderBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  permissionsList: {
    gap: 14,
    marginBottom: 24,
  },
  permCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  permHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  permIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permTitleContainer: {
    flex: 1,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  permTitle: {
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  crucialBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  crucialBadgeText: {
    fontSize: 9.5,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    letterSpacing: 0.4,
  },
  permSubtitle: {
    fontSize: 12,
    fontFamily: 'PlusJakartaSans_500Medium',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  permDescription: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_400Regular',
    lineHeight: 18.5,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  grantedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  grantedPillText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
    color: '#10B981',
  },
  grantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  grantButtonText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  bottomSection: {
    gap: 12,
    marginTop: 4,
  },
  grantAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  grantAllButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'PlusJakartaSans_700Bold',
  },
  systemSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  systemSettingsText: {
    fontSize: 13,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 14,
    fontFamily: 'PlusJakartaSans_600SemiBold',
  },
});
