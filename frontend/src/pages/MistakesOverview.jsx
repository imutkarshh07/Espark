import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mistakeService } from '../services/mistakeService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { EmptyState } from '../components/EmptyState';
import { AlertTriangle, ArrowRight, BookOpen, Check, X } from 'lucide-react';

export const MistakesOverview = () => {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMistakes();
  }, [selectedCategory]);

  const loadMistakes = async () => {
    try {
      setLoading(true);
      const data = await mistakeService.listMistakes(selectedCategory);
      setMistakes(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load mistake analytics.');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { key: null, label: 'All Categories' },
    { key: 'conceptual', label: 'Conceptual Gaps' },
    { key: 'careless', label: 'Careless Oversights' },
    { key: 'time_pressure', label: 'Time Pressure' },
    { key: 'memory', label: 'Memory Retention' },
    { key: 'calculation', label: 'Calculation' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Diagnosed Mistakes & Root Causes</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          AI analyzes your wrong answers using RAG retrieval against textbook chapters to detect patterns.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '12px',
        marginBottom: '24px',
      }}>
        {categories.map((cat) => (
          <button
            key={String(cat.key)}
            onClick={() => setSelectedCategory(cat.key)}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              fontWeight: 500,
              background: selectedCategory === cat.key ? 'var(--primary)' : 'var(--bg-card)',
              color: selectedCategory === cat.key ? '#ffffff' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              whiteSpace: 'nowrap',
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Fetching mistake diagnoses..." />
      ) : mistakes.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No Mistakes Logged"
          description="Great job! Take more tests to diagnose tricky patterns and uncover hidden conceptual gaps."
          action={
            <button onClick={() => navigate('/tests')} className="btn btn-primary">
              Take Diagnostic Test
            </button>
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {mistakes.map((m) => {
            const question = m.questions || {};
            const insight = (m.insights && m.insights[0]) || {};

            return (
              <div
                key={m.id}
                className="glass-panel"
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <span className={`badge badge-${m.category}`}>
                      {m.category}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Confidence: {Math.round(m.confidence * 100)}%
                    </span>
                    {question.topic && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        • {question.topic}
                      </span>
                    )}
                  </div>

                  <h3 style={{ fontSize: '1.05rem', marginBottom: '10px', lineHeight: '1.5' }}>
                    {question.question_text || 'Assessment Question'}
                  </h3>

                  <div style={{ display: 'flex', gap: '20px', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <X size={14} /> Student: <strong>{m.student_answer}</strong>
                    </span>
                    <span style={{ color: '#34d399', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Correct: <strong>{m.correct_answer}</strong>
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    <strong>Root Cause:</strong> {m.reason || insight.diagnosis || 'Concept discrepancy detected.'}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/mistakes/${m.id}`)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.85rem', flexShrink: 0 }}
                >
                  <span>Deep Diagnosis</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
