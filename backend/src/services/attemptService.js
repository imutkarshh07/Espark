const attemptRepository = require('../repositories/attemptRepository');
const testRepository = require('../repositories/testRepository');
const mistakeRepository = require('../repositories/mistakeRepository');
const insightRepository = require('../repositories/insightRepository');
const ragService = require('./ragService');
const logger = require('../utils/logger');

function checkIsCorrect(selectedAnswer, question) {
  if (!selectedAnswer || !question) return false;
  const cleanSel = String(selectedAnswer).replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase();
  const cleanCorr = String(question.correct_answer || '').replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase();

  if (cleanSel.length > 0 && cleanSel === cleanCorr) return true;

  // Check if correct_answer is a letter (A, B, C, D) corresponding to the selected option
  const options = Array.isArray(question.options) ? question.options : [];
  const letters = ['a', 'b', 'c', 'd', 'e'];
  const selIndex = options.findIndex((opt) => String(opt).replace(/\s*\(Correct\)\s*/gi, '').trim().toLowerCase() === cleanSel);

  if (selIndex >= 0) {
    const selLetter = letters[selIndex];
    if (
      cleanCorr === selLetter ||
      cleanCorr === `option ${selLetter}` ||
      cleanCorr === `(${selLetter})` ||
      cleanCorr === `${selLetter}.` ||
      cleanCorr === `${selLetter})`
    ) {
      return true;
    }
  }

  // Check term match (if option has format Term: Definition)
  const selTerm = cleanSel.includes(':') ? cleanSel.split(':')[0].trim() : cleanSel;
  const corrTerm = cleanCorr.includes(':') ? cleanCorr.split(':')[0].trim() : cleanCorr;
  if (selTerm === cleanCorr || cleanSel === corrTerm || (selTerm && corrTerm && selTerm === corrTerm)) {
    return true;
  }

  // Strip leading option letter (e.g. "A. ..." vs "...")
  const strippedSel = cleanSel.replace(/^[a-e]\s*[.):-]\s*/i, '').trim();
  const strippedCorr = cleanCorr.replace(/^[a-e]\s*[.):-]\s*/i, '').trim();
  if (strippedSel && strippedCorr && strippedSel === strippedCorr) {
    return true;
  }

  return false;
}

class AttemptService {
  async listAttempts(userId) {
    return await attemptRepository.getByUser(userId);
  }

  async getAttempt(id, userId) {
    const attempt = await attemptRepository.getById(id, userId);
    if (!attempt) {
      const err = new Error('Attempt not found or access denied.');
      err.statusCode = 404;
      err.code = 'ATTEMPT_NOT_FOUND';
      throw err;
    }
    return attempt;
  }

  async startAttempt(userId, testId) {
    // Verify test exists and belongs to user
    const test = await testRepository.getById(testId, userId);
    if (!test) {
      const err = new Error('Test not found or access denied.');
      err.statusCode = 404;
      err.code = 'TEST_NOT_FOUND';
      throw err;
    }

    return await attemptRepository.create(userId, testId);
  }

  async recordAnswer(userId, attemptId, { questionId, selectedAnswer, timeTaken = 0 }) {
    const attempt = await this.getAttempt(attemptId, userId);
    
    // Find the question to determine correctness
    const test = await testRepository.getById(attempt.test_id, userId);
    const question = test.questions.find((q) => q.id === questionId);
    
    if (!question) {
      const err = new Error('Question not found in this test.');
      err.statusCode = 404;
      err.code = 'QUESTION_NOT_FOUND';
      throw err;
    }

    const isCorrect = checkIsCorrect(selectedAnswer, question);

    return await attemptRepository.recordAnswer(
      attemptId,
      questionId,
      selectedAnswer,
      isCorrect,
      timeTaken
    );
  }

  async completeAttempt(userId, attemptId, submittedAnswers = []) {
    const attempt = await this.getAttempt(attemptId, userId);
    const test = await testRepository.getById(attempt.test_id, userId);
    const questions = test?.questions || [];

    // 1. Process batch submitted answers with resilient string comparison
    const answerMap = new Map();
    if (Array.isArray(submittedAnswers) && submittedAnswers.length > 0) {
      for (const ans of submittedAnswers) {
        if (!ans || !ans.question_id) continue;
        const question = questions.find((q) => q.id === ans.question_id);
        const isCorrect = checkIsCorrect(ans.selected_answer, question);

        answerMap.set(ans.question_id, {
          question_id: ans.question_id,
          selected_answer: ans.selected_answer,
          is_correct: isCorrect,
          time_taken: ans.time_taken || 0,
          question,
        });

        await attemptRepository.recordAnswer(
          attemptId,
          ans.question_id,
          ans.selected_answer,
          isCorrect,
          ans.time_taken || 0
        );
      }
    }

    // Refresh attempt to ensure all answers are captured
    const refreshedAttempt = await attemptRepository.getById(attemptId, userId);
    const recordedAnswers = refreshedAttempt.answers || [];
    for (const ans of recordedAnswers) {
      if (ans && ans.question_id && !answerMap.has(ans.question_id)) {
        const question = questions.find((q) => q.id === ans.question_id) || ans.questions;
        answerMap.set(ans.question_id, {
          ...ans,
          question,
        });
      }
    }

    // 2. Compute accurate score
    let correctCount = 0;
    const wrongAnswers = [];

    for (const item of answerMap.values()) {
      if (item.is_correct) {
        correctCount += 1;
      } else if (item.question) {
        wrongAnswers.push(item);
      }
    }

    const totalQuestions = Math.max(questions.length, answerMap.size, 1);
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);

