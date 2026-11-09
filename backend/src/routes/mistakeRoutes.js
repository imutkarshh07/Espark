const express = require('express');
const mistakeController = require('../controllers/mistakeController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', mistakeController.listMistakes);
router.get('/:id', mistakeController.getMistake);

module.exports = router;
