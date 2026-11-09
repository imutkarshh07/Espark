const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const profileRepository = require('../repositories/profileRepository');
const attemptRepository = require('../repositories/attemptRepository');
const inMemoryStore = require('../repositories/inMemoryStore');
const { calculateUserStreak, userFocusSessions } = require('./focusRoutes');
const { successResponse } = require('../utils/response');

const router = express.Router();
router.use(authMiddleware);

// 12 Realistic Peer Scholars across competitive tiers (JEE, NEET, CBSE)
// Ensures Top 10 is ALWAYS completely populated with high-fidelity student data
const seedPeers = [
  { id: 'peer-1', name: 'Aarav Patel', exam: 'JEE', dailyPts: 165, dailyHrs: 2.8, weeklyPts: 980, weeklyHrs: 16.5, monthlyPts: 3850, monthlyHrs: 64.0, streakDays: 18 },
  { id: 'peer-2', name: 'Ananya Roy', exam: 'NEET', dailyPts: 145, dailyHrs: 2.4, weeklyPts: 870, weeklyHrs: 14.8, monthlyPts: 3420, monthlyHrs: 58.0, streakDays: 14 },
  { id: 'peer-3', name: 'Rohan Verma', exam: 'JEE', dailyPts: 125, dailyHrs: 2.1, weeklyPts: 760, weeklyHrs: 13.0, monthlyPts: 3010, monthlyHrs: 51.5, streakDays: 11 },
  { id: 'peer-4', name: 'Priya Nair', exam: 'NEET', dailyPts: 105, dailyHrs: 1.8, weeklyPts: 640, weeklyHrs: 11.2, monthlyPts: 2580, monthlyHrs: 44.0, streakDays: 9 },
  { id: 'peer-5', name: 'Kavya Sen', exam: 'CBSE', dailyPts: 90, dailyHrs: 1.5, weeklyPts: 530, weeklyHrs: 9.4, monthlyPts: 2150, monthlyHrs: 37.5, streakDays: 8 },
  { id: 'peer-6', name: 'Devansh Joshi', exam: 'JEE', dailyPts: 75, dailyHrs: 1.3, weeklyPts: 440, weeklyHrs: 7.8, monthlyPts: 1790, monthlyHrs: 31.0, streakDays: 6 },
  { id: 'peer-7', name: 'Meera Kapoor', exam: 'NEET', dailyPts: 60, dailyHrs: 1.0, weeklyPts: 360, weeklyHrs: 6.2, monthlyPts: 1450, monthlyHrs: 25.5, streakDays: 5 },
  { id: 'peer-8', name: 'Arjun Reddy', exam: 'JEE', dailyPts: 48, dailyHrs: 0.8, weeklyPts: 290, weeklyHrs: 5.1, monthlyPts: 1180, monthlyHrs: 20.5, streakDays: 4 },
  { id: 'peer-9', name: 'Ishita Sharma', exam: 'NEET', dailyPts: 38, dailyHrs: 0.6, weeklyPts: 220, weeklyHrs: 3.9, monthlyPts: 910, monthlyHrs: 15.8, streakDays: 3 },
  { id: 'peer-10', name: 'Siddharth Rao', exam: 'JEE', dailyPts: 28, dailyHrs: 0.5, weeklyPts: 165, weeklyHrs: 2.9, monthlyPts: 690, monthlyHrs: 12.0, streakDays: 2 },
  { id: 'peer-11', name: 'Tanvi Deshmukh', exam: 'NEET', dailyPts: 20, dailyHrs: 0.3, weeklyPts: 120, weeklyHrs: 2.1, monthlyPts: 480, monthlyHrs: 8.5, streakDays: 2 },
  { id: 'peer-12', name: 'Kabir Malhotra', exam: 'CBSE', dailyPts: 12, dailyHrs: 0.2, weeklyPts: 75, weeklyHrs: 1.3, monthlyPts: 310, monthlyHrs: 5.4, streakDays: 1 },
];

