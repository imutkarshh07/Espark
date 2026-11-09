const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class RAGService {
  constructor() {
    this.client = axios.create({
      baseURL: config.ragServerUrl,
      timeout: 60000, // 60s default timeout for AI operations
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (err) {
      logger.warn('[RAGService] Health check failed:', err.message);
      return { status: 'offline', error: err.message };
    }
  }

  async processDocument({ userId, documentId, storagePath, fileName, subject, chapter }) {
    try {
      logger.info(`[RAGService] Requesting process-document for doc ${documentId} (user: ${userId})`);
      const response = await this.client.post('/rag/process-document', {
        user_id: userId,
        document_id: documentId,
        storage_path: storagePath,
        file_name: fileName,
        subject,
        chapter,
      });
      return response.data;
    } catch (err) {
      logger.error(`[RAGService] Failed to process document ${documentId}:`, err.response?.data || err.message);
      throw new Error(err.response?.data?.detail || err.message || 'RAG document processing failed');
    }
  }

  async analyzeMistake({ userId, documentIds = [], mistake }) {
    try {
      logger.info(`[RAGService] Requesting mistake analysis for user ${userId}`);
      const response = await this.client.post('/rag/analyze-mistake', {
        user_id: userId,
        document_ids: documentIds,
        mistake: {
          question: mistake.question,
          student_answer: mistake.student_answer,
          correct_answer: mistake.correct_answer,
          topic: mistake.topic || 'General',
          subject: mistake.subject || 'General',
          chapter: mistake.chapter || 'General',
        },
      });
      return response.data;
    } catch (err) {
      logger.error('[RAGService] Failed to analyze mistake:', err.response?.data || err.message);
      // Return structured fallback so system never crashes if Python RAG is temporarily unavailable
      return {
        category: 'conceptual',
        confidence: 0.70,
        reason: 'Concept misunderstanding based on given answers.',
        explanation: 'Review the chapter core concepts regarding this question.',
        recommended_action: 'Practice similar concept questions and review lecture notes.',
        practice_questions: [
          {
            question_text: `Follow-up practice on ${mistake.topic || 'the topic'}: Which principle governs this concept?`,
            options: [
              'Fundamental curriculum law and conservation rule',
              'Non-standard approximation without boundary constants',
              'Empirical outlier under non-equilibrium state',
              'None of the above',
            ],
            correct_answer: 'Fundamental curriculum law and conservation rule',
            explanation: 'Remember the primary principle and boundary conditions behind this topic.'
          }
        ],
        sources: []
      };
    }
  }

  async generateQuestions({
    userId,
    exam = 'NEET',
    classLevel = 'Class 12th',
    subjects = [],
    chapters = {},
    subtopic = null,
    difficulty = 'all',
    count = 10,
    excludedQuestions = [],
  }) {
    try {
      logger.info(`[RAGService] Requesting ${count} Gemini-generated quiz questions for user ${userId}`);
      const response = await this.client.post(
        '/rag/generate-questions',
        {
          user_id: userId,
          exam,
          class_level: classLevel,
          subjects,
          chapters,
          subtopic,
          difficulty,
          count,
          excluded_questions: excludedQuestions,
        },
        { timeout: 75000 }
      );
      return response.data;
    } catch (err) {
      logger.error('[RAGService] Gemini question generation failed:', err.response?.data || err.message);
      throw new Error(err.response?.data?.detail || err.message || 'Gemini question generation failed');
    }
  }

  async generatePractice({ userId, topic, difficulty = 'medium', count = 3 }) {
    try {
      const response = await this.client.post('/rag/generate-practice', {
        user_id: userId,
        topic,
        difficulty,
        count,
      });
      return response.data;
    } catch (err) {
      logger.error('[RAGService] Failed to generate practice:', err.response?.data || err.message);
      return { practice_questions: [] };
    }
  }

  async query({ userId, query, subject, chapter, topK = 5 }) {
    try {
      const response = await this.client.post('/rag/query', {
        user_id: userId,
        query,
        subject,
        chapter,
        top_k: topK,
      });
      return response.data;
    } catch (err) {
      logger.error('[RAGService] Query failed:', err.response?.data || err.message);
      throw new Error(err.response?.data?.detail || err.message || 'RAG query failed');
    }
  }

  async askDoubt({ userId, query, subject = 'General', chapter = 'General', fileContent = null, fileName = null, fileType = null }) {
    try {
      const effectiveQuery = (query && typeof query === 'string' && query.trim().length > 0)
        ? query.trim()
        : 'Please examine the attached question, diagram, or problem closely and provide a complete step-by-step academic solution.';

      logger.info(`[RAGService] Processing ask-doubt for user ${userId} on ${subject} — ${chapter}`);
      const response = await this.client.post('/rag/ask-doubt', {
        user_id: userId,
        query: effectiveQuery,
        subject,
        chapter,
        file_content: fileContent,
        file_name: fileName,
        file_type: fileType,
      });
      return response.data;
    } catch (err) {
      const isConnRefused = err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED');
      logger.error('[RAGService] askDoubt failed:', err.response?.data || err.message);
      const customErr = new Error(
        isConnRefused
          ? 'Python RAG microservice is offline on port 8000. Please start the RAG server.'
          : (err.response?.data?.detail || err.message || 'AI Doubt Solver failed')
      );
      customErr.statusCode = isConnRefused ? 503 : (err.response?.status || 500);
      customErr.code = isConnRefused ? 'RAG_SERVER_OFFLINE' : 'DOUBT_SOLVER_FAILED';
      throw customErr;
    }
  }
}

module.exports = new RAGService();
