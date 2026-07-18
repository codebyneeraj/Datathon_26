import React, { useState, useEffect } from 'react';
import { Shield, Key, User } from 'lucide-react';

const RoleSwitcher = ({ activeRole, onRoleChange }) => {
  const [activeSession, setActiveSession] = useState(false);

  const roles = [
    { id: 'Investigator', label: 'Investigator', level: 'L1' },
    { id: 'Analyst', label: 'Analyst', level: 'L2' },
    { id: 'Supervisor', label: 'Supervisor', level: 'L3' }
  ];

  // Restore active session state from localStorage on mount
  useEffect(() => {
    const savedRole = localStorage.getItem('active_role');
    if (savedRole) {
      setActiveSession(true);
      onRoleChange(savedRole);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRoleSelect = (roleId) => {
    localStorage.setItem('active_role', roleId);
    setActiveSession(true);
    onRoleChange(roleId);
  };

  const handleClearSession = () => {
    localStorage.removeItem('active_role');
    setActiveSession(false);
    onRoleChange('Investigator');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '240px' }} role="region" aria-label="Console Access Control">
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Shield size={14} style={{ color: 'var(--text-muted)' }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Console Authorization:
        </span>
      </div>

      <div style={{ display: 'flex', background: '#161c28', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '3px', position: 'relative', width: '100%' }}>
        {roles.map((role) => {
          const isSelected = activeRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => handleRoleSelect(role.id)}
              aria-label={`Switch console clearance level to ${role.label}`}
              style={{
                flexGrow: 1,
                background: isSelected ? 'var(--accent-blue)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
            >
              {role.id === 'Supervisor' ? <Shield size={11} /> : role.id === 'Analyst' ? <Key size={11} /> : <User size={11} />}
              {role.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Role: {activeRole} <span style={{ opacity: 0.6 }}>(client-side, unverified)</span>
        </span>
        {activeSession && (
          <button
            onClick={handleClearSession}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
          >
            Clear Session
          </button>
        )}
      </div>
    </div>
  );
};

export default RoleSwitcher;