router.get('/', async (req, res, next) => {
  try {
    const { period = 'today' } = req.query;
    const currentUserId = req.user.id;
    const profile = await profileRepository.getById(currentUserId);

    const normalizedPeriod = String(period).toLowerCase();
    const isDaily = normalizedPeriod === 'today' || normalizedPeriod === 'daily';
    const isWeekly = normalizedPeriod === 'weekly';
    const isMonthly = normalizedPeriod === 'monthly';

    // Fetch user's real completed focus sessions (from Map and inMemoryStore)
    const directSessions = userFocusSessions.get(currentUserId) || [];
    const storeSessions = (inMemoryStore.focusSessions || []).filter((s) => s.user_id === currentUserId);
    const sessionMap = new Map();
    [...directSessions, ...storeSessions].forEach((s) => sessionMap.set(s.id, s));
    const allUserSessions = Array.from(sessionMap.values());

    // Fetch user's real completed test attempts
    let allUserAttempts = [];
    try {
      allUserAttempts = await attemptRepository.getByUser(currentUserId);
    } catch (e) {
      allUserAttempts = (inMemoryStore.attempts || []).filter((a) => a.user_id === currentUserId);
    }

    // Fetch user's logged study activities (doubts, drills, practice)
    const allUserActivities = (inMemoryStore.studyActivities || []).filter((a) => a.user_id === currentUserId);

    // Period filter window
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let periodStartMs;
    if (isDaily) {
      // Anything today or within last 24h
      periodStartMs = Math.min(startOfToday.getTime(), now - 24 * 3600 * 1000);
    } else if (isWeekly) {
      periodStartMs = now - (7 * 24 * 3600 * 1000);
    } else if (isMonthly) {
      periodStartMs = now - (30 * 24 * 3600 * 1000);
    } else {
      periodStartMs = 0;
    }

    const filteredSessions = allUserSessions.filter((s) => {
      const ts = new Date(s.created_at || s.timestamp || now).getTime();
      return ts >= periodStartMs;
    });

    const filteredAttempts = allUserAttempts.filter((a) => {
      const ts = new Date(a.completed_at || a.started_at || a.created_at || now).getTime();
      return ts >= periodStartMs;
    });

    const filteredActivities = allUserActivities.filter((act) => {
      const ts = new Date(act.created_at || now).getTime();
      return ts >= periodStartMs;
    });

    // Compute user study duration (seconds)
    const userFocusSeconds = filteredSessions.reduce((acc, s) => {
      return acc + (s.duration_seconds || (s.duration_minutes ? s.duration_minutes * 60 : 0));
    }, 0);

    const userTestSeconds = filteredAttempts.reduce((acc, a) => {
      const qCount = a.answers?.length || a.tests?.total_questions || 5;
      const explicitTime = (a.answers || []).reduce((sum, ans) => sum + (ans.time_taken || 0), 0);
      return acc + (explicitTime > 0 ? explicitTime : qCount * 90);
    }, 0);

    const userActivitySeconds = filteredActivities.reduce((acc, act) => {
      return acc + (act.duration_seconds || 0);
    }, 0);

    const totalSeconds = userFocusSeconds + userTestSeconds + userActivitySeconds;
    const userStudyHours = +(totalSeconds / 3600).toFixed(1);
    const userStreak = calculateUserStreak(currentUserId);
    const userSessionsCount = filteredSessions.length + filteredAttempts.length + filteredActivities.length;

    // Study Score calculation:
    // Focus: 2 pts per minute
    const focusPoints = userFocusSeconds > 0 ? Math.round((userFocusSeconds / 60) * 2) : 0;

    // Test attempts: 50 base pts per completed attempt + score scaling
    const testPoints = filteredAttempts.reduce((acc, a) => {
      const scoreNum = parseFloat(a.score) || 0;
      return acc + 50 + Math.round(scoreNum * 0.75);
    }, 0);

    // Direct activities (doubts, revisions):
    const activityPoints = filteredActivities.reduce((acc, act) => acc + (act.points || 0), 0);

    // Streak bonus
    const streakBonus = userStreak * (isDaily ? 10 : isWeekly ? 30 : 75);

    const userStudyScore = focusPoints + testPoints + activityPoints + streakBonus;

    const currentStudent = {
      id: currentUserId,
      name: profile?.name || req.user.email?.split('@')[0] || 'You',
      exam: profile?.exam || 'NEET',
      points: userStudyScore,
      studyHours: userStudyHours,
      focusHours: `${userStudyHours}h`,
      streakDays: userStreak,
      streak: userStreak,
      sessions: userSessionsCount,
      isCurrentUser: true,
    };

    // Hour of day factor for living competition
    const hourOfDay = new Date().getHours();
    const dayProgress = Math.min(1.15, Math.max(0.65, hourOfDay / 15));

    // Dynamic peer students
    const peers = seedPeers.map((s) => {
      let scaledPoints = 0;
      let scaledHours = 0;

      if (isDaily) {
        scaledPoints = Math.round(s.dailyPts * dayProgress);
        scaledHours = +(s.dailyHrs * dayProgress).toFixed(1);
      } else if (isWeekly) {
        scaledPoints = s.weeklyPts;
        scaledHours = s.weeklyHrs;
      } else {
        scaledPoints = s.monthlyPts;
        scaledHours = s.monthlyHrs;
      }

      return {
        id: s.id,
        name: s.name,
        exam: s.exam,
        points: scaledPoints,
        studyHours: scaledHours,
        focusHours: `${scaledHours}h`,
        streakDays: s.streakDays,
        streak: s.streakDays,
        sessions: Math.round(scaledHours * 2),
        isCurrentUser: false,
      };
    });

    const all = [currentStudent, ...peers];
    // Sort descending by points, tie-break with studyHours
    all.sort((a, b) => b.points !== a.points ? b.points - a.points : b.studyHours - a.studyHours);

    // Assign 1-based ranks
    const ranked = all.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));

    const userRankInfo = ranked.find((item) => item.isCurrentUser) || {
      ...currentStudent,
      rank: ranked.length,
    };

    const top10 = ranked.slice(0, 10);

    return successResponse(res, {
      period: normalizedPeriod,
      currentUser: userRankInfo,
      userRank: userRankInfo,
      top10,
      leaderboard: ranked,
      totalParticipants: ranked.length,
    });
  } catch (err) {
    next(err);
  }
});

// Record general study activity (e.g. doubt solve, video lesson, chapter revision)
router.post('/activity', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = 'study', points = 15, durationSeconds = 300, subject = 'General', title = '' } = req.body;

    const activityRecord = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      user_id: userId,
      type,
      title: title || `${type.replace(/_/g, ' ')}`,
      subject,
      points: Number(points) || 15,
      duration_seconds: Number(durationSeconds) || 0,
      created_at: new Date().toISOString(),
    };

    if (!inMemoryStore.studyActivities) {
      inMemoryStore.studyActivities = [];
    }
    inMemoryStore.studyActivities.unshift(activityRecord);
    inMemoryStore.save();

    return successResponse(res, { activity: activityRecord }, 201, 'Study activity recorded successfully');
  } catch (err) {
    next(err);
  }
});

module.exports = router;

