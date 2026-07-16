import React from 'react';

const Button = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  disabled = false, 
  className = '', 
  type = 'button',
  ...props 
}) => {
  const getStyle = () => {
    const base = {
      padding: '0.4rem 0.8rem',
      borderRadius: '6px',
      fontSize: '0.8rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '1px solid transparent',
      outline: 'none',
      fontFamily: 'inherit',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.4rem'
    };

    if (disabled) {
      return {
        ...base,
        opacity: 0.5,
        cursor: 'not-allowed',
        background: '#1e293b',
        color: '#64748b',
        borderColor: 'rgba(255,255,255,0.04)'
      };
    }

    switch (variant) {
      case 'ghost':
        return {
          ...base,
          background: 'transparent',
          color: 'var(--text-secondary)',
          borderColor: 'rgba(255,255,255,0.06)'
        };
      case 'danger':
        return {
          ...base,
          background: 'rgba(255, 51, 102, 0.1)',
          color: 'var(--accent-red)',
          borderColor: 'rgba(255, 51, 102, 0.2)'
        };
      case 'primary':
      default:
        return {
          ...base,
          background: 'var(--accent-pink)',
          color: '#ffffff',
          borderColor: 'transparent'
        };
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={getStyle()}
      className={`custom-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
