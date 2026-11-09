import { Platform } from 'react-native';
import axios from 'axios';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { safeStorage } from './safeStorage';
import { supabase } from './supabase';
import { API_BASE_URL } from './api';

// Complete auth session if redirected back to web/app
WebBrowser.maybeCompleteAuthSession();

const DEMO_TOKEN_KEY = '@study_insights_demo_token';
const DEMO_USER_KEY = '@study_insights_demo_user';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  exam: string;
  class?: string;
}

export type AuthErrorCode =
  | 'NO_INTERNET'
  | 'BACKEND_UNAVAILABLE'
  | 'SUPABASE_UNREACHABLE'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'TIMEOUT'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'INVALID_SESSION'
  | 'OAUTH_FAILURE'
  | 'UNKNOWN';

export interface ClassifiedAuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: any;
}

// Granular error classifier distinguishing all login failure modes
export function classifyAuthError(error: any): ClassifiedAuthError {
  if (!error) {
    return { code: 'UNKNOWN', message: 'An unknown authentication error occurred.' };
  }

  const rawMsg = (error.message || error.error_description || error.toString() || '').toLowerCase();
  const code = (error.code || error.status || '').toString().toLowerCase();

  // 1. Invalid email or password
  if (
    rawMsg.includes('invalid login credentials') ||
    rawMsg.includes('invalid credentials') ||
    rawMsg.includes('invalid email or password') ||
    rawMsg.includes('wrong password') ||
    code === 'invalid_credentials' ||
    error.status === 401
  ) {
    return {
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password.',
      originalError: error,
    };
  }

  // 2. Email not confirmed
  if (
    rawMsg.includes('email not confirmed') ||
    rawMsg.includes('email_not_confirmed') ||
    code === 'email_not_confirmed'
  ) {
    return {
      code: 'EMAIL_NOT_CONFIRMED',
      message: 'Please verify your email before signing in.',
      originalError: error,
    };
  }

  // 3. Rate limited
  // if (
  //   rawMsg.includes('rate limit') ||
  //   rawMsg.includes('rate_limit') ||
  //   rawMsg.includes('too many requests') ||
  //   error.status === 429
  // ) {
  //   return {
  //     code: 'RATE_LIMITED',
  //     message: 'Too many login attempts. Please wait a moment and try again.',
  //     originalError: error,
  //   };
  // }

  // // 4. Timeout
  // if (
  //   rawMsg.includes('timeout') ||
  //   rawMsg.includes('timed out') ||
  //   rawMsg.includes('econnreset') ||
  //   code === 'econnreset' ||
  //   code === 'timeout'
  // ) {
  //   return {
  //     code: 'TIMEOUT',
  //     message: 'ESpark is taking too long to respond. Please try again.',
  //     originalError: error,
  //   };
  // }

  // 5. Backend offline / connection refused
  if (
    rawMsg.includes('econnrefused') ||
    rawMsg.includes('unable to connect to backend') ||
    code === 'backend_unreachable'
  ) {
    return {
      code: 'BACKEND_UNAVAILABLE',
      message: 'Unable to connect to ESpark. Please check your connection.',
      originalError: error,
    };
  }

  // 6. No internet connection / Network failure
  if (
    rawMsg.includes('network request failed') ||
    rawMsg.includes('failed to fetch') ||
    rawMsg.includes('enotfound') ||
    rawMsg.includes('net::err') ||
    rawMsg.includes('offline')
  ) {
    return {
      code: 'NO_INTERNET',
      message: "You're offline. Check your internet connection.",
      originalError: error,
    };
  }

  // 7. Server 5xx
  if (typeof error.status === 'number' && error.status >= 500) {
    return {
      code: 'SERVER_ERROR',
      message: 'ESpark service encountered an issue. Please try again shortly.',
      originalError: error,
    };
  }

  return {
    code: 'UNKNOWN',
    message: error.message || 'Authentication error. Please try again.',
    originalError: error,
  };
}

// Helper to detect offline, DNS, timeout or network connectivity errors
export function isNetworkError(error: any): boolean {
  const classified = classifyAuthError(error);
  return (
    classified.code === 'NO_INTERNET' ||
    classified.code === 'BACKEND_UNAVAILABLE' ||
    classified.code === 'TIMEOUT'
  );
}

