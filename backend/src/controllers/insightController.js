const insightService = require('../services/insightService');
const { successResponse } = require('../utils/response');

const listInsights = async (req, res, next) => {
  try {
    const insights = await insightService.listInsights(req.user.id);
    return successResponse(res, insights);
  } catch (err) {
    next(err);
  }
};

const getInsight = async (req, res, next) => {
  try {
    const insight = await insightService.getInsight(req.params.id, req.user.id);
    return successResponse(res, insight);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInsights,
  getInsight,
};
