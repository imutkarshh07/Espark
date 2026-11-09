import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { testService } from '../services/testService';
import { mistakeService } from '../services/mistakeService';
import { documentService } from '../services/documentService';
import { StatCard } from '../components/StatCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorAlert';
import { 
  FileCheck, 
  AlertTriangle, 
  FileText, 
  Award, 
  ArrowRight, 
  Upload, 
  PlayCircle 
} from 'lucide-react';

export const Dashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [mistakes, setMistakes] = useState([]);
  const [documents, setDocuments] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [attData, misData, docData] = await Promise.all([
        testService.listAttempts().catch(() => []),
        mistakeService.listMistakes().catch(() => []),
        documentService.listDocuments().catch(() => []),
      ]);

      setAttempts(attData || []);
      setMistakes(misData || []);
      setDocuments(docData || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Aggregating performance insights..." />;
  }

  // Calculate metrics
  const completedAttempts = attempts.filter((a) => a.completed_at);
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((acc, curr) => acc + parseFloat(curr.score || 0), 0) / completedAttempts.length)
    : 0;

  // Group mistakes by category
  const categoryCounts = {
    conceptual: mistakes.filter((m) => m.category === 'conceptual').length,
    careless: mistakes.filter((m) => m.category === 'careless').length,
    time_pressure: mistakes.filter((m) => m.category === 'time_pressure').length,
    memory: mistakes.filter((m) => m.category === 'memory').length,
    calculation: mistakes.filter((m) => m.category === 'calculation').length,
  };

  return (
    <div>
      <ErrorAlert message={error} onClose={() => setError(null)} />

      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '28px 32px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)',
      }}>
        <div>
          <span className="badge badge-conceptual" style={{ marginBottom: '8px' }}>
            Target: {profile?.exam || 'Exam Preparation'}
          </span>
          <h1 style={{ fontSize: '1.85rem', marginTop: '6px' }}>
            Hello, {profile?.name || user?.email?.split('@')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Track weak areas, diagnose mistake patterns, and practice with RAG study context.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => navigate('/tests')}
            className="btn btn-primary"
          >
            <PlayCircle size={16} />
            <span>Take a Test</span>
          </button>
          <button
            onClick={() => navigate('/documents')}
            className="btn btn-secondary"
          >
            <Upload size={16} />
            <span>Upload Notes</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '32px',
      }}>
        <StatCard
          title="Tests Completed"
          value={completedAttempts.length}
          subtitle={`Out of ${attempts.length} started`}
          icon={FileCheck}
          color="#6366f1"
        />
        <StatCard
          title="Average Score"
          value={`${avgScore}%`}
          subtitle="Across all evaluations"
          icon={Award}
          color="#10b981"
        />
        <StatCard
          title="Total Mistakes"
          value={mistakes.length}
          subtitle="Diagnosed by AI"
          icon={AlertTriangle}
          color="#f59e0b"
        />
        <StatCard
          title="Knowledge PDFs"
          value={documents.length}
          subtitle="Indexed in ChromaDB"
          icon={FileText}
          color="#8b5cf6"
        />
      </div>

      {/* Analytics & Category Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
        marginBottom: '32px',
      }}>
        {/* Mistake Distribution */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Mistake Pattern Distribution</h3>
            <button
              onClick={() => navigate('/mistakes')}
              style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { key: 'conceptual', label: 'Conceptual Gaps', count: categoryCounts.conceptual, color: 'var(--cat-conceptual)' },
              { key: 'careless', label: 'Careless Oversights', count: categoryCounts.careless, color: 'var(--cat-careless)' },
              { key: 'time_pressure', label: 'Time Pressure', count: categoryCounts.time_pressure, color: 'var(--cat-time)' },
              { key: 'memory', label: 'Memory Retention', count: categoryCounts.memory, color: 'var(--cat-memory)' },
              { key: 'calculation', label: 'Calculation / Arithmetic', count: categoryCounts.calculation, color: 'var(--cat-calc)' },
            ].map((cat) => {
              const pct = mistakes.length > 0 ? Math.round((cat.count / mistakes.length) * 100) : 0;
              return (
                <div key={cat.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.label}</span>
                    <span style={{ fontWeight: 600 }}>{cat.count} ({pct}%)</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: cat.color,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Attempts */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem' }}>Recent Test Attempts</h3>
            <button
              onClick={() => navigate('/tests')}
              style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Tests Catalog</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {completedAttempts.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', textAlign: 'center', padding: '28px 0' }}>
              No completed tests yet. Start a test to view performance analytics!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {completedAttempts.slice(0, 4).map((att) => (
                <div
                  key={att.id}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-glass)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <h4 style={{ fontSize: '0.92rem', marginBottom: '2px' }}>
                      {att.tests?.title || 'Diagnostic Evaluation'}
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {att.tests?.subject || 'Subject'} • {new Date(att.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: att.score >= 70 ? 'var(--success)' : att.score >= 40 ? 'var(--warning)' : 'var(--danger)',
                    }}>
                      {att.score}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
