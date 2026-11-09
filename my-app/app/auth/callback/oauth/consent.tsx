import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { MaterialIcons } from '@expo/vector-icons';
import { authService } from '../../../../services/authService';
import { supabase } from '../../../../services/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * OAuth Consent & Authorization Callback Handler
 * Handles deep links directed to: espark://auth/callback/oauth/consent
 * and web redirects to: /auth/callback/oauth/consent
 */
export default function OAuthConsentCallback() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState<string>('Completing Google authorization...');

  useEffect(() => {
    let isMounted = true;

    async function processOAuthCallback() {
      try {
        let callbackUrl: string | null = null;

        // 1. If running on Web, use window.location.href
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          callbackUrl = window.location.href;
        } else {
          // On native mobile, check initial URL or current deep link
          callbackUrl = await Linking.getInitialURL();
        }

        console.log('[OAuthConsent] Received callback URL:', callbackUrl);

        if (callbackUrl && (callbackUrl.includes('code=') || callbackUrl.includes('access_token=') || callbackUrl.includes('error='))) {
          setStatusText('Exchanging authorization credentials...');
          const result = await authService.handleOAuthCallbackUrl(callbackUrl);
          try {
            WebBrowser.dismissAuthSession();
          } catch { }
          if (isMounted) {
            if (result?.session && result?.user) {
              console.log('[OAuthConsent] Supabase session verified for user:', result.user.id);
              setStatusText('Connecting to study dashboard...');
              router.replace('/(tabs)');
            } else {
              setErrorMessage('Failed to establish a valid Supabase session from Google authorization.');
            }
          }
          return;
        }

        // 2. Check if a valid Supabase session is already established
        const { data } = await supabase.auth.getSession();
        if (data?.session && data?.session?.user) {
          if (isMounted) {
            console.log('[OAuthConsent] Existing Supabase session found for user:', data.session.user.id);
            setStatusText('Connecting to study dashboard...');
            await authService._syncUserProfile(data.session.user);
            router.replace('/(tabs)');
          }
          return;
        }

        // 3. Wait briefly for Supabase auth listener on web (detectSessionInUrl)
        const timeout = setTimeout(async () => {
          if (!isMounted) return;
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session && retryData?.session?.user) {
            console.log('[OAuthConsent] Supabase session confirmed on retry for user:', retryData.session.user.id);
            setStatusText('Connecting to study dashboard...');
            await authService._syncUserProfile(retryData.session.user);
            router.replace('/(tabs)');
          } else {
            setErrorMessage('No valid authentication tokens found in callback. Please try logging in again.');
          }
        }, 2000);

        return () => clearTimeout(timeout);
      } catch (err: any) {
        console.error('[OAuthConsent] Error processing callback:', err);
        if (isMounted) {
          setErrorMessage(err.message || 'Authentication failed. Please try again.');
        }
      }
    }

    processOAuthCallback();

    // Listen for deep link events while screen is active (Native Mobile)
    const subscription = Linking.addEventListener('url', async ({ url }) => {
      console.log('[OAuthConsent] Deep link event received:', url);
      try {
        const result = await authService.handleOAuthCallbackUrl(url);
        if (isMounted) {
          if (result?.session && result?.user) {
            console.log('[OAuthConsent] Supabase session established from deep link for user:', result.user.id);
            setStatusText('Connecting to study dashboard...');
            router.replace('/(tabs)');
          } else {
            setErrorMessage('Failed to establish a valid Supabase session from Google authorization.');
          }
        }
      } catch (e: any) {
        if (isMounted) {
          setErrorMessage(e.message || 'Failed to authenticate from link.');
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [router]);

  const handleReturnToLogin = () => {
    router.replace('/auth');
  };

  const handleContinueAsGuest = async () => {
    await authService.signInAsDemo('Guest Student', 'NEET');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {errorMessage ? (
          <>
            <View style={styles.iconCircleError}>
              <MaterialIcons name="error-outline" size={32} color="#BE543C" />
            </View>
            <Text style={styles.titleError}>Authentication Notice</Text>
            <Text style={styles.messageError}>{errorMessage}</Text>

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleReturnToLogin}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryButtonText}>Back to Sign In</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleContinueAsGuest}
                activeOpacity={0.85}
              >
                <MaterialIcons name="bolt" size={16} color="#BE543C" />
                <Text style={styles.secondaryButtonText}>⚡ Continue as Guest Student</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.title}>{statusText}</Text>
            <Text style={styles.subtitle}>Verifying Google OAuth consent & setting up dashboard...</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EFEBE6',
  },
  iconCircleError: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(190, 84, 60, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginTop: 18,
    fontSize: 17,
    fontWeight: '700',
    color: '#2D2825',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    color: '#766F6A',
    textAlign: 'center',
    lineHeight: 18,
  },
  titleError: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D2825',
    marginBottom: 8,
    textAlign: 'center',
  },
  messageError: {
    fontSize: 13.5,
    color: '#5C554F',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonGroup: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#2D2825',
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(190, 84, 60, 0.08)',
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
  },
  secondaryButtonText: {
    color: '#BE543C',
    fontWeight: '600',
    fontSize: 13.5,
  },
});
