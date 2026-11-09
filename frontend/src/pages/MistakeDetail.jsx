import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { mistakeService } from '../services/mistakeService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { ArrowLeft, Sparkles, CheckCircle, HelpCircle, Lightbulb } from 'lucide-react';

export const MistakeDetail = () => {
  const { id: mistakeId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mistake, setMistake] = useState(null);
  const [selectedPracticeAnswers, setSelectedPracticeAnswers] = useState({});
  const [revealedExplanations, setRevealedExplanations] = useState({});

  useEffect(() => {
    loadMistakeData();
  }, [mistakeId]);

  const loadMistakeData = async () => {
    try {
      setLoading(true);
      const data = await mistakeService.getMistake(mistakeId);
      setMistake(data);
    } catch (err) {
      setError(err.message || 'Failed to load mistake analysis.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner text="Retrieving deep diagnosis and textbook excerpts..." />;
  if (!mistake) return <ErrorAlert message="Mistake record not found." />;

  const question = mistake.questions || {};
  const insight = (mistake.insights && mistake.insights[0]) || {};
  const practiceQuestions = insight.practice_questions || [];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto' }}>
      <button
        onClick={() => navigate('/mistakes')}
        className="btn btn-secondary"
        style={{ padding: '6px 12px', fontSize: '0.85rem', marginBottom: '20px' }}
      >
        <ArrowLeft size={16} />
        <span>Back to Mistakes</span>
      </button>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Header & Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span className={`badge badge-${mistake.category}`} style={{ fontSize: '0.85rem', padding: '4px 12px' }}>
          {mistake.category}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          AI Confidence: {Math.round(mistake.confidence * 100)}%
        </span>
        {question.topic && (
          <span className="badge badge-memory">{question.topic}</span>
        )}
      </div>

      {/* Original Question Card */}
      <div className="glass-panel" style={{ padding: '28px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', lineHeight: '1.5', marginBottom: '20px' }}>
          {question.question_text || 'Original Exam Question'}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '14px',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--bg-glass)',
          marginBottom: '16px',
        }}>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>
              Your Response
            </p>
            <p style={{ color: '#f87171', fontWeight: 600, fontSize: '1rem' }}>
              {mistake.student_answer}
            </p>
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '4px' }}>
              Correct Response
            </p>
            <p style={{ color: '#34d399', fontWeight: 600, fontSize: '1rem' }}>
              {mistake.correct_answer}
            </p>
          </div>
        </div>
      </div>

      {/* AI Diagnosis Panel */}
      <div className="glass-panel" style={{
        padding: '28px',
        marginBottom: '28px',
        borderLeft: '4px solid var(--primary)',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.4) 0%, rgba(17, 24, 39, 0.75) 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#c7d2fe' }}>
          <Sparkles size={20} style={{ color: 'var(--primary)' }} />
          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>AI Cognitive Diagnosis</h3>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Root Cause Pattern
          </h4>
          <p style={{ fontSize: '1rem', color: '#ffffff', marginTop: '4px', lineHeight: '1.5' }}>
            {mistake.reason || insight.diagnosis}
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Concept Breakdown & Explanation
          </h4>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.6' }}>
            {insight.explanation || question.explanation || 'Review fundamental definitions.'}
          </p>
        </div>

        {insight.recommended_action && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <Lightbulb size={18} style={{ color: '#818cf8', flexShrink: 0 }} />
            <p style={{ color: '#e0e7ff', fontSize: '0.88rem', margin: 0 }}>
              <strong>Recommended Action:</strong> {insight.recommended_action}
            </p>
          </div>
        )}
      </div>

      {/* Targeted Practice Questions */}
      {practiceQuestions.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <HelpCircle size={20} style={{ color: 'var(--success)' }} />
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Targeted Practice for Retention</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {practiceQuestions.map((pq, idx) => {
              const selected = selectedPracticeAnswers[pq.id || idx];
              const isRevealed = revealedExplanations[pq.id || idx];

              return (
                <div key={idx} className="glass-panel" style={{ padding: '24px' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Follow-up Drill #{idx + 1}
                  </p>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '16px', lineHeight: '1.5' }}>
                    {pq.question_text}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                    {(pq.options || []).map((opt, optIdx) => {
                      const isChosen = selected === opt;
                      const isCorrect = opt === pq.correct_answer;
                      let bg = 'rgba(255, 255, 255, 0.03)';
                      let border = 'var(--border-subtle)';

                      if (isRevealed) {
                        if (isCorrect) {
                          bg = 'rgba(16, 185, 129, 0.15)';
                          border = 'var(--success)';
                        } else if (isChosen && !isCorrect) {
                          bg = 'rgba(239, 68, 68, 0.15)';
                          border = 'var(--danger)';
                        }
                      } else if (isChosen) {
                        bg = 'rgba(99, 102, 241, 0.15)';
                        border = 'var(--primary)';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => {
                            if (!isRevealed) {
                              setSelectedPracticeAnswers({ ...selectedPracticeAnswers, [pq.id || idx]: opt });
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: bg,
                            border: `1px solid ${border}`,
                            cursor: isRevealed ? 'default' : 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span>{opt}</span>
                          {isRevealed && isCorrect && (
                            <CheckCircle size={16} style={{ color: 'var(--success)' }} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {!isRevealed ? (
                    <button
                      onClick={() => setRevealedExplanations({ ...revealedExplanations, [pq.id || idx]: true })}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                      disabled={!selected}
                    >
                      Check Answer & Explanation
                    </button>
                  ) : (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-glass)',
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)',
                    }}>
                      <strong style={{ color: '#34d399' }}>Explanation:</strong> {pq.explanation || 'Correct conceptual formulation.'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
