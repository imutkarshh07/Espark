const express = require('express');
const curriculumController = require('../controllers/curriculumController');

const router = express.Router();

router.get('/exams', curriculumController.getExams);
router.get('/subjects', curriculumController.getSubjects);
router.get('/chapters', curriculumController.getChapters);

module.exports = router;
