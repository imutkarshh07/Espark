const { supabaseAdminClient } = require('../config/supabase');
const inMemoryStore = require('./inMemoryStore');
const logger = require('../utils/logger');

// Removes duplicate questions based on lowercase, trimmed question text
function removeDuplicateQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  const seen = new Set();

  return questions.filter((question) => {
    if (!question) return false;
    const raw = question.question || question.question_text || question.text || '';
    const key = String(raw).trim().toLowerCase();

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

class TestRepository {
  async getByUser(userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('tests')
        .select('*, questions(count)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) return data;
    } catch (err) {
      logger.warn(`[TestRepository] Falling back to in-memory store: ${err.message}`);
    }
    // Return all tests available to this user (or global defaults)
    return inMemoryStore.tests.filter((t) => t.user_id === userId || !t.user_id || t.user_id === '00000000-0000-0000-0000-000000000001');
  }

  async getSeenQuestionTexts(userId) {
    const seen = new Set();
    try {
      // 1. Collect from in-memory tests
      for (const t of inMemoryStore.tests) {
        if (t.user_id === userId && Array.isArray(t.questions)) {
          for (const q of t.questions) {
            if (q && q.question_text) seen.add(q.question_text.trim());
          }
        }
      }

      // 2. Collect from Supabase if configured
      const { data: userTests, error: testErr } = await supabaseAdminClient
        .from('tests')
        .select('id')
        .eq('user_id', userId);

      if (!testErr && userTests && userTests.length > 0) {
        const testIds = userTests.map((t) => t.id);
        const { data: qs, error: qErr } = await supabaseAdminClient
          .from('questions')
          .select('question_text')
          .in('test_id', testIds);

        if (!qErr && qs && qs.length > 0) {
          for (const q of qs) {
            if (q && q.question_text) seen.add(q.question_text.trim());
          }
        }
      }
    } catch (err) {
      logger.warn(`[TestRepository] Notice while fetching seen question texts: ${err.message}`);
    }
    return Array.from(seen);
  }

  async getById(id, userId = null) {
    try {
      let query = supabaseAdminClient
        .from('tests')
        .select('*, questions(*)')
        .eq('id', id);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();
      if (!error && data) {
        if (Array.isArray(data.questions)) {
          data.questions = removeDuplicateQuestions(data.questions);
        }
        return data;
      }
    } catch (err) {
      logger.warn(`[TestRepository] Falling back to in-memory store for test ${id}: ${err.message}`);
    }
    const found = inMemoryStore.tests.find((t) => t.id === id);
    if (found) {
      if (userId && found.user_id && found.user_id !== userId && found.user_id !== '00000000-0000-0000-0000-000000000001') {
        return null;
      }
      if (Array.isArray(found.questions)) {
        found.questions = removeDuplicateQuestions(found.questions);
      }
      return found;
    }
    return null;
  }

  async create(testData, questions = []) {
    const uniqueQuestions = removeDuplicateQuestions(questions);

    try {
      const { data: test, error: testError } = await supabaseAdminClient
        .from('tests')
        .insert([
          {
            user_id: testData.user_id,
            title: testData.title,
            subject: testData.subject,
            chapter: testData.chapter || null,
            total_questions: uniqueQuestions.length,
          },
        ])
        .select()
        .single();

      if (!testError && test) {
        if (uniqueQuestions && uniqueQuestions.length > 0) {
          const questionRecords = uniqueQuestions.map((q) => ({
            test_id: test.id,
            question_text: q.question_text || q.question || q.text,
            options: q.options || [],
            correct_answer: q.correct_answer,
            explanation: q.explanation || null,
            topic: q.topic || null,
            difficulty: q.difficulty || 'medium',
          }));

          const { data: insertedQuestions, error: qError } = await supabaseAdminClient
            .from('questions')
            .insert(questionRecords)
            .select();

          if (!qError) {
            test.questions = removeDuplicateQuestions(insertedQuestions);
            return test;
          }
        } else {
          test.questions = [];
          return test;
        }
      }
    } catch (err) {
      logger.warn(`[TestRepository] Falling back to in-memory store for create: ${err.message}`);
    }

    const newTest = {
      id: `test-${Date.now()}`,
      user_id: testData.user_id,
      title: testData.title,
      subject: testData.subject,
      chapter: testData.chapter || null,
      exam: testData.exam || null,
      total_questions: uniqueQuestions.length,
      created_at: new Date().toISOString(),
      questions: uniqueQuestions.map((q, idx) => ({
        id: `q-${Date.now()}-${idx}`,
        question_text: q.question_text || q.question || q.text,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || null,
        topic: q.topic || null,
        difficulty: q.difficulty || 'medium',
      })),
    };
    inMemoryStore.tests.push(newTest);
    return newTest;
  }

  async delete(id, userId) {
    try {
      const { data, error } = await supabaseAdminClient
        .from('tests')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (!error && data) return data;
    } catch (err) {
      logger.warn(`[TestRepository] Falling back to in-memory delete: ${err.message}`);
    }
    const idx = inMemoryStore.tests.findIndex((t) => t.id === id);
    if (idx !== -1) {
      return inMemoryStore.tests.splice(idx, 1)[0];
    }
    return null;
  }
}

module.exports = new TestRepository();
