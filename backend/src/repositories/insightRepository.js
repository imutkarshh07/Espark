const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');
const logger = require('../utils/logger');

class InsightRepository {
  async getByUser(userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('insights')
        .select('*, practice_questions(*), mistakes(*, questions(*))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      logger.warn(`[InsightRepository] Falling back to in-memory store: ${err.message}`);
    }
    return inMemoryStore.insights.filter((i) => i.user_id === userId || i.user_id === '00000000-0000-0000-0000-000000000001');
  }

  async getById(id, userId = null) {
    try {
      let query = supabaseAdminClient
        .from('insights')
        .select('*, practice_questions(*), mistakes(*, questions(*))')
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();
      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[InsightRepository] Falling back to in-memory store for insight ${id}: ${err.message}`);
    }
    const insight = inMemoryStore.insights.find((i) => i.id === id);
    if (insight) {
      if (userId && insight.user_id !== userId) return null;
      return insight;
    }
    return null;
  }

  async create(insightData, practiceQuestions = []) {
    try {
      const { data: insight, error } = await supabaseAdminClient
        .from('insights')
        .insert([insightData])
        .select()
        .single();

      if (!error && insight) {
        if (practiceQuestions && practiceQuestions.length > 0) {
          const records = practiceQuestions.map((pq) => ({
            insight_id: insight.id,
            question_text: pq.question_text || pq.question,
            options: pq.options || [],
            correct_answer: pq.correct_answer || pq.answer,
            explanation: pq.explanation || null,
          }));

          const { data: insertedPq, error: pqError } = await supabaseAdminClient
            .from('practice_questions')
            .insert(records)
            .select();

          insight.practice_questions = !pqError ? insertedPq : [];
        } else {
          insight.practice_questions = [];
        }
        return insight;
      }
    } catch (err) {
      logger.warn(`[InsightRepository] Falling back to in-memory create: ${err.message}`);
    }

    const newInsight = {
      id: `ins-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...insightData,
      created_at: new Date().toISOString(),
      practice_questions: (practiceQuestions || []).map((pq, idx) => ({
        id: `pq-${Date.now()}-${idx}`,
        question_text: pq.question_text || pq.question,
        options: pq.options || [],
        correct_answer: pq.correct_answer || pq.answer,
        explanation: pq.explanation || null,
      })),
    };
    inMemoryStore.insights.unshift(newInsight);
    return newInsight;
  }
}

module.exports = new InsightRepository();
