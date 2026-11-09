import api from './api';
import { supabase } from './supabaseClient';

export const documentService = {
  async listDocuments() {
    const res = await api.get('/documents');
    return res.data;
  },

  async getDocument(id) {
    const res = await api.get(`/documents/${id}`);
    return res.data;
  },

  async uploadDocument(file, { subject = 'General', chapter = 'General' } = {}) {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) throw new Error('User must be authenticated to upload documents.');

    // Generate unique storage path: user_id/doc_id/filename.pdf
    const docId = crypto.randomUUID();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${userId}/${docId}/${cleanFileName}`;

    // 1. Upload to Supabase Storage private bucket 'study-documents'
    const { data: storageData, error: storageError } = await supabase.storage
      .from('study-documents')
      .upload(storagePath, file, {
        contentType: file.type || 'application/pdf',
        upsert: true,
      });

    if (storageError) {
      console.warn('[Storage Upload] Uploading directly to storage failed or bucket not initialized:', storageError.message);
    }

    // 2. Register metadata with Node.js backend
    const res = await api.post('/documents', {
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type || 'application/pdf',
      subject,
      chapter,
    });

    return res.data;
  },

  async deleteDocument(id) {
    const res = await api.delete(`/documents/${id}`);
    return res.data;
  },
};
