import React, { useState, useEffect } from 'react';
import { api } from '../api';
import CustomSelect from './CustomSelect';
import { 
  Shield, Check, X, ShieldAlert, Search, AlertCircle, 
  Clock, MoreVertical, ChevronLeft, ChevronRight, Filter 
} from 'lucide-react';

const STATUS_CLEARANCE_OPTIONS = [
  { value: 'Under Investigation', label: 'UNDER INVESTIGATION', color: 'var(--accent-red)', dotColor: 'var(--accent-red)' },
  { value: 'Charge Sheeted', label: 'CHARGE SHEETED', color: 'var(--accent-amber)', dotColor: 'var(--accent-amber)' },
  { value: 'Solved', label: 'SOLVED', color: 'var(--accent-green)', dotColor: 'var(--accent-green)' }
];

const DISTRICT_FILTER_OPTIONS = [
  { value: 'All', label: 'All Districts' },
  { value: 'Bengaluru', label: 'Bengaluru' },
  { value: 'Hubli-Dharwad', label: 'Hubli-Dharwad' },
  { value: 'Mysuru', label: 'Mysuru' },
  { value: 'Belagavi', label: 'Belagavi' },
  { value: 'Mangaluru', label: 'Mangaluru' },
  { value: 'Kalaburagi', label: 'Kalaburagi' },
  { value: 'Davanagere', label: 'Davanagere' },
  { value: 'Ballari', label: 'Ballari' },
  { value: 'Vijayapura', label: 'Vijayapura' },
  { value: 'Shivamogga', label: 'Shivamogga' }
];

const INITIAL_REQUESTS = [
  {
    id: "REQ-4029",
    timestamp: "2026-07-17 11:05:14",
    operator: "Investigator-J3",
    target: "Suresh Naik (Accused #2)",
    request_type: "L2 Accused Link Network Render",
    priority: "MEDIUM",
    status: "Pending"
  },
  {
    id: "REQ-4030",
    timestamp: "2026-07-17 12:12:45",
    operator: "Analyst-08",
    target: "District Risk Model Predict Run",
    request_type: "L3 Supervisor Simulation Run",
    priority: "HIGH",
    status: "Pending"
  },
  {
    id: "REQ-4027",
    timestamp: "2026-07-17 09:30:00",
    operator: "Investigator-88",
    target: "Ramesh Kumar (Accused #1)",
    request_type: "L2 Accused Link Network Render",
    priority: "MEDIUM",
    status: "Approved"
  }
];

