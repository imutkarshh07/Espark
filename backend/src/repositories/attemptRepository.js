const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');
const logger = require('../utils/logger');

class AttemptRepository {
  async getByUser(userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('attempts')
        .select('*, tests(title, subject, chapter, total_questions)')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      logger.warn(`[AttemptRepository] Falling back to in-memory store: ${err.message}`);
    }
    return inMemoryStore.attempts.filter((a) => a.user_id === userId);
  }

  async getById(id, userId = null) {
    try {
      let query = supabaseAdminClient
        .from('attempts')
        .select('*, tests(title, subject, chapter, total_questions), answers(*, questions(*))')
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();
      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[AttemptRepository] Falling back to in-memory store for attempt ${id}: ${err.message}`);
    }
    const att = inMemoryStore.attempts.find((a) => a.id === id);
    if (att) {
      if (userId && att.user_id !== userId) return null;
      return att;
    }

    return null;
  }

  async create(userId, testId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('attempts')
        .insert([
          {
            user_id: userId,
            test_id: testId,
            score: 0.0,
            started_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[AttemptRepository] Falling back to in-memory store for create attempt: ${err.message}`);
    }

    const test = inMemoryStore.tests.find((t) => t.id === testId) || inMemoryStore.tests[0];
    const newAttempt = {
      id: `att-${Date.now()}`,
      user_id: userId,
      test_id: testId,
      score: 0.0,
      started_at: new Date().toISOString(),
      tests: test,
      answers: [],
    };
    inMemoryStore.attempts.unshift(newAttempt);
    inMemoryStore.save();
    return newAttempt;
  }

  async recordAnswer(attemptId, questionId, selectedAnswer, isCorrect, timeTaken = 0) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('answers')
        .insert([
          {
            attempt_id: attemptId,
            question_id: questionId,
            selected_answer: selectedAnswer,
            is_correct: isCorrect,
            time_taken: timeTaken,
          },
        ])
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[AttemptRepository] Falling back to in-memory recordAnswer: ${err.message}`);
    }

    const answer = {
      id: `ans-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      attempt_id: attemptId,
      question_id: questionId,
      selected_answer: selectedAnswer,
      is_correct: isCorrect,
      time_taken: timeTaken,
    };
    const att = inMemoryStore.attempts.find((a) => a.id === attemptId);
    if (att) {
      att.answers = att.answers || [];
      const existingIdx = att.answers.findIndex((a) => a.question_id === questionId);
      if (existingIdx >= 0) {
        att.answers[existingIdx] = answer;
      } else {
        att.answers.push(answer);
      }
      inMemoryStore.save();
    }
    return answer;
  }

  async completeAttempt(attemptId, score, completedAt = new Date().toISOString()) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('attempts')
        .update({
          score,
          completed_at: completedAt,
        })
        .eq('id', attemptId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[AttemptRepository] Falling back to in-memory completeAttempt: ${err.message}`);
    }

    const att = inMemoryStore.attempts.find((a) => a.id === attemptId);
    if (att) {
      att.score = score;
      att.completed_at = completedAt;
      inMemoryStore.save();
      return att;
    }
    return { id: attemptId, score, completed_at: completedAt };
  }
}

module.exports = new AttemptRepository();
