const insightRepository = require('../repositories/insightRepository');

class InsightService {
  async listInsights(userId) {
    return await insightRepository.getByUser(userId);
  }

  async getInsight(id, userId) {
    const insight = await insightRepository.getById(id, userId);
    if (!insight) {
      const err = new Error('Insight not found or access denied.');
      err.statusCode = 404;
      err.code = 'INSIGHT_NOT_FOUND';
      throw err;
    }
    return insight;
  }
}

module.exports = new InsightService();