    // Save final score in DB
    await attemptRepository.completeAttempt(attemptId, scorePercentage);

    // 3. Process wrong answers with parallelized Gemini RAG Analysis
    // Prioritize top 3 mistakes for live AI RAG analysis to ensure response is fast (< 6s)
    const priorityWrong = wrongAnswers.slice(0, 3);
    const remainingWrong = wrongAnswers.slice(3);

    const diagnoseItemWithAI = async (item) => {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('AI analysis timeout (8s)')), 8000)
        );

        const ragDiagnosis = await Promise.race([
          ragService.analyzeMistake({
            userId,
            mistake: {
              question: item.question.question_text,
              student_answer: item.selected_answer,
              correct_answer: item.question.correct_answer,
              topic: item.question.topic || test.subject,
              subject: test.subject,
              chapter: test.chapter,
            },
          }),
          timeoutPromise,
        ]);

        const mistakeRecord = await mistakeRepository.create({
          user_id: userId,
          attempt_id: attemptId,
          question_id: item.question.id,
          category: ragDiagnosis.category || 'conceptual',
          reason: ragDiagnosis.reason || `Discrepancy in ${item.question.topic || test.subject}.`,
          student_answer: item.selected_answer,
          correct_answer: item.question.correct_answer,
          confidence: ragDiagnosis.confidence || 0.88,
        });

        const insightRecord = await insightRepository.create(
          {
            user_id: userId,
            mistake_id: mistakeRecord.id,
            diagnosis: ragDiagnosis.reason || `Conceptual gap in ${item.question.topic || test.subject}`,
            explanation: ragDiagnosis.explanation || item.question.explanation || 'Review topic rules.',
            recommended_action: ragDiagnosis.recommended_action || `Review ${item.question.topic || test.chapter} textbook sections.`,
          },
          ragDiagnosis.practice_questions || []
        );

        mistakeRecord.insight = insightRecord;
        return mistakeRecord;
      } catch (err) {
        logger.warn(`[AttemptService] Using fast curriculum fallback for question ${item.question.id}: ${err.message}`);
        const mistakeRecord = await mistakeRepository.create({
          user_id: userId,
          attempt_id: attemptId,
          question_id: item.question.id,
          category: 'conceptual',
          reason: `Misunderstanding on ${item.question.topic || test.subject}.`,
          student_answer: item.selected_answer,
          correct_answer: item.question.correct_answer,
          confidence: 0.85,
        });

        const insightRecord = await insightRepository.create(
          {
            user_id: userId,
            mistake_id: mistakeRecord.id,
            diagnosis: `Core Concept Gap: ${item.question.topic || test.chapter || 'Chapter Topic'}`,
            explanation: item.question.explanation || 'Review foundational definitions and formulas for this chapter.',
            recommended_action: `Review lecture notes on ${item.question.topic || test.chapter} and practice related problem sets.`,
          },
          [
            {
              question_text: `Follow-up drill on ${item.question.topic || test.subject}: What is the foundational rule for this concept?`,
              options: [
                item.question.correct_answer,
                'Empirical observation under non-equilibrium states',
                'Alternative formulation without boundary condition',
                'None of the above',
              ],
              correct_answer: item.question.correct_answer,
              explanation: item.question.explanation,
            },
          ]
        );

        mistakeRecord.insight = insightRecord;
        return mistakeRecord;
      }
    };

    // Execute priority diagnoses concurrently in parallel
    const prioritySettled = await Promise.allSettled(priorityWrong.map((item) => diagnoseItemWithAI(item)));
    const generatedMistakes = [];

    for (const res of prioritySettled) {
      if (res.status === 'fulfilled' && res.value) {
        generatedMistakes.push(res.value);
      }
    }

    // Process any remaining mistakes instantly so response time is immediate
    for (const item of remainingWrong) {
      if (!item.question) continue;
      try {
        const mistakeRecord = await mistakeRepository.create({
          user_id: userId,
          attempt_id: attemptId,
          question_id: item.question.id,
          category: 'conceptual',
          reason: `Discrepancy in ${item.question.topic || test.subject}.`,
          student_answer: item.selected_answer,
          correct_answer: item.question.correct_answer,
          confidence: 0.80,
        });

        const insightRecord = await insightRepository.create(
          {
            user_id: userId,
            mistake_id: mistakeRecord.id,
            diagnosis: `Concept Review: ${item.question.topic || test.chapter}`,
            explanation: item.question.explanation || 'Review chapter theorems and standard formulas.',
            recommended_action: `Revisit ${item.question.topic || test.chapter} summary notes.`,
          },
          []
        );
        mistakeRecord.insight = insightRecord;
        generatedMistakes.push(mistakeRecord);
      } catch (err) {
        logger.error(`[AttemptService] Additional mistake save error:`, err.message);
      }
    }

    return {
      attempt_id: attemptId,
      score: scorePercentage,
      total_questions: totalQuestions,
      correct_answers: correctCount,
      wrong_answers: totalQuestions - correctCount,
      mistakes: generatedMistakes,
    };
  }
}

module.exports = new AttemptService();
