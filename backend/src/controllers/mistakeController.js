const mistakeService = require('../services/mistakeService');
const { successResponse } = require('../utils/response');

const listMistakes = async (req, res, next) => {
  try {
    const category = req.query.category || null;
    const mistakes = await mistakeService.listMistakes(req.user.id, category);
    return successResponse(res, mistakes);
  } catch (err) {
    next(err);
  }
};

const getMistake = async (req, res, next) => {
  try {
    const mistake = await mistakeService.getMistake(req.params.id, req.user.id);
    return successResponse(res, mistake);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listMistakes,
  getMistake,
};
