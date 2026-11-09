const express = require('express');
const healthRoutes = require('./healthRoutes');
const profileRoutes = require('./profileRoutes');
const documentRoutes = require('./documentRoutes');
const testRoutes = require('./testRoutes');
const attemptRoutes = require('./attemptRoutes');
const mistakeRoutes = require('./mistakeRoutes');
const insightRoutes = require('./insightRoutes');
const ragRoutes = require('./ragRoutes');
const authRoutes = require('./authRoutes');
const curriculumRoutes = require('./curriculumRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const focusRoutes = require('./focusRoutes');
const supportRoutes = require('./supportRoutes');

const apiRouter = express.Router();

apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/profile', profileRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/tests', testRoutes);
apiRouter.use('/attempts', attemptRoutes);
apiRouter.use('/mistakes', mistakeRoutes);
apiRouter.use('/insights', insightRoutes);
apiRouter.use('/rag', ragRoutes);
apiRouter.use('/curriculum', curriculumRoutes);
apiRouter.use('/leaderboard', leaderboardRoutes);
apiRouter.use('/focus', focusRoutes);
apiRouter.use('/support', supportRoutes);

module.exports = apiRouter;
