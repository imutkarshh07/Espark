import api from './api';

export interface TestAttemptAnswer {
  question_id: string;
  selected_answer: string;
  time_taken?: number;
}

export const studyService = {
  // Health
  async checkHealth() {
    const res: any = await api.get('/health');
    return res.data;
  },

  // Profile
  async getProfile() {
    const res: any = await api.get('/profile');
    return res.data;
  },

  async updateProfile(updates: { name?: string; class?: string; exam?: string }) {
    const res: any = await api.patch('/profile', updates);
    return res.data;
  },

  // Tests
  async listTests() {
    const res: any = await api.get('/tests');
    return res.data;
  },

  async getTest(id: string) {
    const res: any = await api.get(`/tests/${id}`);
    return res.data;
  },

  async startAttempt(testId: string) {
    const res: any = await api.post(`/tests/${testId}/start`);
    return res.data;
  },

  async submitAnswer(attemptId: string, payload: { questionId: string; selectedAnswer: string; timeTaken?: number }) {
    const res: any = await api.post(`/attempts/${attemptId}/answers`, {
      question_id: payload.questionId,
      selected_answer: payload.selectedAnswer,
      time_taken: payload.timeTaken || 0,
    });
    return res.data;
  },

  async completeAttempt(attemptId: string, answers: TestAttemptAnswer[] = []) {
    const res: any = await api.post(`/attempts/${attemptId}/complete`, { answers });
    return res.data;
  },

  // Attempts
  async listAttempts() {
    const res: any = await api.get('/attempts');
    return res.data;
  },

  async getAttempt(id: string) {
    const res: any = await api.get(`/attempts/${id}`);
    return res.data;
  },

  // Mistakes & Insights
  async listMistakes(category?: string | null) {
    const url = category ? `/mistakes?category=${category}` : '/mistakes';
    const res: any = await api.get(url);
    return res.data;
  },

  async getMistake(id: string) {
    const res: any = await api.get(`/mistakes/${id}`);
    return res.data;
  },

  async listInsights() {
    const res: any = await api.get('/insights');
    return res.data;
  },

  async getInsight(id: string) {
    const res: any = await api.get(`/insights/${id}`);
    return res.data;
  },

  // RAG Microservice Direct Queries
  async askRAG(query: string, subject = 'Biology', chapter?: string) {
    const res: any = await api.post('/rag/query', { query, subject, chapter });
    return res.data;
  },

  async analyzeMistakeWithRAG(mistake: {
    question: string;
    student_answer: string;
    correct_answer: string;
    topic?: string;
    subject?: string;
    chapter?: string;
  }) {
    const res: any = await api.post('/rag/analyze-mistake', {
      question: mistake.question,
      student_answer: mistake.student_answer,
      correct_answer: mistake.correct_answer,
      topic: mistake.topic,
      subject: mistake.subject,
      chapter: mistake.chapter,
    });
    return res.data;
  },

  // Documents
  async listDocuments() {
    const res: any = await api.get('/documents');
    return res.data;
  },

  // AI Doubt Solver with File Upload (RAG + ChromaDB + Gemini)
  async askAIDoubt(payload: {
    query: string;
    subject?: string;
    chapter?: string;
    fileContent?: string | null;
    fileName?: string | null;
    fileType?: string | null;
  }) {
    const res: any = await api.post('/rag/ask-doubt', {
      query: payload.query,
      subject: payload.subject || 'General',
      chapter: payload.chapter || 'General',
      file_content: payload.fileContent || null,
      file_name: payload.fileName || null,
      file_type: payload.fileType || null,
    }, { timeout: 120000 });
    return res.data;
  },

  // Dynamic Curriculum
  async getCurriculumExams() {
    const res: any = await api.get('/curriculum/exams');
    return res.data;
  },

  async getCurriculumSubjects(exam: string) {
    const res: any = await api.get(`/curriculum/subjects?exam=${encodeURIComponent(exam)}`);
    return res.data;
  },

  async getCurriculumChapters(exam: string, subject: string, classLevel?: string) {
    let url = `/curriculum/chapters?exam=${encodeURIComponent(exam)}&subject=${encodeURIComponent(subject)}`;
    if (classLevel && classLevel !== 'All') {
      url += `&classLevel=${encodeURIComponent(classLevel)}`;
    }
    const res: any = await api.get(url);
    return res.data;
  },

  // Chapter-Specific & Multi-Subject Practice Test Generation
  async generateChapterTest(payload: {
    exam: string;
    classLevel?: string;
    subject?: string;
    subjects?: string[];
    chapter?: string;
    chapters?: Record<string, string>;
    subtopic?: string;
    difficulty?: 'easy' | 'medium' | 'tough' | 'all';
    count?: number;
    durationMinutes?: number;
  }) {
    const res: any = await api.post('/tests/generate', {
      exam: payload.exam,
      classLevel: payload.classLevel || 'Class 12th',
      subject: payload.subject,
      subjects: payload.subjects,
      chapter: payload.chapter,
      chapters: payload.chapters,
      subtopic: payload.subtopic,
      difficulty: payload.difficulty || 'all',
      count: payload.count || 10,
      durationMinutes: payload.durationMinutes,
    });
    return res.data;
  },

  // Leaderboard (Today, Weekly, Monthly)
  async getLeaderboard(period: 'today' | 'weekly' | 'monthly' | 'all_time' = 'today') {
    const res: any = await api.get(`/leaderboard?period=${period}`);
    return res.data;
  },

  // Record custom study activity (quiz, doubt, revision, drill)
  async recordStudyActivity(payload: {
    type: string;
    points: number;
    durationSeconds?: number;
    subject?: string;
    chapter?: string;
    title?: string;
  }) {
    const res: any = await api.post('/leaderboard/activity', payload);
    return res.data;
  },

  // Focus Mode Productivity Sessions
  async recordFocusSession(payload: {
    durationSeconds?: number;
    durationMinutes?: number;
    subject?: string;
    timerOption?: string;
    completed?: boolean;
  }) {
    const seconds = payload.durationSeconds ?? (payload.durationMinutes ? payload.durationMinutes * 60 : 1500);
    const res: any = await api.post('/focus/sessions', {
      durationSeconds: seconds,
      durationMinutes: payload.durationMinutes ?? Math.round(seconds / 60),
      subject: payload.subject || 'Deep Study',
      timerOption: payload.timerOption || '25m',
      completed: payload.completed ?? true,
    });
    return res.data;
  },

  async getFocusStats() {
    const res: any = await api.get('/focus/stats');
    return res.data;
  },

  // System & Support
  async getFaqCategories() {
    const res: any = await api.get('/support/faq');
    return res.data;
  },

  async submitSupportTicket(payload: { subject?: string; message: string }) {
    const res: any = await api.post('/support/ticket', payload);
    return res.data;
  },

  async submitProblemReport(payload: { category: string; description: string; questionId?: string; attachment?: string }) {
    const res: any = await api.post('/support/report', payload);
    return res.data;
  },

  async reportProblem(payload: { category: string; description: string; questionId?: string; attachment?: string }) {
    return this.submitProblemReport(payload);
  },
};
