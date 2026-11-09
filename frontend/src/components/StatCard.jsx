import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, color = 'var(--primary)' }) => {
  return (
    <div className="glass-panel" style={{
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      transition: 'transform 0.2s ease, border-color 0.2s ease',
    }}>
      <div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, marginBottom: '6px' }}>
          {title}
        </p>
        <h3 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>
          {value}
        </h3>
        {subtitle && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '4px' }}>
            {subtitle}
          </p>
        )}
      </div>
      {Icon && (
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-md)',
          background: `rgba(${color === 'var(--primary)' ? '99, 102, 241' : '16, 185, 129'}, 0.12)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}>
          <Icon size={24} />
        </div>
      )}
    </div>
  );
};
