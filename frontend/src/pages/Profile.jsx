import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { ErrorAlert } from '../components/ErrorAlert';
import { User, Save, Check } from 'lucide-react';

export const Profile = () => {
  const { user, profile, refreshProfile } = useAuth();

  const [name, setName] = useState(profile?.name || '');
  const [studentClass, setStudentClass] = useState(profile?.class || '');
  const [exam, setExam] = useState(profile?.exam || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await authService.updateProfile({
        name,
        class: studentClass,
        exam,
      });
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '6px' }}>Student Profile</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Manage your academic targets and personal profile details.
        </p>
      </div>

      <ErrorAlert message={error} onClose={() => setError(null)} />

      {success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(16, 185, 129, 0.12)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          color: '#34d399',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px',
          fontSize: '0.9rem',
        }}>
          <Check size={18} />
          <span>Profile updated successfully!</span>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
          }}>
            <User size={32} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
              {profile?.name || user?.email?.split('@')[0]}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              {user?.email}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Class / Academic Grade</label>
            <input
              type="text"
              className="form-input"
              value={studentClass}
              onChange={(e) => setStudentClass(e.target.value)}
              placeholder="e.g. Class 12, Undergraduate Sophomore"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Target Examination</label>
            <input
              type="text"
              className="form-input"
              value={exam}
              onChange={(e) => setExam(e.target.value)}
              placeholder="e.g. JEE Advanced, NEET, SAT, MCAT, GRE"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Email (Supabase Auth)</label>
            <input
              type="text"
              className="form-input"
              value={user?.email || ''}
              disabled
              style={{ opacity: 0.6, cursor: 'not-allowed' }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: '12px' }}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
