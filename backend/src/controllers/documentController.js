const documentService = require('../services/documentService');
const { successResponse } = require('../utils/response');

const listDocuments = async (req, res, next) => {
  try {
    const documents = await documentService.listDocuments(req.user.id);
    return successResponse(res, documents);
  } catch (err) {
    next(err);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const document = await documentService.getDocument(req.params.id, req.user.id);
    return successResponse(res, document);
  } catch (err) {
    next(err);
  }
};

const createDocument = async (req, res, next) => {
  try {
    const document = await documentService.createDocument(req.user.id, req.body);
    return successResponse(res, document, 201, 'Document registered and queued for processing');
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    await documentService.deleteDocument(req.params.id, req.user.id);
    return successResponse(res, null, 200, 'Document deleted successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDocuments,
  getDocument,
  createDocument,
  deleteDocument,
};
