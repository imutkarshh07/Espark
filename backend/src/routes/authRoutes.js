const express = require('express');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const { supabaseAuthClient, supabaseAdminClient } = require('../config/supabase');
const profileRepository = require('../repositories/profileRepository');
const inMemoryStore = require('../repositories/inMemoryStore');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/authMiddleware');
const profileService = require('../services/profileService');

const router = express.Router();

// In-memory fallback credential map
if (!inMemoryStore.authUsers) {
  inMemoryStore.authUsers = new Map();
}

/**
 * POST /api/auth/register
 * Registers a student account with immediate confirmation bypass for seamless mobile onboarding.
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, exam, class: className } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 'VALIDATION_ERROR', 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    const studentName = (name || 'Student').trim();
    const studentExam = (exam || 'NEET').trim();
    const studentClass = (className || 'Class 12th').trim();

    let userId = uuidv4();
    let supabaseUser = null;
    let supabaseSession = null;

    // 1. Attempt Supabase Auth registration
    try {
      const { data, error } = await supabaseAuthClient.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: studentName,
            exam: studentExam,
            class: studentClass,
          },
        },
      });

      if (!error && data?.user) {
        supabaseUser = data.user;
        userId = data.user.id;
        supabaseSession = data.session;

        // Try auto-confirm via admin client if available
        try {
          if (supabaseAdminClient?.auth?.admin?.updateUserById) {
            await supabaseAdminClient.auth.admin.updateUserById(userId, {
              email_confirm: true,
            });
          }
        } catch (adminErr) {
          logger.warn('[Auth] Admin email auto-confirm skipped:', adminErr.message);
        }
      } else if (error) {
        logger.warn('[Auth] Supabase signUp note:', error.message);
        // If user already exists in Supabase, we can check or reuse
        if (error.message.includes('already registered')) {
          // Attempt sign in to verify credentials
          const signInAttempt = await supabaseAuthClient.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          if (signInAttempt.data?.user) {
            userId = signInAttempt.data.user.id;
            supabaseUser = signInAttempt.data.user;
            supabaseSession = signInAttempt.data.session;
          }
        }
      }
    } catch (sbErr) {
      logger.warn('[Auth] Supabase signUp exception, using local store:', sbErr.message);
    }

    // 2. Persist student profile
    const profile = await profileRepository.upsert({
      id: userId,
      email: cleanEmail,
      name: studentName,
      exam: studentExam,
      class: studentClass,
    });

    // 3. Store in credential cache for resilient login
    inMemoryStore.authUsers.set(cleanEmail, {
      id: userId,
      email: cleanEmail,
      password,
      name: studentName,
      exam: studentExam,
      class: studentClass,
    });

    // 4. Create active session token
    const token = supabaseSession?.access_token || `user-token-${userId}`;

    const userObj = {
      id: userId,
      email: cleanEmail,
      name: studentName,
      exam: studentExam,
      class: studentClass,
    };

    logger.info(`[Auth] User registered successfully: ${cleanEmail} (${studentExam})`);

    return successResponse(res, {
      user: userObj,
      session: {
        access_token: token,
        user: userObj,
      },
      message: 'Account created and authenticated successfully.',
    }, 201);
  } catch (err) {
    logger.error('[Auth] Registration error:', err.message);
    return errorResponse(res, err.message || 'Registration failed.', 'INTERNAL_ERROR', 500);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user, with graceful bypass of unconfirmed email roadblocks.
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 'VALIDATION_ERROR', 400);
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Try direct Supabase sign in
    try {
      const { data, error } = await supabaseAuthClient.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (!error && data?.session) {
        const profile = await profileRepository.getById(data.user.id);
        const userObj = {
          id: data.user.id,
          email: cleanEmail,
          name: profile?.name || data.user.user_metadata?.name || 'Student',
          exam: profile?.exam || data.user.user_metadata?.exam || 'NEET',
          class: profile?.class || data.user.user_metadata?.class || 'Class 12th',
        };

        return successResponse(res, {
          user: userObj,
          session: data.session,
        });
      }

      // If Supabase says Email not confirmed:
      if (error && error.message.toLowerCase().includes('email not confirmed')) {
        logger.info(`[Auth] Supabase email confirmation pending for ${cleanEmail}. Bypassing roadblock for mobile app.`);

        // Find user by email in profile store or authUsers
        let existing = inMemoryStore.authUsers.get(cleanEmail);
        let userId = existing?.id || uuidv4();
        let name = existing?.name || 'Student';
        let exam = existing?.exam || 'NEET';
        let className = existing?.class || 'Class 12th';

        // Check profile
        const profile = await profileRepository.getById(userId);
        if (profile?.name) {
          name = profile.name;
          exam = profile.exam || exam;
        }

        const userObj = {
          id: userId,
          email: cleanEmail,
          name,
          exam,
          class: className,
        };

        const token = `user-token-${userId}`;
        return successResponse(res, {
          user: userObj,
          session: {
            access_token: token,
            user: userObj,
          },
          message: 'Signed in successfully (Email confirmation bypassed).',
        });
      }
    } catch (sbErr) {
      logger.warn('[Auth] Supabase signIn error:', sbErr.message);
    }

    // 2. Fallback to inMemoryStore / local credential validation
    const localUser = inMemoryStore.authUsers.get(cleanEmail);
    if (localUser && localUser.password === password) {
      const profile = await profileRepository.getById(localUser.id);
      const userObj = {
        id: localUser.id,
        email: cleanEmail,
        name: profile?.name || localUser.name,
        exam: profile?.exam || localUser.exam,
        class: profile?.class || localUser.class,
      };

      const token = `user-token-${localUser.id}`;
      return successResponse(res, {
        user: userObj,
        session: {
          access_token: token,
          user: userObj,
        },
      });
    }

    // 3. If password check fails or not found
    return errorResponse(res, 'Invalid email or password.', 'INVALID_CREDENTIALS', 401);
  } catch (err) {
    logger.error('[Auth] Login error:', err.message);
    return errorResponse(res, err.message || 'Login failed.', 'INTERNAL_ERROR', 500);
  }
});

/**
 * POST /api/auth/google-sync
 * Synchronizes an OAuth / Google authenticated user session with the backend.
 * Extracts verified user identity from Supabase JWT and creates/updates profile.
 */
router.post('/google-sync', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    const { name, exam, class: className, avatar_url } = req.body || {};

    const profile = await profileService.getProfile(user.id, user.email, user.user_metadata);

    // If client supplied specific exam/class preferences or custom details, update profile
    const updates = {};
    if (exam && exam !== profile.exam) updates.exam = exam;
    if (className && className !== profile.class) updates.class = className;
    if (name && (!profile.name || profile.name === 'Student')) updates.name = name;
    if (avatar_url && !profile.avatar_url) updates.avatar_url = avatar_url;

    let updatedProfile = profile;
    if (Object.keys(updates).length > 0) {
      updatedProfile = await profileService.updateProfile(user.id, updates);
    }

    logger.info(`[Auth] Google user synchronized: ${user.email} (${user.id})`);

    return successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        name: updatedProfile.name,
        exam: updatedProfile.exam,
        class: updatedProfile.class,
        avatar_url: updatedProfile.avatar_url,
      },
      profile: updatedProfile,
      message: 'Google profile synchronized successfully.',
    });
  } catch (err) {
    logger.error('[Auth] Google sync error:', err.message);
    return errorResponse(res, err.message || 'Failed to sync Google user.', 'INTERNAL_ERROR', 500);
  }
});

module.exports = router;
