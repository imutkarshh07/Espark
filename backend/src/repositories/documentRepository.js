const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');

class DocumentRepository {
  async getByUser(userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[DocumentRepository] Falling back to in-memory store: ${err.message}`);
    }
    return (inMemoryStore.documents || []).filter((d) => d.user_id === userId);
  }

  async getById(id, userId = null) {
    try {
      let query = supabaseAdminClient.from('documents').select('*').eq('id', id);
      if (userId) {
        query = query.eq('user_id', userId);
      }
      const { data, error } = await query.single();
      if (!error && data) return data;
    } catch (err) {
      console.warn(`[DocumentRepository] Falling back to in-memory store for document ${id}: ${err.message}`);
    }
    const doc = (inMemoryStore.documents || []).find((d) => d.id === id);
    if (doc) {
      if (userId && doc.user_id !== userId) return null;
      return doc;
    }
    return null;
  }

  async create(docData) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('documents')
        .insert([docData])
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[DocumentRepository] Falling back to in-memory create: ${err.message}`);
    }

    const newDoc = {
      id: `doc-${Date.now()}`,
      ...docData,
      created_at: new Date().toISOString(),
    };
    if (!inMemoryStore.documents) inMemoryStore.documents = [];
    inMemoryStore.documents.unshift(newDoc);
    return newDoc;
  }

  async updateStatus(id, status, processingError = null) {
    const updates = { status };
    if (processingError !== undefined) {
      updates.processing_error = processingError;
    }
    try {
      const { data, error } = await supabaseAdminClient
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[DocumentRepository] Falling back to in-memory updateStatus: ${err.message}`);
    }

    const doc = (inMemoryStore.documents || []).find((d) => d.id === id);
    if (doc) {
      Object.assign(doc, updates);
      return doc;
    }
    return { id, ...updates };
  }

  async delete(id, userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('documents')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      console.warn(`[DocumentRepository] Falling back to in-memory delete: ${err.message}`);
    }

    const idx = (inMemoryStore.documents || []).findIndex((d) => d.id === id && d.user_id === userId);
    if (idx !== -1) {
      return inMemoryStore.documents.splice(idx, 1)[0];
    }
    return null;
  }

  // Storage operations
  async deleteFileFromStorage(storagePath) {
    const { error } = await supabaseAdminClient.storage
      .from('study-documents')
      .remove([storagePath]);
    if (error) {
      console.warn('[Storage] Warning removing file:', error.message);
    }
  }

  async createSignedUrl(storagePath, expiresIn = 3600) {
    const { data, error } = await supabaseAdminClient.storage
      .from('study-documents')
      .createSignedUrl(storagePath, expiresIn);
    if (error) throw error;
    return data.signedUrl;
  }
}

module.exports = new DocumentRepository();
