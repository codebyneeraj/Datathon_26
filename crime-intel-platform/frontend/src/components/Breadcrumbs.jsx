import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ activeDistrict, activeOffenderName, onResetDistrict, onResetOffender }) => {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: '0.5rem' }}>
      <ol className="breadcrumbs">
        <li className="breadcrumb-item">
          <button onClick={() => { onResetDistrict(); onResetOffender(); }} aria-label="Navigate back to State View">
            <Home size={14} style={{ marginRight: '0.25rem' }} />
            State View
          </button>
        </li>
        
        {activeDistrict && (
          <li className="breadcrumb-item">
            <ChevronRight size={14} aria-hidden="true" />
            <button 
              onClick={onResetOffender} 
              className={!activeOffenderName ? 'active' : ''}
              disabled={!activeOffenderName}
              aria-current={!activeOffenderName ? 'page' : undefined}
            >
              District: {activeDistrict}
            </button>
          </li>
        )}

        {activeOffenderName && (
          <li className="breadcrumb-item active" aria-current="page">
            <ChevronRight size={14} aria-hidden="true" />
            <span>Offender: {activeOffenderName}</span>
          </li>
        )}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
