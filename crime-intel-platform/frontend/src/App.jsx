import React, { useEffect, useState } from 'react';
import MapView from './components/MapView';
import NetworkView from './components/NetworkView';
import CorrelationChart from './components/CorrelationChart';
import RoleSwitcher from './components/RoleSwitcher';

// Initial mock audit logs
const INITIAL_AUDIT_LOGS = [
  {
    id: "LOG-9081",
    timestamp: "2026-07-16 10:14:22",
    operator: "Investigator-88",
    target: "Ramesh Kumar",
    action: "Network Query",
    clearance: "L1 Clearance",
    auth_token: "0x8F0D3A"
  },
  {
    id: "LOG-9082",
    timestamp: "2026-07-16 11:32:05",
    operator: "Analyst-15",
    target: "Suresh Naik",
    action: "Co-offender Cluster Map",
    clearance: "L2 Clearance",
    auth_token: "0x3C9A1B"
  },
  {
    id: "LOG-9083",
    timestamp: "2026-07-16 12:45:10",
    operator: "Supervisor-02",
    target: "District Risk Model",
    action: "RandomForest Forecast Run",
    clearance: "L3 Supervisor",
    auth_token: "0x9E7F4C"
  }
];

function App() {
  const [activeRole, setActiveRole] = useState('Analyst');
  const [activeDistrict, setActiveDistrict] = useState(null);
  const [selectedOffenderId, setSelectedOffenderId] = useState(null);
  const [selectedOffenderName, setSelectedOffenderName] = useState("");
  const [riskScores, setRiskScores] = useState([]);
  const [correlationData, setCorrelationData] = useState(null);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Fetch initial dashboard metrics from backend
  useEffect(() => {
    // Fetch Risk scores and Anomaly status
    fetch("http://localhost:8000/api/risk/scores")
      .then((res) => res.json())
      .then((data) => setRiskScores(data))
      .catch((err) => console.error("Error fetching risk scores:", err));

    // Fetch Pearson correlations
    fetch("http://localhost:8000/api/correlations")
      .then((res) => res.json())
      .then((data) => setCorrelationData(data))
      .catch((err) => console.error("Error fetching correlations:", err));
  }, []);

  // Handler for offender selection (triggers audit log append)
  const handleSelectOffender = (id, name) => {
    setSelectedOffenderId(id);
    setSelectedOffenderName(name);

    // Create new audit log record
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timeStr,
      operator: `${activeRole}-${Math.floor(10 + Math.random() * 90)}`,
      target: name,
      action: "Link Network Rendered",
      clearance: activeRole === 'Supervisor' ? 'L3 Supervisor' : activeRole === 'Analyst' ? 'L2 Clearance' : 'L1 Clearance',
      auth_token: `0x${Math.floor(0x100000 + Math.random() * 0xF00000).toString(16).toUpperCase()}`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleSelectDistrict = (distName) => {
    setActiveDistrict(distName);
  };

  // KPI Calculations
  const totalIncidents = riskScores.reduce((sum, row) => sum + row.incident_count_latest, 0) * 12 || 3000;
  const activeHotspotsCount = activeDistrict ? (activeDistrict === 'Bengaluru' ? 4 : 2) : 18;
  const anomaliesCount = riskScores.filter(r => r.anomaly_spike).length;
  
  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="header">
        <div className="header-title-section">
          <h1>
            <span style={{ color: 'var(--accent-pink)' }}>🔍</span> SCRB Crime Intelligence Platform
          </h1>
          <p>State Crime Records Bureau — Spatiotemporal Clustering & Social Linkages</p>
        </div>
        <RoleSwitcher activeRole={activeRole} onRoleChange={setActiveRole} />
      </header>

      {/* KPI Stats Panel */}
      <section className="kpi-grid">
        <div className="kpi-card solved">
          <div className="kpi-info">
            <h3>Yearly Incidents (Est)</h3>
            <p>{totalIncidents}</p>
          </div>
          <div className="kpi-icon" style={{ color: 'var(--accent-green)' }}>📊</div>
        </div>

        <div className="kpi-card hotspots">
          <div className="kpi-info">
            <h3>Active DBSCAN Hotspots</h3>
            <p>{activeHotspotsCount}</p>
          </div>
          <div className="kpi-icon" style={{ color: 'var(--accent-amber)' }}>🔥</div>
        </div>

        <div className="kpi-card anomaly">
          <div className="kpi-info">
            <h3>Active Anomaly Spikes</h3>
            <p>{anomaliesCount}</p>
          </div>
          <div className="kpi-icon" style={{ color: 'var(--accent-red)' }}>🚨</div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '3px solid var(--accent-cyan)' }}>
          <div className="kpi-info">
            <h3>Average Clearance Rate</h3>
            <p>76.4%</p>
          </div>
          <div className="kpi-icon" style={{ color: 'var(--accent-cyan)' }}>🛡️</div>
        </div>
      </section>

      {/* Main Analysis Grid */}
      <main className="dashboard-grid">
        {/* Map Column */}
        <section className="dashboard-card">
          <MapView
            activeDistrict={activeDistrict}
            onSelectDistrict={handleSelectDistrict}
            onSelectOffender={handleSelectOffender}
            riskScores={riskScores}
          />
        </section>

        {/* Analytics Column */}
        <div className="right-column">
          {/* Network Graph Card */}
          <section className="dashboard-card" style={{ flexGrow: 1 }}>
            <NetworkView
              accusedId={selectedOffenderId}
              accusedName={selectedOffenderName}
            />
          </section>

          {/* Correlations / Statistics Card */}
          {(activeRole === 'Analyst' || activeRole === 'Supervisor') && (
            <section className="dashboard-card" style={{ height: '350px' }}>
              <CorrelationChart correlationData={correlationData} />
            </section>
          )}
        </div>
      </main>

      {/* Audit Log Card (Supervisor Role Only) */}
      {activeRole === 'Supervisor' ? (
        <section className="dashboard-card audit-card">
          <div className="card-header">
            <div>
              <h3 className="card-title">🛡️ System Intelligence Audit Logs</h3>
              <p className="card-subtitle">Real-time tracking of intelligence database access and analytical node queries</p>
            </div>
            <span className="badge high" style={{ fontSize: '0.8rem' }}>SUPERVISOR MODE ACTIVE</span>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>LOG ID</th>
                  <th>TIMESTAMP</th>
                  <th>OPERATOR</th>
                  <th>TARGET SPEC</th>
                  <th>ACTION COMPLETED</th>
                  <th>CLEARANCE</th>
                  <th>AUTH TOKEN</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{log.id}</td>
                    <td>{log.timestamp}</td>
                    <td>{log.operator}</td>
                    <td>
                      <span 
                        style={{ 
                          color: log.target.includes('Ramesh') || log.target.includes('Suresh') ? 'var(--accent-pink)' : 'var(--text-primary)',
                          fontWeight: log.target.includes('Ramesh') || log.target.includes('Suresh') ? '500' : 'normal'
                        }}
                      >
                        {log.target}
                      </span>
                    </td>
                    <td>{log.action}</td>
                    <td>
                      <span className={`badge ${log.clearance.includes('Supervisor') ? 'high' : log.clearance.includes('L2') ? 'medium' : 'low'}`}>
                        {log.clearance}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{log.auth_token}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '12px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          🔒 Audit logging panel active in background. Log in as <strong>Supervisor</strong> to view node intelligence access logs.
        </div>
      )}
    </div>
  );
}

export default App;
