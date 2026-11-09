const request = require('supertest');
const app = require('../src/app');

// Mock repositories to test authorization boundary without live external database
jest.mock('../src/repositories/documentRepository', () => ({
  getById: jest.fn(async (id, userId) => {
    if (id === 'doc-user-b' && userId === 'user-a') {
      return null; // Document belongs to user B, user A receives null
    }
    if (id === 'doc-user-b' && userId === 'user-b') {
      return { id: 'doc-user-b', user_id: 'user-b', file_name: 'private_user_b.pdf' };
    }
    return null;
  }),
}));

jest.mock('../src/repositories/attemptRepository', () => ({
  getById: jest.fn(async (id, userId) => {
    if (id === 'attempt-user-b' && userId === 'user-a') {
      return null;
    }
    if (id === 'attempt-user-b' && userId === 'user-b') {
      return { id: 'attempt-user-b', user_id: 'user-b', score: 95.0 };
    }
    return null;
  }),
}));

jest.mock('../src/repositories/mistakeRepository', () => ({
  getById: jest.fn(async (id, userId) => {
    if (id === 'mistake-user-b' && userId === 'user-a') {
      return null;
    }
    if (id === 'mistake-user-b' && userId === 'user-b') {
      return { id: 'mistake-user-b', user_id: 'user-b', category: 'conceptual' };
    }
    return null;
  }),
}));

jest.mock('../src/repositories/insightRepository', () => ({
  getById: jest.fn(async (id, userId) => {
    if (id === 'insight-user-b' && userId === 'user-a') {
      return null;
    }
    if (id === 'insight-user-b' && userId === 'user-b') {
      return { id: 'insight-user-b', user_id: 'user-b', diagnosis: 'Deep insight' };
    }
    return null;
  }),
}));

describe('Security & Multi-Tenant Isolation', () => {
  const tokenUserA = 'Bearer mock-token-user-a';
  const tokenUserB = 'Bearer mock-token-user-b';

  it('User A must NEVER be able to access User B document', async () => {
    const res = await request(app)
      .get('/api/documents/doc-user-b')
      .set('Authorization', tokenUserA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
  });

  it('User B can successfully access their own document', async () => {
    const res = await request(app)
      .get('/api/documents/doc-user-b')
      .set('Authorization', tokenUserB);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('doc-user-b');
  });

  it('User A must NEVER be able to access User B attempt', async () => {
    const res = await request(app)
      .get('/api/attempts/attempt-user-b')
      .set('Authorization', tokenUserA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ATTEMPT_NOT_FOUND');
  });

  it('User A must NEVER be able to access User B mistake', async () => {
    const res = await request(app)
      .get('/api/mistakes/mistake-user-b')
      .set('Authorization', tokenUserA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MISTAKE_NOT_FOUND');
  });

  it('User A must NEVER be able to access User B insight', async () => {
    const res = await request(app)
      .get('/api/insights/insight-user-b')
      .set('Authorization', tokenUserA);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INSIGHT_NOT_FOUND');
  });
});
