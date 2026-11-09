const attemptService = require('../services/attemptService');
const { successResponse } = require('../utils/response');

const listAttempts = async (req, res, next) => {
  try {
    const attempts = await attemptService.listAttempts(req.user.id);
    return successResponse(res, attempts);
  } catch (err) {
    next(err);
  }
};

const getAttempt = async (req, res, next) => {
  try {
    const attempt = await attemptService.getAttempt(req.params.id, req.user.id);
    return successResponse(res, attempt);
  } catch (err) {
    next(err);
  }
};

const startAttempt = async (req, res, next) => {
  try {
    const attempt = await attemptService.startAttempt(req.user.id, req.params.id);
    return successResponse(res, attempt, 201, 'Test attempt started');
  } catch (err) {
    next(err);
  }
};

const submitAnswer = async (req, res, next) => {
  try {
    const answer = await attemptService.recordAnswer(req.user.id, req.params.id, req.body);
    return successResponse(res, answer, 200, 'Answer recorded');
  } catch (err) {
    next(err);
  }
};

const completeAttempt = async (req, res, next) => {
  try {
    const result = await attemptService.completeAttempt(
      req.user.id,
      req.params.id,
      req.body.answers || []
    );
    return successResponse(res, result, 200, 'Attempt completed and graded');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAttempts,
  getAttempt,
  startAttempt,
  submitAnswer,
  completeAttempt,
};
