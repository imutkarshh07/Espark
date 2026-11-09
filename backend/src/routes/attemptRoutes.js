const express = require('express');
const attemptController = require('../controllers/attemptController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, submitAnswerSchema, completeAttemptSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', attemptController.listAttempts);
router.get('/:id', attemptController.getAttempt);
router.post('/:id/answers', validate(submitAnswerSchema), attemptController.submitAnswer);
router.post('/:id/complete', validate(completeAttemptSchema), attemptController.completeAttempt);

module.exports = router;
