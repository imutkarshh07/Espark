const express = require('express');
const testController = require('../controllers/testController');
const attemptController = require('../controllers/attemptController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, createTestSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', testController.listTests);
router.post('/', validate(createTestSchema), testController.createTest);
router.post('/generate', testController.generateTest);
router.get('/:id', testController.getTest);
router.delete('/:id', testController.deleteTest);
router.post('/:id/start', attemptController.startAttempt);

module.exports = router;
