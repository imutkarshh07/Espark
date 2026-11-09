import React from 'react';

export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      background: 'var(--bg-glass)',
      border: '1px dashed var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
    }}>
      {Icon && (
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '4px',
        }}>
          <Icon size={26} />
        </div>
      )}
      <h3 style={{ fontSize: '1.15rem' }}>{title}</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '400px' }}>
        {description}
      </p>
      {action && <div style={{ marginTop: '8px' }}>{action}</div>}
    </div>
  );
};
