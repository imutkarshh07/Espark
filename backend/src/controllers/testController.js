const testService = require('../services/testService');
const { successResponse } = require('../utils/response');

const listTests = async (req, res, next) => {
  try {
    const tests = await testService.listTests(req.user.id);
    return successResponse(res, tests);
  } catch (err) {
    next(err);
  }
};

const getTest = async (req, res, next) => {
  try {
    const test = await testService.getTest(req.params.id, req.user.id);
    return successResponse(res, test);
  } catch (err) {
    next(err);
  }
};

const createTest = async (req, res, next) => {
  try {
    const test = await testService.createTest(req.user.id, req.body);
    return successResponse(res, test, 201, 'Test created successfully');
  } catch (err) {
    next(err);
  }
};

const deleteTest = async (req, res, next) => {
  try {
    await testService.deleteTest(req.params.id, req.user.id);
    return successResponse(res, null, 200, 'Test deleted successfully');
  } catch (err) {
    next(err);
  }
};

const generateTest = async (req, res, next) => {
  try {
    const test = await testService.generateTest(req.user.id, req.body || {});
    return successResponse(res, test, 201, 'Practice test generated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTests,
  getTest,
  createTest,
  generateTest,
  deleteTest,
};
