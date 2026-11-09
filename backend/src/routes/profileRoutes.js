const express = require('express');
const profileController = require('../controllers/profileController');
const authMiddleware = require('../middleware/authMiddleware');
const { validate, updateProfileSchema } = require('../validators');

const router = express.Router();

router.use(authMiddleware);

router.get('/', profileController.getProfile);
router.patch('/', validate(updateProfileSchema), profileController.updateProfile);

module.exports = router;
