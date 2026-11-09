const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');
const logger = require('../utils/logger');

class ProfileRepository {
  async getById(id) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (data) return data;
    } catch (err) {
      logger.warn(`[ProfileRepository] Falling back to in-memory store: ${err.message}`);
    }
    return inMemoryStore.profiles.get(id) || null;
  }

  async upsert(profileData) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('profiles')
        .upsert(
          {
            ...profileData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[ProfileRepository] Falling back to in-memory store for upsert: ${err.message}`);
    }
    const record = {
      ...profileData,
      updated_at: new Date().toISOString(),
    };
    inMemoryStore.profiles.set(profileData.id, record);
    return record;
  }

  async update(id, updates) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[ProfileRepository] Falling back to in-memory store for update: ${err.message}`);
    }
    const existing = await this.getById(id);
    const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
    inMemoryStore.profiles.set(id, updated);
    return updated;
  }
}

module.exports = new ProfileRepository();
