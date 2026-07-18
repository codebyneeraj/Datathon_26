import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({ 
  value, 
  onChange, 
  options = [], 
  placeholder = 'Select option...', 
  style = {}, 
  buttonStyle = {},
  menuStyle = {},
  className = '',
  disabled = false,
  icon: Icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getOptionValue = (opt) => (typeof opt === 'object' && opt !== null ? opt.value : opt);
  const getOptionLabel = (opt) => (typeof opt === 'object' && opt !== null ? opt.label : opt);
  const getOptionColor = (opt) => (typeof opt === 'object' && opt !== null && opt.color ? opt.color : null);
  const getOptionDotColor = (opt) => (typeof opt === 'object' && opt !== null && opt.dotColor ? opt.dotColor : null);

  const selectedOption = options.find(opt => getOptionValue(opt) === value);
  const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : (value || placeholder);
  const selectedColor = selectedOption ? getOptionColor(selectedOption) : null;
  const selectedDotColor = selectedOption ? getOptionDotColor(selectedOption) : null;

  const handleSelect = (optVal) => {
    if (disabled) return;
    onChange(optVal);
    setIsOpen(false);
  };

  return (
    <div 
      ref={containerRef} 
      className={`custom-select-container ${className}`}
      style={{ 
        position: 'relative', 
        display: 'inline-block', 
        width: style.width || 'auto',
        ...style 
      }}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          width: '100%',
          padding: '6px 12px',
          background: 'rgba(15, 19, 24, 0.9)',
          border: isOpen 
            ? '1px solid var(--accent-blue)' 
            : selectedColor 
              ? `1px solid ${selectedColor}55` 
              : '1px solid var(--card-border)',
          borderRadius: '6px',
          color: selectedColor || 'var(--text-primary)',
          fontSize: '0.72rem',
          fontWeight: '700',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'all 0.15s ease',
          boxShadow: isOpen ? '0 0 0 2px rgba(127, 191, 91, 0.15)' : 'none',
          opacity: disabled ? 0.6 : 1,
          ...buttonStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {Icon && <Icon size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
          {selectedDotColor && (
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: selectedDotColor, flexShrink: 0 }} />
          )}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel}
          </span>
        </div>
        <ChevronDown 
          size={13} 
          style={{ 
            color: selectedColor || 'var(--text-muted)', 
            transition: 'transform 0.2s ease', 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            flexShrink: 0
          }} 
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: '280px',
            zIndex: 99999,
            background: '#13181E',
            border: '1px solid var(--card-border-hover)',
            borderRadius: '6px',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.05)',
            padding: '4px',
            maxHeight: '220px',
            overflowY: 'auto',
            backdropFilter: 'blur(12px)',
            animation: 'fadeIn 0.12s ease-out',
            ...menuStyle
          }}
        >
          {options.map((opt, idx) => {
            const optVal = getOptionValue(opt);
            const optLabel = getOptionLabel(opt);
            const optColor = getOptionColor(opt);
            const optDotColor = getOptionDotColor(opt);
            const isSelected = optVal === value;

            return (
              <div
                key={optVal || idx}
                onClick={() => handleSelect(optVal)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  padding: '7px 10px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: optColor || (isSelected ? 'var(--text-primary)' : 'var(--text-secondary)'),
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  transition: 'background 0.12s ease, color 0.12s ease',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {optDotColor && (
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: optDotColor, flexShrink: 0 }} />
                  )}
                  <span>{optLabel}</span>
                </div>
                {isSelected && (
                  <Check size={12} style={{ color: optColor || 'var(--accent-blue)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
