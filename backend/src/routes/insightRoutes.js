const express = require('express');
const insightController = require('../controllers/insightController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', insightController.listInsights);
router.get('/:id', insightController.getInsight);

module.exports = router;
