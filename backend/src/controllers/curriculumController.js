const curriculumData = require('../data/curriculumData');
const { successResponse } = require('../utils/response');

const getExams = async (req, res, next) => {
  try {
    return successResponse(res, {
      exams: curriculumData.exams,
      classes: curriculumData.classes,
    });
  } catch (err) {
    next(err);
  }
};

const getSubjects = async (req, res, next) => {
  try {
    const { exam = 'NEET' } = req.query;
    const examObj = curriculumData.exams.find((e) => e.id.toLowerCase() === exam.toLowerCase()) || curriculumData.exams[0];
    return successResponse(res, {
      exam: examObj.id,
      subjects: examObj.subjects,
    });
  } catch (err) {
    next(err);
  }
};

const normalizeSubject = (sub = '') => {
  const s = sub.trim().toLowerCase();
  if (s === 'maths' || s === 'mathematics' || s === 'math') return 'Mathematics';
  if (s === 'physics' || s === 'phy') return 'Physics';
  if (s === 'chemistry' || s === 'chem') return 'Chemistry';
  if (s === 'biology' || s === 'bio' || s === 'botany' || s === 'zoology') return 'Biology';
  return sub.charAt(0).toUpperCase() + sub.slice(1);
};

const getChapters = async (req, res, next) => {
  try {
    const { exam = 'NEET', subject = 'Biology', classLevel } = req.query;
    const normalizedExam = exam.toUpperCase();
    const normalizedSubject = normalizeSubject(subject);

    const key = `${normalizedExam}:${normalizedSubject}`;
    let allSubjectChapters = curriculumData.chapters[key] || curriculumData.ncertChapters[normalizedSubject] || [];

    if (!allSubjectChapters.length) {
      // Case-insensitive fallback search in ncertChapters
      const foundKey = Object.keys(curriculumData.ncertChapters).find(
        (k) => k.toLowerCase() === normalizedSubject.toLowerCase()
      );
      if (foundKey) {
        allSubjectChapters = curriculumData.ncertChapters[foundKey];
      }
    }

    if (!allSubjectChapters.length) {
      allSubjectChapters = [
        { id: 'foundations', name: `${normalizedSubject} Core Principles`, class: 'Class 12th', highYield: true },
        { id: 'applications', name: `${normalizedSubject} Advanced Applications`, class: 'Class 12th', highYield: true },
      ];
    }

    let chaptersToReturn = allSubjectChapters;
    if (classLevel && classLevel !== 'Dropper / Repeater' && classLevel !== 'All') {
      const filtered = allSubjectChapters.filter((c) => c.class === classLevel);
      if (filtered.length > 0) {
        chaptersToReturn = filtered;
      }
    }

    return successResponse(res, {
      exam: normalizedExam,
      subject: normalizedSubject,
      classLevel: classLevel || 'All',
      totalCount: chaptersToReturn.length,
      chapters: chaptersToReturn,
      allChapters: allSubjectChapters,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getExams,
  getSubjects,
  getChapters,
};
