import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useAppTheme } from '../context/ThemeContext';
import { authService, isNetworkError, classifyAuthError } from '../services/authService';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

const EXAM_OPTIONS = [
  {
    id: 'NEET',
    label: 'NEET (Undergraduate)',
    desc: 'Medical • Physics, Chemistry, Biology',
    icon: 'biotech',
    badge: 'Medical',
  },
  {
    id: 'JEE',
    label: 'JEE (Main & Advanced)',
    desc: 'Engineering • Physics, Chemistry, Maths',
    icon: 'architecture',
    badge: 'Engineering',
  },
  {
    id: 'CBSE 12th',
    label: 'CBSE Class 12th',
    desc: 'Board Curriculum & Theory Mastery',
    icon: 'menu-book',
    badge: 'Board Exam',
  },
  {
    id: 'Foundation',
    label: 'Foundation / Other',
    desc: 'General Science & Practice',
    icon: 'auto-awesome',
    badge: 'General',
  },
] as const;

export default function AuthScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ mode?: 'signin' | 'signup' }>();
  const [mode, setMode] = useState<'signin' | 'signup'>(
    params.mode === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [exam, setExam] = useState<string>('NEET');
  const [showExamDropdown, setShowExamDropdown] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const handleOfflineLogin = async () => {
    try {
      setLoading(true);
      await authService.signInOffline(email || 'student@espark.app', name, exam);
      router.replace('/(tabs)');
    } catch (e: any) {
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    try {
      setLoading(true);
      if (mode === 'signin') {
        const result = await authService.signIn(email, password);
        if (!result?.session) {
          throw new Error('Authentication succeeded but session could not be established.');
        }
        router.replace('/(tabs)');
      } else {
        if (!name.trim()) {
          setErrorMessage('Please enter your full name.');
          setLoading(false);
          return;
        }
        const res = await authService.signUp(email, password, { name, exam });
        if (res?.session) {
          router.replace('/(tabs)');
        } else {
          setInfoMessage('Account created! Please check your email to confirm, or click Quick Demo Access below.');
        }
      }
    } catch (err: any) {
      const classified = classifyAuthError(err);
      console.warn('[AuthScreen] Login error classified:', classified.code, '-', classified.message);
      setErrorMessage(classified.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setLoading(true);
      await authService.signInAsDemo('Guest Student', 'NEET');
      router.replace('/(tabs)');
    } catch (e: any) {
      setErrorMessage('Failed to initiate demo session.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    try {
      setGoogleLoading(true);
      console.log('[AuthScreen] Initiating Google Sign-In...');
      const res = await authService.signInWithGoogle();

      // On Web: browser will automatically redirect to Google accounts
      if (res?.inProgress) {
        console.log('[AuthScreen] Web OAuth redirect in progress...');
        return;
      }

      // If user cancelled or dismissed the browser popup/tab
      if (res?.cancelled) {
        console.log('[AuthScreen] Google Sign-In was cancelled or dismissed by user.');
        return;
      }

      // If session was obtained directly
      if (res?.session && res?.user) {
        console.log('[AuthScreen] Google Sign-In successful for user:', res.user.id);
        router.replace('/(tabs)');
        return;
      }

      // Fallback: check if session is now active
      const session = await authService.getSession();
      if (session?.user) {
        console.log('[AuthScreen] Active session found after Google OAuth:', session.user.id);
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('[AuthScreen] Google Sign-In error:', err);
      const classified = classifyAuthError(err);
      setErrorMessage(classified.message || 'Google Sign-In could not be completed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Status Indicators */}
          <View style={styles.topStatusRow}>
            <View style={styles.statusPill}>
              <View style={styles.pulseDot} />
              <Text style={styles.statusText}>SUPABASE AUTH</Text>
            </View>
            <View style={styles.topActionsRow}>
              <TouchableOpacity onPress={handleDemoLogin} style={styles.quickDemoPill} activeOpacity={0.8}>
                <MaterialIcons name="bolt" size={14} color={Theme.colors.primary} />
                <Text style={styles.quickDemoPillText}>Demo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace('/');
                  }
                }}
                style={styles.skipBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.skipBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Branding */}
          <View style={styles.heroSection}>
            <View style={styles.logoWrapper}>
              <Image
                source={Theme.assets.logoFull}
                style={styles.logoFullImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.brandSubtitle}>
              {mode === 'signin' ? 'Welcome back! Sign in to continue.' : 'Create your student account to begin.'}
            </Text>
          </View>

          {/* Tab Toggle */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabBtn, mode === 'signin' && styles.tabBtnActive]}
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, mode === 'signup' && styles.tabBtnActive]}
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
                setInfoMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Alert Banners */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={20} color={Theme.colors.error} style={{ marginTop: 2 }} />
              <View style={styles.errorBannerContent}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <TouchableOpacity
                  onPress={handleOfflineLogin}
                  style={styles.offlineActionBtn}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="offline-bolt" size={14} color="#BE543C" />
                  <Text style={styles.offlineActionBtnText}>
                    Continue in Offline Mode {email ? `as ${email.trim()}` : ''}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {infoMessage && (
            <View style={styles.infoBanner}>
              <MaterialIcons name="info-outline" size={18} color={Theme.colors.secondary} />
              <Text style={styles.infoText}>{infoMessage}</Text>
            </View>
          )}

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* 1-Tap Google Sign In */}
            <GoogleSignInButton
              title={mode === 'signin' ? 'Sign in with Google' : 'Sign up with Google'}
              onPress={handleGoogleSignIn}
              loading={googleLoading}
              disabled={loading || googleLoading}
            />

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh }]} />
              <Text style={[styles.dividerText, { color: colors.outline }]}>OR CONTINUE WITH EMAIL</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh }]} />
            </View>

            {mode === 'signup' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Full Name</Text>
                  <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
                    <MaterialIcons name="person" size={20} color={colors.onSurfaceVariant} />
                    <TextInput
                      style={[styles.textInput, { color: colors.onSurface }]}
                      placeholder="ENTER YOUR NAME"
                      placeholderTextColor={colors.outline}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <View style={styles.examLabelRow}>
                    <Text style={styles.inputLabel}>Target Exam</Text>
                    <Text style={styles.examSelectedHint}>Current: {exam}</Text>
                  </View>

                  {/* Dropdown Selector Trigger */}
                  <TouchableOpacity
                    style={[
                      styles.inputBox,
                      styles.dropdownTrigger,
                      showExamDropdown && styles.dropdownTriggerActive,
                    ]}
                    onPress={() => setShowExamDropdown(!showExamDropdown)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownLeft}>
                      <MaterialIcons
                        name={
                          exam.includes('NEET') ? 'biotech' :
                          exam.includes('JEE') ? 'architecture' :
                          exam.includes('CBSE') ? 'menu-book' : 'school'
                        }
                        size={20}
                        color={Theme.colors.primary}
                      />
                      <Text style={styles.dropdownSelectedText}>
                        {EXAM_OPTIONS.find((o) => o.id === exam)?.label || `${exam} Exam`}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={showExamDropdown ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                      size={22}
                      color={Theme.colors.onSurfaceVariant}
                    />
                  </TouchableOpacity>

                  {/* Expandable Dropdown Menu */}
                  {showExamDropdown && (
                    <View style={styles.dropdownMenu}>
                      {EXAM_OPTIONS.map((opt) => {
                        const isSelected = exam === opt.id;
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[
                              styles.dropdownItem,
                              isSelected && styles.dropdownItemActive,
                            ]}
                            onPress={() => {
                              setExam(opt.id);
                              setShowExamDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.dropdownItemIconBox,
                                isSelected && styles.dropdownItemIconBoxActive,
                              ]}
                            >
                              <MaterialIcons
                                name={opt.icon as any}
                                size={18}
                                color={isSelected ? Theme.colors.primary : Theme.colors.onSurfaceVariant}
                              />
                            </View>
                            <View style={styles.dropdownItemTextCol}>
                              <View style={styles.dropdownItemTitleRow}>
                                <Text
                                  style={[
                                    styles.dropdownItemTitle,
                                    isSelected && styles.dropdownItemTitleActive,
                                  ]}
                                >
                                  {opt.label}
                                </Text>
                                <View
                                  style={[
                                    styles.miniBadge,
                                    isSelected && styles.miniBadgeActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.miniBadgeText,
                                      isSelected && styles.miniBadgeTextActive,
                                    ]}
                                  >
                                    {opt.badge}
                                  </Text>
                                </View>
                              </View>
                              <Text style={styles.dropdownItemDesc}>{opt.desc}</Text>
                            </View>
                            {isSelected && (
                              <MaterialIcons
                                name="check-circle"
                                size={18}
                                color={Theme.colors.primary}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* 1-Tap Quick Select Pills */}
                  <View style={styles.examPillsRow}>
                    {['NEET', 'JEE', 'CBSE 12th'].map((pillExam) => {
                      const isSelected = pillExam.includes('CBSE')
                        ? (exam || '').toUpperCase().includes('CBSE')
                        : exam === pillExam;
                      return (
                        <TouchableOpacity
                          key={pillExam}
                          style={[styles.examPill, isSelected && styles.examPillActive]}
                          onPress={() => {
                            setExam(pillExam);
                            setShowExamDropdown(false);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.examPillText,
                              isSelected && styles.examPillTextActive,
                            ]}
                          >
                            {pillExam === 'NEET'
                              ? '🩺 NEET'
                              : pillExam === 'JEE'
                              ? '📐 JEE'
                              : '📚 CBSE 12th'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Email Address</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
                <MaterialIcons name="email" size={20} color={colors.onSurfaceVariant} />
                <TextInput
                  style={[styles.textInput, { color: colors.onSurface }]}
                  placeholder="student@example.com"
                  placeholderTextColor={colors.outline}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.onSurface }]}>Password</Text>
              <View style={[styles.inputBox, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
                <MaterialIcons name="lock" size={20} color={colors.onSurfaceVariant} />
                <TextInput
                  style={[styles.textInput, { color: colors.onSurface }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={20}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.inverseSurface }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <ActivityIndicator color={colors.inverseOnSurface} />
              ) : (
                <>
                  <Text style={[styles.primaryButtonText, { color: colors.inverseOnSurface }]}>
                    {mode === 'signin' ? 'Sign In with Supabase' : 'Create Account'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={18} color={colors.inverseOnSurface} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh }]} />
              <Text style={[styles.dividerText, { color: colors.outline }]}>OR FAST GUEST ACCESS</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceContainerHigh }]} />
            </View>

            {/* Demo Login Button */}
            <TouchableOpacity
              style={[
                styles.demoButton,
                {
                  backgroundColor: colors.primaryFixed,
                  borderColor: 'rgba(190, 84, 60, 0.25)',
                },
              ]}
              onPress={handleDemoLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <MaterialIcons name="bolt" size={20} color={colors.primary} />
              <Text style={[styles.demoButtonText, { color: colors.primary }]}>⚡ Continue as Demo Student (Guest Mode)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 16,
    flexGrow: 1,
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radii.full,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.secondary,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.secondary,
    letterSpacing: 0.6,
  },
  topActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickDemoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Theme.colors.primaryFixed,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radii.full,
  },
  quickDemoPillText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  skipBtn: {
    padding: 6,
  },
  skipBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  logoWrapper: {
    width: 190,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoFullImage: {
    width: '100%',
    height: '100%',
  },
  brandSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 4,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Theme.colors.surfaceContainerLow,
    borderRadius: Theme.radii.full,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    height: 40,
    borderRadius: Theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    ...Theme.shadows.subtle,
  },
  tabText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
  },
  tabTextActive: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.onSurface,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(190, 84, 60, 0.12)',
    padding: 12,
    borderRadius: Theme.radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.error,
  },
  errorBannerContent: {
    flex: 1,
    gap: 6,
  },
  errorText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.error,
    lineHeight: 16,
  },
  offlineActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE9E4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Theme.radii.full,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  offlineActionBtnText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 11,
    color: '#BE543C',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(52, 103, 95, 0.12)',
    padding: 12,
    borderRadius: Theme.radii.lg,
    borderLeftWidth: 3,
    borderLeftColor: Theme.colors.secondary,
  },
  infoText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.secondary,
    lineHeight: 16,
  },
  formSection: {
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 12,
    color: Theme.colors.onSurface,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderHairline,
    borderRadius: Theme.radii.xl,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
    ...Theme.shadows.subtle,
  },
  textInput: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  primaryButton: {
    height: 52,
    backgroundColor: Theme.colors.inverseSurface,
    borderRadius: Theme.radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    ...Theme.shadows.card,
  },
  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 15,
    color: Theme.colors.inverseOnSurface,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Theme.colors.surfaceContainerHigh,
  },
  dividerText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.outline,
    letterSpacing: 0.8,
  },
  demoButton: {
    height: 50,
    backgroundColor: Theme.colors.primaryFixed,
    borderRadius: Theme.radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(190, 84, 60, 0.25)',
  },
  demoButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.primary,
  },
  examLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  examSelectedHint: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 11,
    color: Theme.colors.primary,
  },
  dropdownTrigger: {
    justifyContent: 'space-between',
  },
  dropdownTriggerActive: {
    borderColor: Theme.colors.primary,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dropdownSelectedText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  dropdownMenu: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
    borderRadius: Theme.radii.xl,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderHairline,
    padding: 6,
    gap: 4,
    ...Theme.shadows.card,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: Theme.radii.lg,
    gap: 10,
  },
  dropdownItemActive: {
    backgroundColor: Theme.colors.primaryFixed,
  },
  dropdownItemIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemIconBoxActive: {
    backgroundColor: Theme.colors.surfaceContainerLowest,
  },
  dropdownItemTextCol: {
    flex: 1,
  },
  dropdownItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dropdownItemTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 13,
    color: Theme.colors.onSurface,
  },
  dropdownItemTitleActive: {
    color: Theme.colors.primary,
  },
  miniBadge: {
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Theme.radii.full,
  },
  miniBadgeActive: {
    backgroundColor: 'rgba(190, 84, 60, 0.15)',
  },
  miniBadgeText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 9,
    color: Theme.colors.onSurfaceVariant,
  },
  miniBadgeTextActive: {
    color: Theme.colors.primary,
  },
  dropdownItemDesc: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 11,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  examPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  examPill: {
    flex: 1,
    height: 36,
    borderRadius: Theme.radii.full,
    backgroundColor: Theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
  },
  examPillActive: {
    backgroundColor: Theme.colors.primaryFixed,
    borderColor: Theme.colors.primary,
  },
  examPillText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  examPillTextActive: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.primary,
  },
});
