const ragService = require('../services/ragService');
const documentService = require('../services/documentService');
const { successResponse } = require('../utils/response');

const processDocument = async (req, res, next) => {
  try {
    const { document_id } = req.body;
    const document = await documentService.getDocument(document_id, req.user.id);
    const result = await ragService.processDocument({
      userId: req.user.id,
      documentId: document.id,
      storagePath: document.storage_path,
      fileName: document.file_name,
      subject: document.subject,
      chapter: document.chapter,
    });
    return successResponse(res, result, 200, 'Document processed successfully');
  } catch (err) {
    next(err);
  }
};

const analyzeMistake = async (req, res, next) => {
  try {
    const result = await ragService.analyzeMistake({
      userId: req.user.id,
      documentIds: req.body.document_ids || [],
      mistake: req.body,
    });
    return successResponse(res, result, 200, 'Mistake analysis generated');
  } catch (err) {
    next(err);
  }
};

const queryRAG = async (req, res, next) => {
  try {
    const result = await ragService.query({
      userId: req.user.id,
      query: req.body.query,
      subject: req.body.subject,
      chapter: req.body.chapter,
      topK: req.body.top_k || 5,
    });
    return successResponse(res, result, 200);
  } catch (err) {
    next(err);
  }
};

const askDoubt = async (req, res, next) => {
  try {
    const result = await ragService.askDoubt({
      userId: req.user.id,
      query: req.body.query,
      subject: req.body.subject || 'General',
      chapter: req.body.chapter || 'General',
      fileContent: req.body.file_content || null,
      fileName: req.body.file_name || null,
      fileType: req.body.file_type || null,
    });

    // Award 25 study points and 5 mins study duration for doubt resolution
    try {
      const inMemoryStore = require('../repositories/inMemoryStore');
      if (!inMemoryStore.studyActivities) {
        inMemoryStore.studyActivities = [];
      }
      inMemoryStore.studyActivities.unshift({
        id: `act-doubt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        user_id: req.user.id,
        type: 'doubt_solved',
        title: `AI Doubt: ${req.body.subject || 'Academic Query'}`,
        subject: req.body.subject || 'General',
        points: 25,
        duration_seconds: 300,
        created_at: new Date().toISOString(),
      });
      inMemoryStore.save();
    } catch (saveErr) {
      console.warn('[ragController] Failed to record doubt activity:', saveErr.message);
    }

    return successResponse(res, result, 200, 'Doubt analyzed and solved successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  processDocument,
  analyzeMistake,
  queryRAG,
  askDoubt,
};
