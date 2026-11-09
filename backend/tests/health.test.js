const request = require('supertest');
const app = require('../src/app');

describe('Health Endpoints', () => {
  it('GET / should return 200 with online status', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
  });

  it('GET /api/health should return standardized status object', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('online');
    expect(res.body.data.version).toBe('1.0.0');
  });
});
