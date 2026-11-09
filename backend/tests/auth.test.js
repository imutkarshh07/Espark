const request = require('supertest');
const app = require('../src/app');

// Mock profileRepository so test doesn't fail on network or invalid key in test mode
jest.mock('../src/repositories/profileRepository', () => ({
  getById: jest.fn(async (id) => ({
    id,
    name: 'Test User',
    class: '12th',
    exam: 'JEE',
  })),
  upsert: jest.fn(async (data) => data),
  update: jest.fn(async (id, data) => ({ id, ...data })),
}));

describe('Auth Middleware & Token Verification', () => {
  it('should return 401 when Authorization header is missing on protected route', async () => {
    const res = await request(app).get('/api/profile');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when token does not start with Bearer', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Basic 123456');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should allow access with valid authenticated token in test environment', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer mock-token-user-123');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('user-123');
  });

  it('should reject POST /api/auth/google-sync without authorization token', async () => {
    const res = await request(app)
      .post('/api/auth/google-sync')
      .send({ exam: 'NEET' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should successfully synchronize Google user on POST /api/auth/google-sync', async () => {
    const res = await request(app)
      .post('/api/auth/google-sync')
      .set('Authorization', 'Bearer mock-token-google-student-456')
      .send({ exam: 'NEET', class: 'Class 12th' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe('google-student-456');
    expect(res.body.data.profile).toBeDefined();
  });
});
