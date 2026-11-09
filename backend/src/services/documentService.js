const documentRepository = require('../repositories/documentRepository');
const ragService = require('./ragService');
const logger = require('../utils/logger');

class DocumentService {
  async listDocuments(userId) {
    return await documentRepository.getByUser(userId);
  }

  async getDocument(id, userId) {
    const doc = await documentRepository.getById(id, userId);
    if (!doc) {
      const err = new Error('Document not found or access denied.');
      err.statusCode = 404;
      err.code = 'DOCUMENT_NOT_FOUND';
      throw err;
    }
    return doc;
  }

  async createDocument(userId, docData) {
    // 1. Create document metadata record in PostgreSQL
    const document = await documentRepository.create({
      user_id: userId,
      file_name: docData.file_name,
      storage_path: docData.storage_path,
      file_size: docData.file_size || null,
      mime_type: docData.mime_type || 'application/pdf',
      status: 'pending',
      subject: docData.subject || 'General',
      chapter: docData.chapter || 'General',
    });

    // 2. Trigger asynchronous RAG processing without blocking the initial HTTP response
    this.triggerProcessing(document).catch((err) => {
      logger.error(`[DocumentService] Async processing failure for ${document.id}:`, err.message);
    });

    return document;
  }

  async triggerProcessing(document) {
    try {
      await documentRepository.updateStatus(document.id, 'processing');

      // Call Python RAG microservice
      await ragService.processDocument({
        userId: document.user_id,
        documentId: document.id,
        storagePath: document.storage_path,
        fileName: document.file_name,
        subject: document.subject,
        chapter: document.chapter,
      });

      await documentRepository.updateStatus(document.id, 'completed');
      logger.info(`[DocumentService] Document ${document.id} processed successfully`);
    } catch (err) {
      logger.error(`[DocumentService] Processing failed for ${document.id}:`, err.message);
      await documentRepository.updateStatus(document.id, 'failed', err.message);
    }
  }

  async deleteDocument(id, userId) {
    const doc = await this.getDocument(id, userId);
    if (doc.storage_path) {
      await documentRepository.deleteFileFromStorage(doc.storage_path);
    }
    return await documentRepository.delete(id, userId);
  }
}

module.exports = new DocumentService();
