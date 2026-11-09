import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { testService } from '../services/testService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { Clock, CheckCircle, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

export const TestAttempt = () => {
  const { id: testId } = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get('attemptId');
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [test, setTest] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    loadTestData();
  }, [testId]);

  useEffect(() => {
    if (result) return;
    const interval = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [result]);

  const loadTestData = async () => {
    try {
      setLoading(true);
      const data = await testService.getTest(testId);
      setTest(data);
    } catch (err) {
      setError(err.message || 'Failed to load test session.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: option,
    });
  };

  const handleSubmit = async () => {
    if (!window.confirm('Are you ready to submit and grade your test?')) return;

    try {
      setSubmitting(true);
      setError(null);

      // Package answers
      const answersPayload = Object.entries(selectedAnswers).map(([qId, ans]) => ({
        question_id: qId,
        selected_answer: ans,
        time_taken: Math.round(secondsElapsed / (test?.questions?.length || 1)),
      }));

      const res = await testService.completeAttempt(attemptId, answersPayload);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Error occurred while grading test attempt.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner text="Starting assessment session..." />;
  if (!test) return <ErrorAlert message="Assessment details unavailable." />;

  const questions = test.questions || [];
  const currentQ = questions[currentIndex];

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Result view after completion
  if (result) {
    return (
      <div style={{ maxWidth: '680px', margin: '40px auto' }}>
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: 'var(--success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <CheckCircle size={36} />
          </div>

          <h2 style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Assessment Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
            Your test has been graded and wrong answers sent for RAG AI mistake diagnosis.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '16px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-glass)',
            marginBottom: '32px',
          }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Score</p>
              <h3 style={{ fontSize: '1.6rem', color: result.score >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                {result.score}%
              </h3>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Correct</p>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--success)' }}>
                {result.correct_answers} / {result.total_questions}
              </h3>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Diagnosed Mistakes</p>
              <h3 style={{ fontSize: '1.6rem', color: 'var(--danger)' }}>
                {result.wrong_answers}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate('/mistakes')}
              className="btn btn-primary"
            >
              <AlertTriangle size={16} />
              <span>Review Diagnosed Mistakes</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="btn btn-secondary"
            >
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto' }}>
      {/* Top Session Bar */}
      <div className="glass-panel" style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div>
          <span className="badge badge-conceptual" style={{ marginRight: '8px' }}>
            {test.subject}
          </span>
          <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>
            {test.title}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 600 }}>
          <Clock size={18} />
          <span>{formatTime(secondsElapsed)}</span>
        </div>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Question Stepper */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '16px',
      }}>
        {questions.map((q, idx) => {
          const isAnswered = !!selectedAnswers[q.id];
          const isCurrent = idx === currentIndex;
          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: isCurrent
                  ? 'var(--primary)'
                  : isAnswered
                  ? 'rgba(16, 185, 129, 0.25)'
                  : 'var(--bg-elevated)',
                color: isCurrent || isAnswered ? '#ffffff' : 'var(--text-secondary)',
                border: isCurrent ? '2px solid #818cf8' : '1px solid var(--border-subtle)',
                fontWeight: 600,
                fontSize: '0.85rem',
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </button>
          );
        })}
      </div>

      {/* Active Question Box */}
      {currentQ && (
        <div className="glass-panel" style={{ padding: '32px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Question {currentIndex + 1} of {questions.length}
            </span>
            {currentQ.topic && (
              <span className="badge badge-memory">{currentQ.topic}</span>
            )}
          </div>

          <h3 style={{ fontSize: '1.25rem', lineHeight: '1.6', marginBottom: '24px' }}>
            {currentQ.question_text}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(currentQ.options || []).map((opt, optIdx) => {
              const isSelected = selectedAnswers[currentQ.id] === opt;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(currentQ.id, opt)}
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: isSelected
                      ? '2px solid var(--primary)'
                      : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    transition: 'var(--transition-smooth)',
                  }}
                >
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: isSelected ? '6px solid var(--primary)' : '2px solid var(--text-muted)',
                    background: isSelected ? '#ffffff' : 'transparent',
                  }} />
                  <span style={{ fontSize: '0.95rem', color: isSelected ? '#ffffff' : 'var(--text-primary)' }}>
                    {opt}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="btn btn-secondary"
          disabled={currentIndex === 0}
        >
          <ArrowLeft size={16} />
          <span>Previous</span>
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="btn btn-primary"
          >
            <span>Next Question</span>
            <ArrowRight size={16} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            disabled={submitting}
          >
            <CheckCircle size={16} />
            <span>{submitting ? 'Grading & Diagnosing...' : 'Finish & Submit Test'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
