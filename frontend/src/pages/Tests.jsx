import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { testService } from '../services/testService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { FileCheck, Plus, Play, Trash2, Clock } from 'lucide-react';

export const Tests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  // Create form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [chapter, setChapter] = useState('');
  const [questions, setQuestions] = useState([
    {
      question_text: '',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      topic: '',
      difficulty: 'medium',
    },
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      setLoading(true);
      const data = await testService.listTests();
      setTests(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load tests.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async (testId) => {
    try {
      const attempt = await testService.startAttempt(testId);
      navigate(`/tests/${testId}/attempt?attemptId=${attempt.id}`);
    } catch (err) {
      setError(err.message || 'Failed to start test attempt.');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    try {
      await testService.deleteTest(testId);
      setTests(tests.filter((t) => t.id !== testId));
    } catch (err) {
      setError(err.message || 'Failed to delete test.');
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      await testService.createTest({
        title,
        subject,
        chapter,
        questions,
      });
      setShowCreateModal(false);
      // Reset
      setTitle('');
      setSubject('');
      setChapter('');
      await loadTests();
    } catch (err) {
      setError(err.message || 'Failed to create test.');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading tests catalog..." />;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
      }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '4px' }}>Diagnostic Tests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Take full-length or chapter-wise tests to evaluate conceptual mastery.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>New Test</span>
        </button>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {tests.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No Tests Available"
          description="Create your first practice test or diagnostic evaluation to start analyzing mistakes."
          action={
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Create Test Now</span>
            </button>
          }
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}>
          {tests.map((t) => (
            <div
              key={t.id}
              className="glass-panel"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <span className="badge badge-conceptual">
                    {t.subject}
                  </span>
                  <button
                    onClick={() => handleDeleteTest(t.id)}
                    style={{ background: 'transparent', color: 'var(--text-muted)' }}
                    title="Delete test"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>{t.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
                  {t.chapter ? `Chapter: ${t.chapter}` : 'Full Subject Assessment'}
                </p>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FileCheck size={14} />
                    <span>{t.total_questions || t.questions?.length || 0} Questions</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={14} />
                    <span>~{(t.total_questions || 5) * 2} mins</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartTest(t.id)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                <Play size={16} />
                <span>Start Test</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating a test */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '32px',
          }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '18px' }}>Create New Assessment</h2>

            <form onSubmit={handleCreateTest}>
              <div className="form-group">
                <label className="form-label">Test Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Kinematics & Mechanics Diagnostic 1"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Physics"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Chapter</label>
                  <input
                    type="text"
                    className="form-input"
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value)}
                    placeholder="e.g. Laws of Motion"
                  />
                </div>
              </div>

              <h4 style={{ fontSize: '1rem', marginTop: '16px', marginBottom: '8px' }}>
                Sample Question #1
              </h4>

              <div className="form-group">
                <label className="form-label">Question Text</label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '70px', resize: 'vertical' }}
                  value={questions[0].question_text}
                  onChange={(e) => {
                    const q = [...questions];
                    q[0].question_text = e.target.value;
                    setQuestions(q);
                  }}
                  placeholder="Enter the question text here..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Option A</label>
                <input
                  type="text"
                  className="form-input"
                  value={questions[0].options[0]}
                  onChange={(e) => {
                    const q = [...questions];
                    q[0].options[0] = e.target.value;
                    setQuestions(q);
                  }}
                  placeholder="Option A"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Option B</label>
                <input
                  type="text"
                  className="form-input"
                  value={questions[0].options[1]}
                  onChange={(e) => {
                    const q = [...questions];
                    q[0].options[1] = e.target.value;
                    setQuestions(q);
                  }}
                  placeholder="Option B"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Correct Answer</label>
                <input
                  type="text"
                  className="form-input"
                  value={questions[0].correct_answer}
                  onChange={(e) => {
                    const q = [...questions];
                    q[0].correct_answer = e.target.value;
                    setQuestions(q);
                  }}
                  placeholder="Must match exactly one option text"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Save & Publish Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
