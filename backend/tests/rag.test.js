const request = require('supertest');
const app = require('../src/app');
const ragService = require('../src/services/ragService');

describe('AI doubt validation', () => {
  it('rejects requests without a question or attachment', async () => {
    const response = await request(app)
      .post('/api/rag/ask-doubt')
      .send({ query: ' ' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.message).toContain('Enter a question or attach');
  });

  it('rejects unsupported attachment types before forwarding upstream', async () => {
    const response = await request(app)
      .post('/api/rag/ask-doubt')
      .send({
        query: 'Read this file',
        file_content: 'aGVsbG8=',
        file_type: 'text/plain',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('AI doubt upstream errors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    [502, 502, 'The AI service gateway is temporarily unavailable. Please try again.'],
    [503, 503, 'The AI service is temporarily unavailable. Please try again.'],
    [504, 504, 'The AI service took too long to respond. Please try again.'],
  ])('preserves a useful error for upstream HTTP %i', async (upstreamStatus, status, message) => {
    jest.spyOn(ragService.client, 'post').mockRejectedValue({
      response: { status: upstreamStatus, data: {} },
    });

    await expect(ragService.askDoubt({
      userId: 'student-1',
      query: 'Explain osmosis',
    })).rejects.toMatchObject({ statusCode: status, message });
  });

  it('maps connection failures to an unavailable service error', async () => {
    jest.spyOn(ragService.client, 'post').mockRejectedValue({ code: 'ECONNREFUSED' });

    await expect(ragService.askDoubt({
      userId: 'student-1',
      query: 'Explain osmosis',
    })).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_SERVICE_UNAVAILABLE',
    });
  });

  it('maps AI provider rate limits to a retryable service error', async () => {
    jest.spyOn(ragService.client, 'post').mockRejectedValue({
      response: { status: 429, data: {} },
    });

    await expect(ragService.askDoubt({
      userId: 'student-1',
      query: 'Explain osmosis',
    })).rejects.toMatchObject({
      statusCode: 503,
      code: 'AI_PROVIDER_RATE_LIMITED',
      message: 'The AI service is busy. Please try again shortly.',
    });
  });
});