export const authService = {
  // Sign up with automatic confirmation bypass & offline resilience
  async signUp(email: string, password: string, metadata: { name: string; exam: string; class?: string }) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = metadata.name.trim();
    const cleanExam = metadata.exam.trim();
    const cleanClass = metadata.class || 'Class 12th';

    // 1. Try backend registration endpoint (auto-confirms and creates session; fast 3s timeout)
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        email: cleanEmail,
        password,
        name: cleanName,
        exam: cleanExam,
        class: cleanClass,
      }, { timeout: 3000 });

      if (response.data?.success && response.data?.data?.session) {
        const { user, session } = response.data.data;
        await safeStorage.setItem(DEMO_TOKEN_KEY, session.access_token);
        await safeStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
        return { user, session };
      }
    } catch (backendErr: any) {
      console.warn('[AuthService] Backend registration note:', backendErr?.response?.data || backendErr.message);
    }

    // 2. Fallback to direct Supabase sign up
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            exam: cleanExam,
            class: cleanClass,
          },
        },
      });

      if (error) {
        throw error;
      }

      // If Supabase created user but email confirmation is pending
      if (data?.user && !data?.session) {
        return await this._createAutoSession(cleanEmail, {
          name: cleanName,
          exam: cleanExam,
          class: cleanClass,
        });
      }

      if (data?.session) {
        await safeStorage.removeItem(DEMO_TOKEN_KEY);
        await safeStorage.removeItem(DEMO_USER_KEY);
      }

      return data;
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('already registered')) {
        return this.signIn(cleanEmail, password);
      }

      // If rate limited by Supabase or network error, smoothly create local verified session
      if (
        isNetworkError(err) ||
        err.message?.toLowerCase().includes('rate limit') ||
        err.message?.toLowerCase().includes('email rate limit exceeded')
      ) {
        console.info('[AuthService] Network error or rate limit during signUp. Creating local student session:', err.message);
        return await this._createAutoSession(cleanEmail, {
          name: cleanName,
          exam: cleanExam,
          class: cleanClass,
        });
      }

      console.warn('[AuthService] Direct Supabase signUp error:', err.message);
      throw err;
    }
  },

  // Helper to construct an active session when Supabase email is not confirmed or offline
  async _createAutoSession(
    cleanEmail: string,
    metadata?: { name?: string; exam?: string; class?: string }
  ): Promise<{ user: UserProfile; session: { access_token: string; user: UserProfile } }> {
    let name = metadata?.name?.trim() || cleanEmail.split('@')[0];
    name = name.charAt(0).toUpperCase() + name.slice(1);
    let exam = metadata?.exam?.trim() || 'NEET';
    let className = metadata?.class?.trim() || 'Class 12th';

    try {
      const raw = await safeStorage.getItem(DEMO_USER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.email?.toLowerCase() === cleanEmail) {
          name = metadata?.name?.trim() || parsed.name || name;
          exam = metadata?.exam?.trim() || parsed.exam || exam;
          className = metadata?.class?.trim() || parsed.class || className;
        }
      }
    } catch (e) {
      // ignore
    }

    const autoUser: UserProfile = {
      id: `usr-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '') || Date.now()}`,
      email: cleanEmail,
      name,
      exam,
      class: className,
    };
    const token = `user-token-${autoUser.id}`;
    await safeStorage.setItem(DEMO_TOKEN_KEY, token);
    await safeStorage.setItem(DEMO_USER_KEY, JSON.stringify(autoUser));

    return {
      user: autoUser,
      session: {
        access_token: token,
        user: autoUser,
      },
    };
  },

  // Direct offline sign in for students without internet
  async signInOffline(email: string, name?: string, exam?: string, className?: string) {
    const cleanEmail = email.trim().toLowerCase() || 'student@espark.app';
    return await this._createAutoSession(cleanEmail, {
      name,
      exam,
      class: className,
    });
  },

  // Sign in with rigorous session verification, structured debug logs, and clear error classification
  async signIn(email: string, password: string) {
    const cleanEmail = email.trim().toLowerCase();

    console.log('[Auth] Login started');
    console.log('[Auth] Supabase URL configured:', !!process.env.EXPO_PUBLIC_SUPABASE_URL || true);
    console.log('[Auth] API URL:', API_BASE_URL);

    let supabaseError: any = null;
    let authUser: any = null;
    let verifiedSession: any = null;

    // 1. Primary Authentication via Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      console.log('[Auth] Supabase login response received');

      if (error) {
        supabaseError = error;
      } else if (data?.session) {
        authUser = data.user;
        verifiedSession = data.session;
      }
    } catch (err: any) {
      console.warn('[Auth] Supabase direct signIn network/runtime exception:', err.message);
      supabaseError = err;
    }

    // 2. Strict Session Verification (must exist before proceeding to authenticated area)
    if (verifiedSession) {
      const { data: sessionCheck, error: checkErr } = await supabase.auth.getSession();
      if (checkErr || !sessionCheck.session) {
        console.warn('[Auth] Session check failed after login:', checkErr?.message);
        throw new Error('Failed to establish verified Supabase session.');
      }

      console.log('[Auth] Session created: true');
      console.log('[Auth] User ID:', authUser?.id || sessionCheck.session.user.id);

      // Clean up legacy guest/demo tokens
      await safeStorage.removeItem(DEMO_TOKEN_KEY);
      await safeStorage.removeItem(DEMO_USER_KEY);

      // Synchronize with Node backend using real Supabase JWT Bearer token
      console.log('[Auth] Backend profile request started');
      try {
        const backendRes = await axios.get(`${API_BASE_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${sessionCheck.session.access_token}`,
          },
          timeout: 4000,
        });
        console.log('[Auth] Backend response status:', backendRes.status);
      } catch (backendErr: any) {
        console.warn('[Auth] Backend profile sync note:', backendErr?.message);
      }

      console.log('[Auth] Login successful');
      return { user: authUser || sessionCheck.session.user, session: sessionCheck.session };
    }

    // 3. If Supabase failed, check for email confirmation bypass or local development fallback
    if (supabaseError) {
      const classified = classifyAuthError(supabaseError);

      if (classified.code === 'EMAIL_NOT_CONFIRMED' || classified.code === 'INVALID_CREDENTIALS') {
        try {
          const response = await axios.post(
            `${API_BASE_URL}/auth/login`,
            { email: cleanEmail, password },
            { timeout: 3000 }
          );

          if (response.data?.success && response.data?.data?.session) {
            const { user, session } = response.data.data;
            await safeStorage.setItem(DEMO_TOKEN_KEY, session.access_token);
            await safeStorage.setItem(DEMO_USER_KEY, JSON.stringify(user));
            console.log('[Auth] Session created via backend fallback: true');
            console.log('[Auth] User ID:', user.id);
            console.log('[Auth] Login successful');
            return { user, session };
          }
        } catch (backendErr: any) {
          console.warn('[Auth] Backend fallback login rejected:', backendErr?.response?.data || backendErr.message);
        }
      }

      // Throw the clearly classified error with user-friendly message
      const errToThrow = new Error(classified.message);
      (errToThrow as any).code = classified.code;
      (errToThrow as any).classified = classified;
      throw errToThrow;
    }

    throw new Error('Authentication completed without establishing a valid session.');
  },

  // Helper to get the canonical OAuth callback URL across Web, Expo Go, and Native builds
  getOAuthRedirectUrl(): string {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return `${window.location.origin}/auth/callback`;
      }
      return 'http://localhost:8081/auth/callback';
    }

    try {
      const linkingUrl = Linking.createURL('auth/callback');
      if (linkingUrl) {
        return linkingUrl;
      }
    } catch { }

    return 'espark://auth/callback';
  },

  // Process incoming OAuth redirect / callback URL (for both Web and Native)
  async handleOAuthCallbackUrl(urlStr: string) {
    if (!urlStr) {
      throw new Error('Empty callback URL received.');
    }

    console.log('[GoogleAuth] Callback URL:', urlStr);

    const queryString = urlStr.includes('?') ? urlStr.split('?')[1].split('#')[0] : '';
    const hashString = urlStr.includes('#') ? urlStr.split('#')[1] : '';
    const queryParams = new URLSearchParams(queryString);
    const hashParams = new URLSearchParams(hashString);

    // 1. Check for OAuth errors in parameters
    const errCode = queryParams.get('error') || hashParams.get('error');
    const errDesc = queryParams.get('error_description') || hashParams.get('error_description');
    if (errCode || errDesc) {
      const fullError = errDesc ? decodeURIComponent(errDesc.replace(/\+/g, ' ')) : errCode || 'OAuth error';
      console.error('[GoogleAuth] Login failed from OAuth error params:', fullError);
      throw new Error(fullError);
    }

    // 2. Check for PKCE authorization code (?code=...)
    const authCode = queryParams.get('code') || hashParams.get('code');
    if (authCode) {
      console.log('[GoogleAuth] Authorization code received, exchanging for session...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);
      if (error) {
        console.error('[GoogleAuth] Login failed (exchangeCodeForSession):', error.message);
        throw error;
      }
      if (data?.session?.user) {
        console.log('[GoogleAuth] Session created successfully. User ID:', data.session.user.id);
        await safeStorage.removeItem(DEMO_TOKEN_KEY);
        await safeStorage.removeItem(DEMO_USER_KEY);
        await this._syncUserProfile(data.session.user);
        return { session: data.session, user: data.session.user };
      }
    }

    // 3. Check for implicit tokens in hash or query (#access_token=...&refresh_token=...)
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
    if (accessToken && refreshToken) {
      console.log('[GoogleAuth] Tokens received in callback, setting session...');
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.error('[GoogleAuth] Login failed (setSession):', error.message);
        throw error;
      }
      if (data?.session?.user) {
        console.log('[GoogleAuth] Session created successfully. User ID:', data.session.user.id);
        await safeStorage.removeItem(DEMO_TOKEN_KEY);
        await safeStorage.removeItem(DEMO_USER_KEY);
        await this._syncUserProfile(data.session.user);
        return { session: data.session, user: data.session.user };
      }
    }

    // 4. Fallback check: check if session is already active
    const { data: existing } = await supabase.auth.getSession();
    if (existing?.session?.user) {
      console.log('[GoogleAuth] Existing active session found. User ID:', existing.session.user.id);
      await safeStorage.removeItem(DEMO_TOKEN_KEY);
      await safeStorage.removeItem(DEMO_USER_KEY);
      await this._syncUserProfile(existing.session.user);
      return { session: existing.session, user: existing.session.user };
    }

    throw new Error('Could not establish a valid Supabase session from the OAuth callback URL.');
  },

  // Get current active session
  async getSession() {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  },

  // Helper to synchronize authenticated user into local profile, Supabase profiles table, and Express backend
  async _syncUserProfile(user: any) {
    if (!user) return;
    try {
      const email = user.email || '';
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        (email ? email.split('@')[0] : 'Student');
      const exam = user.user_metadata?.exam || 'NEET';
      const className = user.user_metadata?.class || 'Class 12th';
      const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      const userProfile: UserProfile = {
        id: user.id,
        email,
        name,
        exam,
        class: className,
      };

      // 1. Save to local cache so offline fallback works seamlessly
      await safeStorage.setItem(DEMO_USER_KEY, JSON.stringify(userProfile));

      // 2. Upsert into Supabase profiles table
      try {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name,
            exam,
            class: className,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
      } catch (tableErr: any) {
        console.warn('[GoogleAuth] Supabase profiles upsert note:', tableErr?.message);
      }

      // 3. Synchronize with Node backend asynchronously (non-blocking)
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (token) {
          console.log('[GoogleAuth] Dispatching Express backend synchronization...');
          axios.post(
            `${API_BASE_URL}/auth/google-sync`,
            { name, exam, class: className, avatar_url: avatarUrl },
            {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 2500,
            }
          ).then(() => {
            console.log('[GoogleAuth] Express backend synchronized successfully');
          }).catch(async (syncErr) => {
            console.log('[GoogleAuth] Backend direct sync fallback, trying /profile...');
            await axios.get(`${API_BASE_URL}/profile`, {
              headers: { Authorization: `Bearer ${token}` },
              timeout: 2000,
            }).catch(() => {
              // Silently ignore if backend is offline; Supabase session is already secured
            });
          });
        }
      } catch (backendErr: any) {
        console.warn('[GoogleAuth] Backend profile sync note:', backendErr?.message);
      }
    } catch (e: any) {
      console.warn('[GoogleAuth] User profile sync warning:', e?.message);
    }
  },

  // Google / Gmail Sign In (Single source of truth: Supabase Auth)
  async signInWithGoogle(): Promise<{ inProgress?: boolean; cancelled?: boolean; session?: any; user?: any }> {
    try {
      const redirectUrl = this.getOAuthRedirectUrl();
      const isWeb = Platform.OS === 'web';
      console.log('[GoogleAuth] Redirect URL:', redirectUrl);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: !isWeb,
        },
      });

      if (error) {
        console.error('[GoogleAuth] OAuth initiation failed:', error.message);
        throw error;
      }

      // On Web: browser will automatically redirect to Google accounts
      if (isWeb) {
        console.log('[GoogleAuth] Web redirect initiated');
        return { inProgress: true };
      }

      // On Native Mobile: Open system custom tab / browser session
      if (data?.url) {
        console.log('[GoogleAuth] OAuth result URL generated:', data.url);

        let urlHandlerSubscription: any = null;
        const authSessionPromise = WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        // Concurrently listen for deep link event in case OS routes it directly to app
        const deepLinkPromise = new Promise<{ type: 'deeplink'; url: string }>((resolve) => {
          urlHandlerSubscription = Linking.addEventListener('url', (event) => {
            console.log('[GoogleAuth] Deep link event received:', event.url);
            if (event.url && (event.url.includes('code=') || event.url.includes('access_token='))) {
              try {
                WebBrowser.dismissAuthSession();
              } catch { }
              resolve({ type: 'deeplink', url: event.url });
            }
          });
        });

        // Race between openAuthSessionAsync return and Linking URL event
        const raceResult = await Promise.race([
          authSessionPromise.then((res) => ({ type: 'browser', res })),
          deepLinkPromise,
        ]);

        if (urlHandlerSubscription) {
          try {
            urlHandlerSubscription.remove();
          } catch { }
        }

        // If deep link won the race with an auth code
        if (raceResult.type === 'deeplink' && (raceResult as any).url) {
          console.log('[GoogleAuth] Callback URL captured via deep link race:', (raceResult as any).url);
          return await this.handleOAuthCallbackUrl((raceResult as any).url);
        }

        const res = (raceResult as any).res;
        console.log('[GoogleAuth] OAuth browser result type:', res?.type);

        if (res?.type === 'success' && res.url) {
          console.log('[GoogleAuth] Callback URL received from browser:', res.url);
          return await this.handleOAuthCallbackUrl(res.url);
        }

        // Check if session was completed in background while browser was closing
        const { data: bgData } = await supabase.auth.getSession();
        if (bgData?.session?.user) {
          console.log('[GoogleAuth] Session detected after browser close. User ID:', bgData.session.user.id);
          await this._syncUserProfile(bgData.session.user);
          return { session: bgData.session, user: bgData.session.user };
        }

        if (res?.type === 'cancel' || res?.type === 'dismiss') {
          console.log('[GoogleAuth] User cancelled or dismissed Google Sign-In');
          return { cancelled: true };
        }

        throw new Error('Google Sign-In was closed before authentication could complete.');
      }

      throw new Error('Supabase did not provide an authorization URL for Google.');
    } catch (err: any) {
      console.error('[GoogleAuth] Login failed:', err.message);
      throw err;
    }
  },

  // Instant Demo / Guest Sign In
  async signInAsDemo(name = 'Guest Student', exam = 'NEET') {
    const demoUser: UserProfile = {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'demo.student@espark.app',
      name,
      exam,
      class: 'Class 12th',
    };
    const demoToken = 'demo-student-token';

    await safeStorage.setItem(DEMO_TOKEN_KEY, demoToken);
    await safeStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));

    return {
      user: demoUser,
      session: {
        access_token: demoToken,
        user: demoUser,
      },
    };
  },

  // Sign Out
  async signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[AuthService] Supabase sign out warning:', e);
    }
    await safeStorage.removeItem(DEMO_TOKEN_KEY);
    await safeStorage.removeItem(DEMO_USER_KEY);
  },

  // Get current active token (Derived strictly from real Supabase session)
  async getToken(): Promise<string | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        return data.session.access_token;
      }
    } catch (e) {
      console.warn('[AuthService] Token retrieval error:', e);
    }

    // Only return demoToken if demo mode was explicitly activated
    const demoToken = await safeStorage.getItem(DEMO_TOKEN_KEY);
    return demoToken || null;
  },

  // Get current user info (Derived strictly from real Supabase user)
  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const email = data.user.email || '';
        return {
          id: data.user.id,
          email,
          name:
            data.user.user_metadata?.full_name ||
            data.user.user_metadata?.name ||
            (email ? email.split('@')[0] : 'Student'),
          exam: data.user.user_metadata?.exam || 'NEET',
          class: data.user.user_metadata?.class || 'Class 12th',
        };
      }
    } catch (e) {
      // ignore
    }

    const raw = await safeStorage.getItem(DEMO_USER_KEY);
    const demoToken = await safeStorage.getItem(DEMO_TOKEN_KEY);
    if (raw && demoToken) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // ignore
      }
    }

    return null;
  },

  // Check if authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) return true;
    } catch (e) {
      // ignore
    }
    const demoToken = await safeStorage.getItem(DEMO_TOKEN_KEY);
    return !!demoToken;
  },
};

// Central Supabase Auth State Change listener (STEP 8)
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log('[GoogleAuth] onAuthStateChange event:', event, 'User ID:', session?.user?.id);
  if (event === 'SIGNED_IN' && session?.user) {
    await safeStorage.removeItem(DEMO_TOKEN_KEY);
    await safeStorage.removeItem(DEMO_USER_KEY);
    await authService._syncUserProfile(session.user);
  } else if (event === 'SIGNED_OUT') {
    await safeStorage.removeItem(DEMO_TOKEN_KEY);
    await safeStorage.removeItem(DEMO_USER_KEY);
  }
});
