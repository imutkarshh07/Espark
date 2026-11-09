import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileCheck, AlertTriangle, FileText, UserCircle } from 'lucide-react';

export const Sidebar = () => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Tests', path: '/tests', icon: FileCheck },
    { label: 'Mistakes', path: '/mistakes', icon: AlertTriangle },
    { label: 'Documents', path: '/documents', icon: FileText },
    { label: 'Profile', path: '/profile', icon: UserCircle },
  ];

  return (
    <aside style={{
      width: '240px',
      borderRight: '1px solid var(--border-subtle)',
      background: 'rgba(11, 15, 25, 0.6)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 16px',
      gap: '8px',
      minHeight: 'calc(100vh - 64px)',
    }}>
      <p style={{
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--text-muted)',
        paddingLeft: '12px',
        marginBottom: '4px',
        fontWeight: 600,
      }}>
        Menu
      </p>

      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.05))' : 'transparent',
              borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
              transition: 'var(--transition-smooth)',
            })}
          >
            <Icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
};
