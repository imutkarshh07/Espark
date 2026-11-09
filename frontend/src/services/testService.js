import api from './api';

export const testService = {
  async listTests() {
    const res = await api.get('/tests');
    return res.data;
  },

  async getTest(id) {
    const res = await api.get(`/tests/${id}`);
    return res.data;
  },

  async createTest(testData) {
    const res = await api.post('/tests', testData);
    return res.data;
  },

  async deleteTest(id) {
    const res = await api.delete(`/tests/${id}`);
    return res.data;
  },

  async startAttempt(testId) {
    const res = await api.post(`/tests/${testId}/start`);
    return res.data;
  },

  async submitAnswer(attemptId, { questionId, selectedAnswer, timeTaken }) {
    const res = await api.post(`/attempts/${attemptId}/answers`, {
      question_id: questionId,
      selected_answer: selectedAnswer,
      time_taken: timeTaken,
    });
    return res.data;
  },

  async completeAttempt(attemptId, answers = []) {
    const res = await api.post(`/attempts/${attemptId}/complete`, { answers });
    return res.data;
  },

  async listAttempts() {
    const res = await api.get('/attempts');
    return res.data;
  },

  async getAttempt(id) {
    const res = await api.get(`/attempts/${id}`);
    return res.data;
  },
};
