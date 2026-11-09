const mistakeRepository = require('../repositories/mistakeRepository');

class MistakeService {
  async listMistakes(userId, category = null) {
    return await mistakeRepository.getByUser(userId, category);
  }

  async getMistake(id, userId) {
    const mistake = await mistakeRepository.getById(id, userId);
    if (!mistake) {
      const err = new Error('Mistake record not found or access denied.');
      err.statusCode = 404;
      err.code = 'MISTAKE_NOT_FOUND';
      throw err;
    }
    return mistake;
  }
}

module.exports = new MistakeService();
