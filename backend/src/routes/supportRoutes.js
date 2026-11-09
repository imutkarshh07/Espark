const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { successResponse } = require('../utils/response');

const router = express.Router();
router.use(authMiddleware);

// Store support tickets and reports
const supportTickets = [];
const problemReports = [];

router.get('/faq', async (req, res, next) => {
  try {
    const faqCategories = [
      {
        id: 'account',
        title: 'Account & Security',
        questions: [
          { q: 'How do I change my target exam or class?', a: 'Go to Profile > Edit Profile and select your updated exam (NEET, JEE, CBSE) and class.' },
          { q: 'Can I use Google / Gmail to sign in?', a: 'Yes, tap "Continue with Google" on the login screen for instant authenticated access.' },
        ],
      },
      {
        id: 'ai_doubts',
        title: 'AI Doubt Solver',
        questions: [
          { q: 'How does the AI solve my doubts?', a: 'Your doubt is processed through our ChromaDB RAG vector engine which retrieves relevant NCERT and textbook chapters before Gemini synthesizes the step-by-step solution.' },
          { q: 'Can I upload files or question images?', a: 'Yes, tap the attachment button in AI Doubt Solver to attach a PDF document or question screenshot.' },
        ],
      },
      {
        id: 'practice',
        title: 'Practice & Questions',
        questions: [
          { q: 'How are practice questions generated?', a: 'Questions are selected specifically for your target exam and chapter, progressing from Easy (30%) to Medium (50%) to Hard (20%).' },
          { q: 'What is the minimum question count?', a: 'You can practice 10, 15, 20, 25, or 30 questions per session.' },
        ],
      },
      {
        id: 'focus_mode',
        title: 'Focus Mode',
        questions: [
          { q: 'Why are there no questions in Focus Mode?', a: 'Focus Mode is designed purely for distraction-free deep work and pomodoro sessions. Practice questions belong in the Practice tab.' },
          { q: 'How does the app allowlist work?', a: 'You can configure emergency phone and messaging access plus up to 3 selected study utilities while blocking entertainment apps.' },
        ],
      },
      {
        id: 'leaderboard',
        title: 'Leaderboard & Streaks',
        questions: [
          { q: 'How is my leaderboard rank calculated?', a: 'Rankings are updated based on verified study hours and completed focus sessions across Weekly, Monthly, and All-Time leaderboards.' },
          { q: 'How do I maintain my streak?', a: 'Complete at least one valid focus session (25+ minutes) or chapter practice test daily.' },
        ],
      },
      {
        id: 'theme',
        title: 'Theme & Display',
        questions: [
          { q: 'How do I toggle Dark Mode?', a: 'In the More / System screen, select Theme and switch between Light Mode, Dark Mode, or System Default.' },
        ],
      },
    ];

    return successResponse(res, { categories: faqCategories });
  } catch (err) {
    next(err);
  }
});

router.post('/ticket', async (req, res, next) => {
  try {
    const { subject, message, priority = 'normal' } = req.body;
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Message cannot be empty.' } });
    }

    const ticket = {
      id: `tkt-${Date.now()}`,
      user_id: req.user.id,
      user_email: req.user.email || 'student@example.com',
      subject: subject || 'General Query',
      message: message.trim(),
      priority,
      status: 'received',
      created_at: new Date().toISOString(),
    };
    supportTickets.push(ticket);

    return successResponse(res, ticket, 201, 'Support ticket submitted successfully. Our academic advisors will review it.');
  } catch (err) {
    next(err);
  }
});

router.post('/report', async (req, res, next) => {
  try {
    const { category = 'UI Bug', description, questionId, attachment } = req.body;
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Problem description is required.' } });
    }

    const report = {
      id: `rep-${Date.now()}`,
      user_id: req.user.id,
      category,
      description: description.trim(),
      question_id: questionId || null,
      attachment_url: attachment || null,
      status: 'submitted',
      created_at: new Date().toISOString(),
    };
    problemReports.push(report);

    return successResponse(res, report, 201, 'Problem report logged successfully. Thank you for improving Study Insights!');
  } catch (err) {
    next(err);
  }
});

module.exports = router;
