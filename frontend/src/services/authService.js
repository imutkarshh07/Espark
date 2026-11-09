import { supabase } from './supabaseClient';
import api from './api';

export const authService = {
  async signUp(email, password, name = '') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Google OAuth Sign In
  async signInWithGoogle() {
    const redirectUrl = `${window.location.origin}/auth/callback`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (msg.includes('not enabled') || msg.includes('unsupported provider')) {
        throw new Error('Google Sign-In is not enabled yet in your Supabase project. Enable it in Supabase Dashboard -> Authentication -> Providers -> Google.');
      }
      throw error;
    }
    return data;
  },

  // Process incoming callback tokens on web
  async handleOAuthCallback() {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const queryParams = new URLSearchParams(window.location.search);

    const error = queryParams.get('error') || hashParams.get('error');
    const errorDescription = queryParams.get('error_description') || hashParams.get('error_description');

    if (error || errorDescription) {
      throw new Error(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : error);
    }

    const code = queryParams.get('code') || hashParams.get('code');
    if (code) {
      const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
      if (codeErr) throw codeErr;
      return data.session;
    }

    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error: tokenErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (tokenErr) throw tokenErr;
      return data.session;
    }

    const { data } = await supabase.auth.getSession();
    return data?.session;
  },

  // Instant Demo Student Sign In
  async signInAsDemo() {
    localStorage.setItem('demo_student_active', 'true');
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        email: 'demo.student@espark.app',
        user_metadata: { name: 'Guest Student', exam: 'NEET' },
      },
    };
  },

  async signOut() {
    localStorage.removeItem('demo_student_active');
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession() {
    const isDemo = localStorage.getItem('demo_student_active') === 'true';
    if (isDemo) {
      return {
        access_token: 'demo-student-token',
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'demo.student@espark.app',
          user_metadata: { name: 'Guest Student', exam: 'NEET' },
        },
      };
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getProfile() {
    try {
      const res = await api.get('/profile');
      return res.data;
    } catch (e) {
      return {
        id: 'demo-id',
        name: 'Guest Student',
        exam: 'NEET',
        class: 'Class 12th',
      };
    }
  },

  async updateProfile(updates) {
    const res = await api.patch('/profile', updates);
    return res.data;
  },
};
