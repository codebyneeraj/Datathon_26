import React, { useState, useEffect } from 'react';
import { Shield, Key, User } from 'lucide-react';

const RoleSwitcher = ({ activeRole, onRoleChange }) => {
  const [authenticating, setAuthenticating] = useState(false);
  const [sessionToken, setSessionToken] = useState(null);

  const roles = [
    { id: 'Investigator', label: 'Investigator', level: 'L1' },
    { id: 'Analyst', label: 'Analyst', level: 'L2' },
    { id: 'Supervisor', label: 'Supervisor', level: 'L3' }
  ];

  // Retrieve mock token from storage if present on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setSessionToken(token);
    }
  }, []);

  const handleRoleSelect = (roleId) => {
    setAuthenticating(true);
    
    // Simulate network authentication delay (500ms)
    setTimeout(() => {
      const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mockSession.${roleId}.${Math.floor(Date.now() / 1000)}`;
      localStorage.setItem('auth_token', fakeToken);
      localStorage.setItem('auth_role', roleId);
      
      setSessionToken(fakeToken);
      onRoleChange(roleId);
      setAuthenticating(false);
    }, 500000 / 1000000 + 400); // 400ms delay looks organic
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    setSessionToken(null);
    onRoleChange('Investigator'); // Fallback to lowest clearance
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', minWidth: '240px' }} role="region" aria-label="Console Access Control">
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
        <Shield size={14} className="pulse" style={{ color: sessionToken ? 'var(--accent-green)' : 'var(--text-muted)' }} />
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
              disabled={authenticating}
              aria-label={`Switch console clearance level to ${role.label}`}
              style={{
                flexGrow: 1,
                background: isSelected ? 'var(--accent-pink)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: authenticating ? 'not-allowed' : 'pointer',
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
        <span>
          {authenticating ? (
            <span style={{ color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              <span className="pulse">●</span> Validating JWT Clearance...
            </span>
          ) : sessionToken ? (
            <span style={{ color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              ✓ Session Token Authenticated
            </span>
          ) : (
            <span style={{ color: 'var(--accent-red)' }}>⚠️ Unauthorized - Local Cache Only</span>
          )}
        </span>
        {sessionToken && (
          <button 
            onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.7rem', textDecoration: 'underline' }}
          >
            Clear Session
          </button>
        )}
      </div>
    </div>
  );
};

export default RoleSwitcher;
