import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';
import { useAppTheme } from '../context/ThemeContext';
import { authService, UserProfile } from '../services/authService';
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors, isDark } = useAppTheme();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      const res = await authService.signInWithGoogle();
      if (res?.inProgress) return;
      if (res?.cancelled) return;
      if (res?.session && res?.user) {
        router.replace('/(tabs)');
        return;
      }
      const session = await authService.getSession();
      if (session?.user) {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.warn('[Onboarding] Google Sign-In error:', err);
      router.push({ pathname: '/auth' as any, params: { mode: 'signin' } });
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        const authed = await authService.isAuthenticated();
        if (authed) {
          const user = await authService.getCurrentUser();
          setCurrentUser(user);
        }
      } catch (e) {
        // ignore
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAuth();
  }, []);

  const handleGetStarted = () => {
    router.push({ pathname: '/auth' as any, params: { mode: 'signup' } });
  };

  const handleSignIn = () => {
    router.push({ pathname: '/auth' as any, params: { mode: 'signin' } });
  };

  const handleGoToTabs = () => {
    router.replace('/(tabs)');
  };

  const handleInstantDemo = async () => {
    try {
      await authService.signInAsDemo('Guest Student', 'NEET');
      router.replace('/(tabs)');
    } catch (e) {
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Status Indicators */}
        <View style={styles.topStatusRow}>
          <View style={[styles.statusPill, { backgroundColor: colors.surfaceContainerLow }]}>
            <View style={[styles.pulseDot, { backgroundColor: colors.secondary }]} />
            <Text style={[styles.statusText, { color: colors.secondary }]}>CALM FOCUS V2.4</Text>
          </View>
          <View style={styles.privacyPill}>
            <MaterialIcons name="verified-user" size={16} color={colors.onSurfaceVariant} />
            <Text style={[styles.privacyText, { color: colors.onSurfaceVariant }]}>Private & Local</Text>
          </View>
        </View>

        {/* Hero & Brand Cluster */}
        <View style={styles.heroSection}>
          <View style={styles.logoWrapper}>
            <Image
              source={Theme.assets.logoFull}
              style={styles.logoFullImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.brandTagline, { color: colors.onSurfaceVariant }]}>
            Understand your mistakes.{'\n'}Master your potential.
          </Text>
        </View>

        {/* Value Propositions Bento */}
        <View style={styles.bentoSection}>
          {/* Card 1 */}
          <View style={[styles.featureCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.primaryFixed }]}>
              <MaterialIcons name="insights" size={20} color={colors.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.onSurface }]}>Personalized Pattern Analysis</Text>
              <Text style={[styles.featureSubtitle, { color: colors.onSurfaceVariant }]}>Uncover why errors recur across topics</Text>
            </View>
            <MaterialIcons name="check-circle" size={18} color={colors.secondary} />
          </View>

          {/* Card 2 */}
          <View style={[styles.featureCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.secondaryContainer }]}>
              <MaterialIcons name="adjust" size={20} color={colors.secondary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.onSurface }]}>Targeted Practice</Text>
              <Text style={[styles.featureSubtitle, { color: colors.onSurfaceVariant }]}>Micro-drills tailored to high-yield gaps</Text>
            </View>
            <MaterialIcons name="check-circle" size={18} color={colors.secondary} />
          </View>

          {/* Card 3 */}
          <View style={[styles.featureCard, { backgroundColor: colors.surfaceContainerLowest, borderColor: colors.outlineVariant }]}>
            <View style={[styles.featureIconBox, { backgroundColor: colors.surfaceContainerHighest }]}>
              <MaterialIcons name="self-improvement" size={20} color={colors.tertiary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={[styles.featureTitle, { color: colors.onSurface }]}>Calm Focus Sessions</Text>
              <Text style={[styles.featureSubtitle, { color: colors.onSurfaceVariant }]}>Anxiety-reducing pacing & tactile feel</Text>
            </View>
            <MaterialIcons name="check-circle" size={18} color={colors.secondary} />
          </View>
        </View>

        {/* Bottom CTAs */}
        <View style={styles.footerSection}>
          {currentUser ? (
            <>
              <View style={[styles.userBanner, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant }]}>
                <MaterialIcons name="account-circle" size={20} color={colors.primary} />
                <Text style={[styles.userBannerText, { color: colors.onSurfaceVariant }]} numberOfLines={1}>
                  Logged in as <Text style={[styles.userBannerBold, { color: colors.onSurface }]}>{currentUser.name}</Text> ({currentUser.exam})
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: isDark ? colors.primary : colors.inverseSurface }]}
                onPress={handleGoToTabs}
                activeOpacity={0.88}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? colors.onPrimary : colors.inverseOnSurface }]}>Continue to Dashboard</Text>
                <MaterialIcons name="arrow-forward" size={20} color={isDark ? colors.onPrimary : colors.inverseOnSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSignIn}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.onSurfaceVariant }]}>
                  Switch Account or{' '}
                  <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In with Supabase</Text>
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* 1-Tap Google Sign In */}
              <GoogleSignInButton
                title="Continue with Google"
                onPress={handleGoogleSignIn}
                loading={googleLoading}
                disabled={googleLoading}
              />

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: isDark ? colors.primary : colors.inverseSurface }]}
                onPress={handleGetStarted}
                activeOpacity={0.88}
              >
                <Text style={[styles.primaryButtonText, { color: isDark ? colors.onPrimary : colors.inverseOnSurface }]}>Get Started / Sign Up</Text>
                <MaterialIcons name="arrow-forward" size={20} color={isDark ? colors.onPrimary : colors.inverseOnSurface} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSignIn}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.onSurfaceVariant }]}>
                  Already have an account?{' '}
                  <Text style={[styles.signInLink, { color: colors.primary }]}>Sign In</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoButton, { backgroundColor: colors.primaryFixed, borderColor: colors.primary }]}
                onPress={handleInstantDemo}
                activeOpacity={0.85}
              >
                <MaterialIcons name="bolt" size={18} color={colors.primary} />
                <Text style={[styles.demoButtonText, { color: colors.onPrimaryFixedVariant || colors.primary }]}>⚡ Instant Demo Access (No Login Needed)</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
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
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  topStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Theme.radii.full,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Theme.colors.secondary,
  },
  statusText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    color: Theme.colors.secondary,
    letterSpacing: 0.8,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  privacyText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  logoWrapper: {
    width: 210,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoFullImage: {
    width: '100%',
    height: '100%',
  },
  brandTagline: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 16,
    color: Theme.colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 24,
  },
  bentoSection: {
    gap: 10,
    marginVertical: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.surfaceContainerLowest,
    padding: 14,
    borderRadius: Theme.radii.xl,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    gap: 12,
    ...Theme.shadows.subtle,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    color: Theme.colors.onSurface,
  },
  featureSubtitle: {
    fontFamily: 'PlusJakartaSans_400Regular',
    fontSize: 12,
    color: Theme.colors.onSurfaceVariant,
    marginTop: 2,
  },
  footerSection: {
    gap: 12,
    marginTop: 10,
  },
  primaryButton: {
    height: 52,
    backgroundColor: Theme.colors.inverseSurface,
    borderRadius: Theme.radii.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...Theme.shadows.card,
  },
  primaryButtonText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: Theme.colors.inverseOnSurface,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
  },
  signInLink: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.primary,
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Theme.colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Theme.radii.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderHairline,
    marginBottom: 4,
  },
  userBannerText: {
    flex: 1,
    fontFamily: 'PlusJakartaSans_500Medium',
    fontSize: 13,
    color: Theme.colors.onSurfaceVariant,
  },
  userBannerBold: {
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Theme.colors.onSurface,
  },
  demoButton: {
    height: 48,
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
    fontSize: 13,
    color: Theme.colors.primary,
  },
});
