import React from 'react';
import Button from './Button';
import { AlertTriangle, FolderOpen } from 'lucide-react';

const Card = ({
  title,
  subtitle,
  children,
  headerActions,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyMessage = "No records discovered in this viewport.",
  className = '',
  style = {},
  ...props
}) => {
  return (
    <div 
      className={`dashboard-card ${className}`} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        ...style 
      }} 
      {...props}
    >
      {(title || subtitle || headerActions) && (
        <div className="card-header" style={{ marginBottom: '1.25rem' }}>
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {headerActions && <div style={{ display: 'flex', gap: '0.5rem' }}>{headerActions}</div>}
        </div>
      )}

      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', height: '100%', minHeight: '150px' }}>
            <div className="skeleton-line pulse" style={{ height: '24px', width: '60%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}></div>
            <div className="skeleton-line pulse" style={{ height: '100px', width: '100%', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', flexGrow: 1 }}></div>
          </div>
        ) : error ? (
          <div className="error-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px', padding: '1.5rem', textAlign: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} style={{ color: 'var(--accent-red)', opacity: 0.8 }} aria-hidden="true" />
            <h4 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--accent-red)' }}>Request Failure</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
              {error.message || 'An error occurred while loading this analysis.'}
            </p>
            {onRetry && (
              <Button variant="danger" onClick={onRetry} style={{ marginTop: '0.5rem' }}>
                Retry Query
              </Button>
            )}
          </div>
        ) : empty ? (
          <div className="empty-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '150px', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <FolderOpen size={28} style={{ opacity: 0.4, marginBottom: '0.5rem' }} aria-hidden="true" />
            <p style={{ fontSize: '0.85rem' }}>{emptyMessage}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default Card;
