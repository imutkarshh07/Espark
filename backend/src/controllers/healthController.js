const config = require('../config');
const ragService = require('../services/ragService');
const { supabaseAdminClient } = require('../config/supabase');
const { successResponse } = require('../utils/response');

const getHealth = async (req, res, next) => {
  try {
    const ragHealth = await ragService.checkHealth();
    let dbStatus = 'disconnected';
    if (config.supabase.url) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000));
        const { error } = await Promise.race([
          supabaseAdminClient.from('profiles').select('id').limit(1),
          timeoutPromise,
        ]);
        dbStatus = error ? 'in-memory-fallback' : 'connected';
      } catch (dbErr) {
        dbStatus = 'in-memory-fallback';
      }
    }

    return successResponse(res, {
      status: 'online',
      version: '1.0.0',
      environment: config.env,
      services: {
        backend: 'online',
        database: dbStatus,
        ragServer: ragHealth.status === 'ok' ? 'online' : (ragHealth.status || 'offline'),
      },
      ragDetails: ragHealth.status === 'ok' ? { model: ragHealth.model, vectorStore: ragHealth.vector_store } : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getHealth,
};
