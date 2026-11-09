import api from './api';

export const mistakeService = {
  async listMistakes(category = null) {
    const url = category ? `/mistakes?category=${category}` : '/mistakes';
    const res = await api.get(url);
    return res.data;
  },

  async getMistake(id) {
    const res = await api.get(`/mistakes/${id}`);
    return res.data;
  },

  async listInsights() {
    const res = await api.get('/insights');
    return res.data;
  },

  async getInsight(id) {
    const res = await api.get(`/insights/${id}`);
    return res.data;
  },
};
