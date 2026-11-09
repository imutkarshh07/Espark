const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');
const logger = require('../utils/logger');

class MistakeRepository {
  async getByUser(userId, category = null) {
    try {
      let query = supabaseAdminClient
        .from('mistakes')
        .select('*, questions(*), insights(*, practice_questions(*)), attempts(test_id, tests(title, subject))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) return data;
    } catch (err) {
      logger.warn(`[MistakeRepository] Falling back to in-memory store: ${err.message}`);
    }

    let results = inMemoryStore.mistakes.filter((m) => m.user_id === userId);
    if (category) {
      results = results.filter((m) => m.category === category);
    }
    return results;
  }

  async getById(id, userId = null) {
    try {
      let query = supabaseAdminClient
        .from('mistakes')
        .select('*, questions(*), insights(*, practice_questions(*)), attempts(test_id, tests(title, subject))')
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();
      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[MistakeRepository] Falling back to in-memory store for mistake ${id}: ${err.message}`);
    }
    const mistake = inMemoryStore.mistakes.find((m) => m.id === id);
    if (mistake) {
      if (userId && mistake.user_id !== userId) return null;
      return mistake;
    }
    return null;
  }

  async create(mistakeData) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('mistakes')
        .insert([mistakeData])
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[MistakeRepository] Falling back to in-memory create: ${err.message}`);
    }

    const newMistake = {
      id: `mst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      ...mistakeData,
      created_at: new Date().toISOString(),
    };
    inMemoryStore.mistakes.unshift(newMistake);
    return newMistake;
  }

  async updateDiagnosis(id, updates) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('mistakes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[MistakeRepository] Falling back to in-memory updateDiagnosis: ${err.message}`);
    }

    const mistake = inMemoryStore.mistakes.find((m) => m.id === id);
    if (mistake) {
      Object.assign(mistake, updates);
      return mistake;
    }
    return { id, ...updates };
  }
}

module.exports = new MistakeRepository();
