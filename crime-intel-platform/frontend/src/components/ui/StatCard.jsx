import React from 'react';

const StatCard = ({
  title,
  value,
  icon: Icon,
  variant = 'default',
  loading = false,
  trend,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  subtext,
  className = '',
  ...props
}) => {
  const getIconColor = () => {
    switch (variant) {
      case 'solved': return 'var(--accent-green)';
      case 'hotspots': return 'var(--accent-amber)';
      case 'anomaly': return 'var(--accent-red)';
      default: return 'var(--accent-blue)';
    }
  };

  const getTrendColor = () => {
    if (trendDirection === 'up') return 'var(--accent-green)';
    if (trendDirection === 'down') return 'var(--accent-red)';
    return 'var(--text-muted)';
  };

  return (
    <div className={`kpi-card ${className}`} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%', padding: '20px', gap: '12px' }} {...props}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        <h3 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '600', margin: 0 }}>
          {title}
        </h3>
        <div style={{ color: getIconColor(), opacity: 0.8 }}>
          {Icon && <Icon size={16} aria-hidden="true" />}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {loading ? (
          <div className="skeleton-line pulse" style={{ height: '38px', width: '100px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}></div>
        ) : (
          <p style={{ fontSize: '2rem', fontWeight: '700', margin: 0, lineHeight: 1, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
            {value}
          </p>
        )}
      </div>

      {(trend || subtext) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', fontSize: '0.7rem', marginTop: '2px' }}>
          {trend && (
            <span style={{ color: getTrendColor(), fontWeight: '600' }}>
              {trend}
            </span>
          )}
          {subtext && (
            <span style={{ color: 'var(--text-muted)' }}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
