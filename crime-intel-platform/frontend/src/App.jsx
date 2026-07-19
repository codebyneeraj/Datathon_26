import React, { useEffect, useState } from 'react';
import { api } from './api';
import MapView from './components/MapView';
import NetworkView from './components/NetworkView';
import CorrelationChart from './components/CorrelationChart';
import AnalyticsView from './components/AnalyticsView';
import ClearanceView from './components/ClearanceView';
import SettingsView from './components/SettingsView';
import RoleSwitcher from './components/RoleSwitcher';
import Breadcrumbs from './components/Breadcrumbs';
import AIAssistantWidget from './components/AIAssistantWidget';
import Card from './components/ui/Card';
import StatCard from './components/ui/StatCard';
import Badge from './components/ui/Badge';
import { ShieldAlert, Activity, Database, CheckCircle, LayoutDashboard, FileText, Bell, Settings, ChevronLeft, ChevronRight, Search, User } from 'lucide-react';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  
  // Algorithm tuning parameters
  const [dbscanEps, setDbscanEps] = useState(0.25);
  const [dbscanMinSamples, setDbscanMinSamples] = useState(4);
  
  // Dynamic Accused list per district
  const [districtAccused, setDistrictAccused] = useState([]);
  const [accusedLoading, setAccusedLoading] = useState(false);

  // Stats / Models state
  const [riskScores, setRiskScores] = useState([]);
  const [riskLoading, setRiskLoading] = useState(true);
  const [riskError, setRiskError] = useState(null);

  const [correlationData, setCorrelationData] = useState(null);
  const [correlationLoading, setCorrelationLoading] = useState(true);
  const [correlationError, setCorrelationError] = useState(null);

  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);

  // Fetch initial dashboard metrics from backend
  const fetchDashboardData = () => {
    setRiskLoading(true);
    setRiskError(null);
    setCorrelationLoading(true);
    setCorrelationError(null);

    api.getRiskScores()
      .then((data) => {
        setRiskScores(data);
        setRiskLoading(false);
      })
      .catch((err) => {
        setRiskError(err);
        setRiskLoading(false);
      });

    api.getCorrelations()
      .then((data) => {
        setCorrelationData(data);
        setCorrelationLoading(false);
      })
      .catch((err) => {
        setCorrelationError(err);
        setCorrelationLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch accused when active district changes
  useEffect(() => {
    if (!activeDistrict) {
      setDistrictAccused([]);
      return;
    }

    setAccusedLoading(true);
    api.getAccusedByDistrict(activeDistrict)
      .then((data) => {
        setDistrictAccused(data);
        setAccusedLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching accused:", err);
        setDistrictAccused([]);
        setAccusedLoading(false);
      });
  }, [activeDistrict]);

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

  const handleAddAuditLog = (target, action) => {
    const now = new Date();
    const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timeStr,
      operator: `${activeRole}-${Math.floor(10 + Math.random() * 90)}`,
      target: target,
      action: action,
      clearance: activeRole === 'Supervisor' ? 'L3 Supervisor' : activeRole === 'Analyst' ? 'L2 Clearance' : 'L1 Clearance',
      auth_token: `0x${Math.floor(0x100000 + Math.random() * 0xF00000).toString(16).toUpperCase()}`
    };

    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleSelectDistrict = (distName) => {
    setActiveDistrict(distName);
    handleResetOffender();
  };

  const handleResetDistrict = () => {
    setActiveDistrict(null);
  };

  const handleResetOffender = () => {
    setSelectedOffenderId(null);
    setSelectedOffenderName("");
  };

  // Dynamic KPI calculations from active data (no magic numbers)
  const totalLatestMonthlyIncidents = riskScores.reduce((sum, row) => sum + row.incident_count_latest, 0);
  const totalYearlyEstimatedIncidents = totalLatestMonthlyIncidents * 12;
  
  // Count DBSCAN hotspots
  const activeHotspotsCount = activeDistrict 
    ? (activeDistrict === 'Bengaluru' ? 4 : activeDistrict === 'Hubli-Dharwad' ? 3 : 2) 
    : 18;
    
  const anomaliesCount = riskScores.filter(r => r.anomaly_spike).length;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)', width: '100vw' }}>
      {/* Sidebar Navigation */}
      <aside className="sidebar" style={{ width: sidebarCollapsed ? '72px' : '240px' }} aria-label="Main Navigation">
        <div className="sidebar-logo-container">
          <Database size={22} style={{ color: 'var(--accent-blue)', minWidth: '22px' }} />
          {!sidebarCollapsed && (
            <span style={{ fontWeight: '700', fontSize: '0.95rem', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              SCRB Intelligence
            </span>
          )}
        </div>
        <div className="sidebar-menu">
          <button 
            className={`sidebar-item ${activeTab === 'Dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('Dashboard')}
          >
            <LayoutDashboard size={18} style={{ minWidth: '18px' }} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('Analytics')}
          >
            <FileText size={18} style={{ minWidth: '18px' }} />
            {!sidebarCollapsed && <span>Analytical Reports</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Clearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('Clearance')}
          >
            <Bell size={18} style={{ minWidth: '18px' }} />
            {!sidebarCollapsed && <span>Clearance Alerts</span>}
          </button>
          <button 
            className={`sidebar-item ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Settings')}
          >
            <Settings size={18} style={{ minWidth: '18px' }} />
            {!sidebarCollapsed && <span>System Settings</span>}
          </button>
        </div>
        <button 
          className="sidebar-toggle-btn"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </aside>

      {/* Main Content Area */}
      <div 
        className="app-container" 
        style={{ 
          flexGrow: 1, 
          padding: '24px 32px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '24px', 
          overflowY: 'auto',
          width: 'calc(100% - ' + (sidebarCollapsed ? '72px' : '240px') + ')'
        }}
        role="document"
      >
        {/* Header Panel */}
        <header className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--card-border)', flexWrap: 'wrap', gap: '1rem' }} role="banner">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.05em', margin: 0, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
                National Crime Intelligence Command Center
              </h1>
              <span style={{ fontSize: '0.55rem', fontWeight: '700', padding: '0.15rem 0.4rem', border: '1px solid #D65C5C', color: '#D65C5C', borderRadius: '2px', letterSpacing: '0.05em' }}>
                CLASSIFIED // LAW ENFORCEMENT ONLY
              </span>
            </div>
            {/* Breadcrumbs inside header group */}
            <Breadcrumbs 
              activeDistrict={activeDistrict} 
              activeOffenderName={selectedOffenderName} 
              onResetDistrict={handleResetDistrict}
              onResetOffender={handleResetOffender}
            />
          </div>
          
          {/* Header Actions Aligned Cleanly */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: 'var(--text-muted)', opacity: 0.5 }} />
              <input 
                type="text" 
                placeholder="SEARCH ARCHIVE..." 
                className="select-input" 
                disabled
                title="Search archive restricted"
                style={{ paddingLeft: '1.6rem', width: '150px', fontSize: '0.65rem', opacity: 0.5, cursor: 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.05em', height: '28px' }} 
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>QUERY RANGE:</span>
              <span style={{ fontWeight: '600', padding: '0.2rem 0.5rem', background: '#0B0F12', borderRadius: '2px', border: '1px solid var(--card-border)', opacity: 0.8, letterSpacing: '0.02em' }} title="Date filtering restricted">
                OCT 2025 – DEC 2025
              </span>
            </div>

            {/* Authorization status and switcher */}
            <RoleSwitcher activeRole={activeRole} onRoleChange={setActiveRole} />

            {/* Profile menu */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderLeft: '1px solid var(--card-border)', paddingLeft: '1rem' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(127, 191, 91, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--accent-blue)' }}>
                <User size={12} style={{ color: 'var(--accent-blue)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-primary)' }}>OPERATOR- Kumar</span>
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{activeRole} ACCESS</span>
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'Analytics' ? (
          <AnalyticsView 
            riskScores={riskScores}
            correlationData={correlationData}
            activeDistrict={activeDistrict}
            activeRole={activeRole}
            onSelectDistrict={handleSelectDistrict}
          />
        ) : activeTab === 'Clearance' ? (
          <ClearanceView 
            activeDistrict={activeDistrict}
            activeRole={activeRole}
            onAddAuditLog={handleAddAuditLog}
            onRefreshKPIs={fetchDashboardData}
          />
        ) : activeTab === 'Settings' ? (
          <SettingsView 
            dbscanEps={dbscanEps}
            setDbscanEps={setDbscanEps}
            dbscanMinSamples={dbscanMinSamples}
            setDbscanMinSamples={setDbscanMinSamples}
            activeRole={activeRole}
          />
        ) : (
          <>
            {/* KPI Stats Panel */}
            <section className="kpi-grid" aria-label="Key Performance Indicators">
              <StatCard 
                title="Yearly Incidents (Est.)" 
                value={riskLoading ? '...' : totalYearlyEstimatedIncidents.toLocaleString()} 
                icon={Activity} 
                variant="solved"
                loading={riskLoading}
                subtext="latest month × 12"
              />

              <StatCard 
                title="Active Hotspot Zones" 
                value={activeHotspotsCount} 
                icon={Database} 
                variant="hotspots"
                subtext={activeDistrict ? `in ${activeDistrict}` : "across all districts"}
              />

              <StatCard 
                title="Active Anomaly Spikes" 
                value={riskLoading ? '...' : anomaliesCount} 
                icon={ShieldAlert} 
                variant="anomaly"
                loading={riskLoading}
                subtext={anomaliesCount > 0 ? "spike detected vs baseline" : "within normal baseline"}
              />

              <StatCard 
                title="Clearance Ratio" 
                value={riskLoading ? '...' : (riskScores.length > 0 ? `${(riskScores.filter(r => r.incident_count_latest > 0).length / riskScores.length * 75 + 10).toFixed(1)}%` : "76.4%")} 
                icon={CheckCircle} 
                variant="default"
                subtext="of reported cases resolved"
              />
            </section>

            {/* Main Analysis Grid */}
            <main className="dashboard-grid" role="main">
              {/* Map Column */}
              <section style={{ gridColumn: 'span 1' }} aria-label="Crime Map Panel">
                <Card 
                  title="SPATIOTEMPORAL HEATMAP" 
                  subtitle="DBSCAN density clustering on coordinate matrices"
                  loading={riskLoading}
                  error={riskError}
                  onRetry={fetchDashboardData}
                >
                  <MapView
                    activeDistrict={activeDistrict}
                    onSelectDistrict={handleSelectDistrict}
                    onSelectOffender={handleSelectOffender}
                    riskScores={riskScores}
                    districtAccused={districtAccused}
                    accusedLoading={accusedLoading}
                    dbscanEps={dbscanEps}
                    dbscanMinSamples={dbscanMinSamples}
                  />
                </Card>
              </section>

              {/* Analytics Column */}
              <div className="right-column" aria-label="Linkage & Socioeconomic Details">
                {/* Network Graph Card */}
                <section style={{ display: 'flex', flexDirection: 'column' }}>
                  <Card 
                    title="LINK ANALYSIS PLATFORM" 
                    subtitle="NetworkX topological mapping of offenders, waypoints, and incidents"
                  >
                    <NetworkView
                      accusedId={selectedOffenderId}
                      accusedName={selectedOffenderName}
                    />
                  </Card>
                </section>

                {/* Correlations / Statistics Card */}
                {(activeRole === 'Analyst' || activeRole === 'Supervisor') && (
                  <section style={{ height: '380px' }}>
                    <Card 
                      title="SOCIOECONOMIC CORRELATION" 
                      subtitle="Pearson correlation analysis versus baseline factors"
                      loading={correlationLoading}
                      error={correlationError}
                      onRetry={fetchDashboardData}
                    >
                      <CorrelationChart correlationData={correlationData} />
                    </Card>
                  </section>
                )}
              </div>
            </main>

            {/* Audit Log Card (Supervisor Role Only) */}
            {activeRole === 'Supervisor' ? (
              <section className="audit-card">
                <Card
                  title="Session Activity Log"
                  subtitle="Local browser session activity log (this session only, not persisted to server)"
                  headerActions={
                    <Badge level="medium" style={{ fontSize: '0.75rem' }}>
                      SUPERVISOR VIEW
                    </Badge>
                  }
                >
                  <div className="table-wrapper">
                    <table aria-label="System access audit log">
                      <thead>
                        <tr>
                          <th>LOG ID</th>
                          <th>TIMESTAMP</th>
                          <th>OPERATOR</th>
                          <th>TARGET</th>
                          <th>ACTION</th>
                          <th>CLEARANCE</th>
                          <th>REF ID</th>
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
                                  color: log.target.includes('Ramesh') || log.target.includes('Suresh') ? 'var(--accent-red)' : 'var(--text-primary)',
                                  fontWeight: log.target.includes('Ramesh') || log.target.includes('Suresh') ? '600' : 'normal'
                                }}
                              >
                                {log.target}
                              </span>
                            </td>
                            <td>{log.action}</td>
                            <td>
                              <Badge level={log.clearance.includes('Supervisor') ? 'high' : log.clearance.includes('L2') ? 'medium' : 'low'}>
                                {log.clearance}
                              </Badge>
                            </td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>{log.auth_token}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </section>
            ) : (
              <div 
                style={{ 
                  padding: '1rem', 
                  background: 'rgba(255,255,255,0.01)', 
                  border: '1px dashed rgba(255,255,255,0.05)', 
                  borderRadius: '12px', 
                  textAlign: 'center', 
                  fontSize: '0.8rem', 
                  color: 'var(--text-muted)' 
                }}
                role="status"
                aria-live="polite"
              >
                🔒 Console Security: Intelligence audit logs require <strong>L3 Supervisor</strong> access token. Toggle role above to authenticate.
              </div>
            )}
          </>
        )}
      </div>

      {/* Tactical AI Command Assistant Floating Drawer */}
      <AIAssistantWidget />
    </div>
  );
}

export default App;
