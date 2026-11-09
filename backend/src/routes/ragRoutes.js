const express = require('express');
const ragController = require('../controllers/ragController');
const { authMiddleware, lenientAuthMiddleware } = require('../middleware/authMiddleware');
const { strictLimiter } = require('../middleware/rateLimiter');
const { validate, ragAnalyzeMistakeSchema, ragQuerySchema } = require('../validators');

const router = express.Router();

router.post('/process-document', authMiddleware, strictLimiter, ragController.processDocument);
router.post('/analyze-mistake', authMiddleware, strictLimiter, validate(ragAnalyzeMistakeSchema), ragController.analyzeMistake);
router.post('/query', authMiddleware, strictLimiter, validate(ragQuerySchema), ragController.queryRAG);
router.post('/ask-doubt', lenientAuthMiddleware, strictLimiter, ragController.askDoubt);

module.exports = router;
