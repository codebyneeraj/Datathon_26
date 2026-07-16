import React from 'react';

const RoleSwitcher = ({ activeRole, onRoleChange }) => {
  const roles = [
    { id: 'Investigator', label: 'Investigator', desc: 'Case tracking & offender profiles' },
    { id: 'Analyst', label: 'Analyst', desc: 'DBSCAN hotspots & correlation models' },
    { id: 'Supervisor', label: 'Supervisor', desc: 'Socioeconomic risk & audit logging' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>
          Console Access:
        </span>
        <div style={{ display: 'flex', background: '#121620', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px' }}>
          {roles.map((role) => {
            const isSelected = activeRole === role.id;
            return (
              <button
                key={role.id}
                onClick={() => onRoleChange(role.id)}
                style={{
                  background: isSelected ? 'var(--accent-pink)' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                {role.label}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        Active: {roles.find(r => r.id === activeRole)?.desc}
      </div>
    </div>
  );
};

export default RoleSwitcher;