const ClearanceView = ({ 
  activeDistrict, 
  activeRole, 
  onAddAuditLog, 
  onRefreshKPIs 
}) => {
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [incidents, setIncidents] = useState([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [incidentsError, setIncidentsError] = useState(null);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(activeDistrict || 'All');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // UI Status Toast
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  // Sync selected district with parent focus district
  useEffect(() => {
    if (activeDistrict) {
      setSelectedDistrict(activeDistrict);
    }
  }, [activeDistrict]);

  // Fetch incidents
  const fetchIncidents = () => {
    setIncidentsLoading(true);
    setIncidentsError(null);
    const queryDist = selectedDistrict === 'All' ? null : selectedDistrict;
    
    api.getIncidents(queryDist, 100)
      .then(data => {
        setIncidents(data || []);
        setIncidentsLoading(false);
        setCurrentPage(1); // Reset page on filter change
      })
      .catch(err => {
        console.error("Error loading incidents:", err);
        setIncidentsError(err);
        setIncidentsLoading(false);
      });
  };

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict]);

  // Handle request approval/rejection
  const handleRequestAction = (reqId, action) => {
    if (activeRole !== 'Supervisor') {
      showToast("Access Denied: L3 Supervisor Clearance level required to approve credentials.", "error");
      return;
    }

    setRequests(prev => prev.map(req => {
      if (req.id === reqId) {
        if (onAddAuditLog) {
          onAddAuditLog(
            req.target,
            `Clearance Request ${action.toUpperCase()}: ${req.request_type}`
          );
        }
        return { ...req, status: action === 'approve' ? 'Approved' : 'Declined' };
      }
      return req;
    }));

    showToast(`Request ${reqId} successfully ${action === 'approve' ? 'approved' : 'declined'}.`, "success");
  };

  // Handle incident status update
  const handleUpdateStatus = (incidentId, newStatus) => {
    api.updateIncidentStatus(incidentId, newStatus)
      .then(() => {
        showToast(`Incident #${incidentId} status updated to ${newStatus}.`, "success");
        fetchIncidents();
        if (onRefreshKPIs) {
          onRefreshKPIs();
        }
        if (onAddAuditLog) {
          onAddAuditLog(`Incident #${incidentId}`, `Status changed to ${newStatus}`);
        }
      })
      .catch(err => {
        console.error("Error updating incident:", err);
        showToast("Update failed: Could not write status to database.", "error");
      });
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Filter incidents locally by search term
  const filteredIncidents = incidents.filter(inc => {
    const term = searchTerm.toLowerCase();
    return (
      inc.id.toString().includes(term) ||
      inc.crime_type.toLowerCase().includes(term) ||
      inc.station.toLowerCase().includes(term) ||
      (inc.mo_tags && inc.mo_tags.toLowerCase().includes(term))
    );
  });

  // Paginated Incidents
  const totalIncidents = filteredIncidents.length;
  const totalPages = Math.ceil(totalIncidents / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentIncidents = filteredIncidents.slice(indexOfFirstItem, indexOfLastItem);

  // Dynamic Access Request Counts
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const declinedCount = requests.filter(r => r.status === 'Declined').length;
  const totalRequestsCount = requests.length + 9; // baseline count of 12 as per mock mock-up

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Toast Alert */}
      {toastMessage && (
        <div 
          style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            zIndex: 10000, 
            background: toastType === 'error' ? 'var(--accent-red)' : toastType === 'info' ? 'var(--accent-amber)' : 'var(--accent-blue)', 
            color: '#fff', 
            padding: '10px 16px', 
            borderRadius: '6px', 
            fontSize: '0.8rem', 
            fontWeight: '600', 
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'pulse-ring 1s'
          }}
        >
          {toastType === 'error' ? <ShieldAlert size={14} /> : <AlertCircle size={14} />}
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)} 
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '8px', fontWeight: 'bold' }}
          >
            ×
          </button>
        </div>
      )}

      {/* Screen Header */}
      <div>
        <h2 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Shield size={20} style={{ color: 'var(--accent-blue)' }} />
          Clearance Credentials & Alerts Control
        </h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
          Manage intelligence access requests and monitor regional crime clearances
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.7fr', gap: '24px', alignItems: 'stretch' }}>
        
        {/* Left Column: Security Access Queue */}
        <section aria-label="Security Access Request Queue" style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              borderRadius: '8px', 
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column', 
              height: '100%'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  System Clearance Requests
                </h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Security approvals queued from command terminals</span>
              </div>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--accent-amber)' }}>
                {pendingCount} PENDING REQUESTS
              </span>
            </div>

            {/* Requests List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flexGrow: 1, overflowY: 'auto', marginBottom: '20px' }}>
              {requests.map(req => (
                <div 
                  key={req.id} 
                  style={{ 
                    border: '1px solid var(--card-border)', 
                    background: 'rgba(255,255,255,0.01)', 
                    borderRadius: '6px', 
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)' }}>{req.id}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                        PRIORITY <span style={{ color: req.priority === 'HIGH' ? '#b87474' : '#b49b78', fontWeight: '700' }}>{req.priority}</span>
                      </span>
                      <span 
                        style={{ 
                          fontSize: '0.65rem', 
                          fontWeight: '700', 
                          textTransform: 'uppercase', 
                          border: `1px solid ${req.status === 'Approved' ? 'rgba(127, 191, 91, 0.25)' : req.status === 'Declined' ? 'rgba(214, 92, 92, 0.25)' : 'rgba(214, 161, 61, 0.25)'}`,
                          color: req.status === 'Approved' ? '#a5d66a' : req.status === 'Declined' ? '#d65c5c' : '#d6a13d',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'rgba(0,0,0,0.15)'
                        }}
                      >
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>Operator: <span style={{ color: 'var(--text-primary)' }}>{req.operator}</span></div>
                    <div>Request: <span style={{ color: 'var(--text-primary)' }}>{req.request_type}</span></div>
                    <div>Target Scope: <span style={{ color: 'var(--text-primary)' }}>{req.target}</span></div>
                  </div>

                  {req.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'approve')}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.65rem', 
                          fontWeight: '700',
                          flexGrow: 1, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(127, 191, 91, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(127, 191, 91, 0.4)';
                          e.currentTarget.style.color = '#a5d66a';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        <Check size={12} />
                        APPROVE ACCESS
                      </button>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'reject')}
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.65rem', 
                          fontWeight: '700',
                          width: '100px',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          gap: '6px',
                          background: 'rgba(255,255,255,0.01)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          color: 'var(--text-secondary)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(214, 92, 92, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(214, 92, 92, 0.4)';
                          e.currentTarget.style.color = '#d65c5c';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.01)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        <X size={12} />
                        DECLINE
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Grid Stats */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '8px', 
                borderTop: '1px solid var(--card-border)', 
                paddingTop: '16px' 
              }}
            >
              {/* Stat 1: Total */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px' }}>
                <Shield size={14} style={{ color: 'var(--text-muted)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{String(totalRequestsCount).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Total Requests</span>
                </div>
              </div>

              {/* Stat 2: Pending */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px' }}>
                <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{String(pendingCount).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Pending Appr.</span>
                </div>
              </div>

              {/* Stat 3: Approved */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px' }}>
                <Check size={14} style={{ color: 'var(--text-muted)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{String(approvedCount + 9).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Approved</span>
                </div>
              </div>

              {/* Stat 4: Declined */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px' }}>
                <X size={14} style={{ color: 'var(--text-muted)' }} />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-primary)', lineHeight: 1.1 }}>{String(declinedCount).padStart(2, '0')}</span>
                  <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Declined</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Incident Status Manager */}
        <section aria-label="Incident Status Manager" style={{ display: 'flex', flexDirection: 'column' }}>
          <div 
            style={{ 
              background: 'var(--card-bg)', 
              border: '1px solid var(--card-border)', 
              borderRadius: '8px', 
              padding: '20px', 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%'
            }}
          >
            {/* Header controls matching mockup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                  Incident Clearance Status Manager
                </h3>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Query and update specific incident resolution values in database</span>
              </div>

              {/* Filters Box */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Search */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Search incidents..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ 
                      paddingLeft: '1.6rem', 
                      fontSize: '0.7rem', 
                      width: '140px', 
                      height: '28px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '4px',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  />
                </div>
                
                {/* District Filter Dropdown */}
                <CustomSelect
                  value={selectedDistrict}
                  onChange={(val) => setSelectedDistrict(val)}
                  options={DISTRICT_FILTER_OPTIONS}
                  icon={Filter}
                  style={{ width: '155px' }}
                  buttonStyle={{ height: '28px', padding: '0 8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.02)' }}
                  menuStyle={{ right: 0, left: 'auto' }}
                />
              </div>
            </div>

            {/* Table */}
            <div className="table-wrapper" style={{ flexGrow: 1, overflowY: 'auto', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--card-border)', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ID</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Crime Type</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Station</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Date</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Status Clearance</th>
                    <th style={{ padding: '8px 12px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentIncidents.map(inc => {
                    return (
                      <tr key={inc.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)' }}>#{inc.id}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-primary)', fontWeight: '500' }}>{inc.crime_type}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{inc.station}</td>
                        <td style={{ padding: '10px 12px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{inc.date}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <CustomSelect
                            value={inc.status}
                            onChange={(newVal) => handleUpdateStatus(inc.id, newVal)}
                            options={STATUS_CLEARANCE_OPTIONS}
                            style={{ width: '175px' }}
                            buttonStyle={{
                              padding: '3px 8px',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              background: 'rgba(0,0,0,0.4)'
                            }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
                            <MoreVertical size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {incidentsLoading && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-blue)', fontSize: '0.75rem' }} className="pulse">
                        Syncing crime database records...
                      </td>
                    </tr>
                  )}
                  {incidentsError && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--accent-red)', fontSize: '0.75rem' }}>
                        ⚠️ Failed to load incident clearances from database.
                      </td>
                    </tr>
                  )}
                  {!incidentsLoading && currentIncidents.length === 0 && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        No incidents match the search criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with counts and pagination matching mockup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--card-border)' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Showing {totalIncidents > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, totalIncidents)} of {totalIncidents} incidents
              </span>

              {/* Pagination controls */}
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft size={12} />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isCurrent = currentPage === pNum;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${isCurrent ? 'var(--accent-blue)' : 'var(--card-border)'}`,
                        borderRadius: '4px',
                        width: '26px',
                        height: '26px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: isCurrent ? 'var(--accent-blue)' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {pNum}
                    </button>
                  );
                })}

                {totalPages > 5 && (
                  <>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0 4px' }}>...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${currentPage === totalPages ? 'var(--accent-blue)' : 'var(--card-border)'}`,
                        borderRadius: '4px',
                        width: '26px',
                        height: '26px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: currentPage === totalPages ? 'var(--accent-blue)' : 'var(--text-primary)',
                        cursor: 'pointer'
                      }}
                    >
                      {totalPages}
                    </button>
                  </>
                )}

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--card-border)',
                    borderRadius: '4px',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--text-primary)',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default ClearanceView;
