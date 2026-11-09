const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const inMemoryStore = require('../repositories/inMemoryStore');
const { successResponse } = require('../utils/response');

const router = express.Router();
router.use(authMiddleware);

// In-memory store for focus sessions per user
const userFocusSessions = new Map();

// Hydrate from persisted inMemoryStore focusSessions if present
(inMemoryStore.focusSessions || []).forEach((s) => {
  if (s && s.user_id) {
    if (!userFocusSessions.has(s.user_id)) {
      userFocusSessions.set(s.user_id, []);
    }
    userFocusSessions.get(s.user_id).push(s);
  }
});

function calculateUserStreak(userId) {
  const sessions = userFocusSessions.get(userId) || [];
  const attempts = inMemoryStore.attempts.filter((a) => a.user_id === userId);

  const dateSet = new Set();
  sessions.forEach((s) => {
    if (s.created_at) {
      dateSet.add(new Date(s.created_at).toISOString().slice(0, 10));
    }
  });
  attempts.forEach((a) => {
    if (a.completed_at || a.started_at) {
      dateSet.add(new Date(a.completed_at || a.started_at).toISOString().slice(0, 10));
    }
  });

  if (dateSet.size === 0) return 0;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // If no activity today and no activity yesterday, active streak is broken / 0
  if (!dateSet.has(todayStr) && !dateSet.has(yesterdayStr)) {
    return 0;
  }

  let streak = 0;
  let checkDate = dateSet.has(todayStr) ? today : yesterday;
  while (true) {
    const dStr = checkDate.toISOString().slice(0, 10);
    if (dateSet.has(dStr)) {
      streak += 1;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      break;
    }
  }
  return streak;
}

router.post('/sessions', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { durationSeconds, durationMinutes, subject = 'Physics', completed = true, timerOption = '25m' } = req.body;

    const sec = Math.max(1, parseInt(durationSeconds != null ? durationSeconds : (durationMinutes ? durationMinutes * 60 : 1500), 10));
    const min = Math.max(1, Math.round(sec / 60));

    const sessionRecord = {
      id: `foc-${Date.now()}`,
      user_id: userId,
      duration_seconds: sec,
      duration_minutes: min,
      subject: subject || 'General',
      completed: !!completed,
      timer_option: timerOption || `${min}m`,
      created_at: new Date().toISOString(),
    };

    if (!userFocusSessions.has(userId)) {
      userFocusSessions.set(userId, []);
    }
    userFocusSessions.get(userId).push(sessionRecord);

    if (!inMemoryStore.focusSessions) {
      inMemoryStore.focusSessions = [];
    }
    inMemoryStore.focusSessions.push(sessionRecord);
    inMemoryStore.save();

    const totalSeconds = userFocusSessions.get(userId).reduce((acc, s) => acc + s.duration_seconds, 0);
    const totalHours = +(totalSeconds / 3600).toFixed(1);
    const streakDays = calculateUserStreak(userId);

    return successResponse(
      res,
      {
        session: sessionRecord,
        stats: {
          totalHours,
          sessionsCompleted: userFocusSessions.get(userId).length,
          streakDays,
        },
      },
      201,
      'Focus session recorded successfully'
    );
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const sessions = userFocusSessions.get(userId) || [];
    const totalSeconds = sessions.reduce((acc, s) => acc + s.duration_seconds, 0);
    const totalHours = +(totalSeconds / 3600).toFixed(1);
    const streakDays = calculateUserStreak(userId);

    return successResponse(res, {
      streakDays,
      totalHours,
      sessionsCompleted: sessions.length,
      recentSessions: sessions.slice(-5),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.calculateUserStreak = calculateUserStreak;
module.exports.userFocusSessions = userFocusSessions;
