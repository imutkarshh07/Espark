import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { BookOpen, AlertCircle, ArrowLeft, Zap } from 'lucide-react';

export const AuthCallback = () => {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function processCallback() {
      try {
        await authService.handleOAuthCallback();
        navigate('/');
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        setError(err.message || 'Failed to complete Google Sign-In.');
        setLoading(false);
      }
    }
    processCallback();
  }, [navigate]);

  const handleDemo = async () => {
    await authService.signInAsDemo();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px 32px',
        textAlign: 'center',
      }}>
        {loading && !error && (
          <>
            <div style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}>
              <BookOpen size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Completing Sign In...</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Verifying credentials with Google & Supabase
            </p>
          </>
        )}

        {error && (
          <>
            <div style={{
              width: '52px',
              height: '52px',
              margin: '0 auto 16px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
            }}>
              <AlertCircle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Authentication Error</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', marginBottom: '24px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={() => navigate('/login')}
                className="btn btn-primary"
                style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <ArrowLeft size={16} /> Back to Sign In
              </button>
              <button
                onClick={handleDemo}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                <Zap size={16} color="#f59e0b" /> Continue as Guest Demo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
