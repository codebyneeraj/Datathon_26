import React from 'react';

const Badge = ({ 
  level = 'low', 
  children, 
  className = '', 
  ...props 
}) => {
  const getBadgeStyle = () => {
    const base = {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '0.2rem 0.5rem',
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.025em',
      gap: '0.3rem'
    };

    switch (level.toLowerCase()) {
      case 'high':
        return {
          ...base,
          background: 'rgba(255, 51, 102, 0.1)',
          color: 'var(--accent-red)',
          border: '1px solid rgba(255, 51, 102, 0.2)'
        };
      case 'medium':
      case 'warn':
        return {
          ...base,
          background: 'rgba(255, 170, 0, 0.1)',
          color: 'var(--accent-amber)',
          border: '1px solid rgba(255, 170, 0, 0.2)'
        };
      case 'low':
      case 'success':
      default:
        return {
          ...base,
          background: 'rgba(0, 204, 102, 0.1)',
          color: 'var(--accent-green)',
          border: '1px solid rgba(0, 204, 102, 0.2)'
        };
    }
  };

  return (
    <span style={getBadgeStyle()} className={`badge-ui ${className}`} {...props}>
      {children || level.toUpperCase()}
    </span>
  );
};

export default Badge;
