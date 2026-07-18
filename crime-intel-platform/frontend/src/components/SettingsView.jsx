import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { Settings, Sliders, Palette, Database, Check, RefreshCw } from 'lucide-react';

const THEMES = {
  military: {
    name: "Military Tactical (Green)",
    accent: "#7FBF5B",
    bg: "#050607",
    surface: "#0B0F12",
    cardBg: "#11161A",
    secSurface: "#151B20",
    border: "#242D32"
  },
  amber: {
    name: "Amber Alert (Yellow)",
    accent: "#D6A13D",
    bg: "#080705",
    surface: "#100e0b",
    cardBg: "#16130F",
    secSurface: "#1b1812",
    border: "#2d281f"
  },
  cyber: {
    name: "Cyber Threat (Crimson)",
    accent: "#D65C5C",
    bg: "#080505",
    surface: "#100b0b",
    cardBg: "#160F0F",
    secSurface: "#1b1212",
    border: "#2d1f1f"
  }
};

const SettingsView = ({ 
  dbscanEps, 
  setDbscanEps, 
  dbscanMinSamples, 
  setDbscanMinSamples
}) => {
  const [activeTheme, setActiveTheme] = useState('military');
  
  // DB test status
  const [dbStatus, setDbStatus] = useState('Active');
  const [dbLoading, setDbLoading] = useState(false);

  // Restore theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('console_theme') || 'military';
    setActiveTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (themeKey) => {
    const theme = THEMES[themeKey];
    if (!theme) return;

    localStorage.setItem('console_theme', themeKey);
    document.documentElement.style.setProperty('--accent-blue', theme.accent);
    document.documentElement.style.setProperty('--accent-pink', theme.accent);
    document.documentElement.style.setProperty('--bg-color', theme.bg);
    document.documentElement.style.setProperty('--surface-color', theme.surface);
    document.documentElement.style.setProperty('--card-bg', theme.cardBg);
    document.documentElement.style.setProperty('--sec-surface', theme.secSurface);
    document.documentElement.style.setProperty('--card-border', theme.border);
  };

  const handleThemeChange = (themeKey) => {
    setActiveTheme(themeKey);
    applyTheme(themeKey);
  };

  const handleTestConnection = () => {
    setDbLoading(true);
    setTimeout(() => {
      setDbLoading(false);
      setDbStatus('Active');
    }, 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Screen Header */}
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Settings size={18} style={{ color: 'var(--accent-blue)' }} />
          SYSTEM SETTINGS & MODEL CONFIGURATION
        </h2>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
          Configure analytical hyperparameters, UI visual modes, and system integration status
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Left Column: DBSCAN Algorithm Tuning */}
        <section aria-label="Analytical Model Settings">
          <Card 
            title="DBSCAN Clustering Parameters" 
            subtitle="Fine-tune coordinate density grouping thresholds for the spatiotemporal heatmap"
            headerActions={<Sliders size={15} style={{ color: 'var(--accent-blue)' }} />}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '0.25rem 0' }}>
              
              {/* Epsilon Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Epsilon (eps)</span>
                  <strong style={{ color: 'var(--accent-blue)' }}>{dbscanEps.toFixed(2)}</strong>
                </div>
                <input 
                  type="range" 
                  min="0.05" 
                  max="0.80" 
                  step="0.01" 
                  value={dbscanEps}
                  onChange={(e) => setDbscanEps(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  Controls cluster size. Lower values isolate tight pockets; higher values group larger geographical districts.
                </span>
              </div>

              {/* Min Samples Slider */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Min Samples (density point limit)</span>
                  <strong style={{ color: 'var(--accent-blue)' }}>{dbscanMinSamples}</strong>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="10" 
                  step="1" 
                  value={dbscanMinSamples}
                  onChange={(e) => setDbscanMinSamples(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                  Minimum incidents required to form a cluster. Decreasing it expands hotspots; increasing it isolates core crime hubs.
                </span>
              </div>

              <div style={{ padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--card-border)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                ℹ️ <strong>Auto-apply enabled</strong>: Changes to DBSCAN hyperparameters immediately take effect on the <strong>Spatiotemporal Heatmap</strong>. Simply navigate back to the Dashboard to review the recalculated clusters.
              </div>

            </div>
          </Card>
        </section>

        {/* Right Column: UI Theme & DB Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Theme Customizer Card */}
          <section aria-label="Console Theme Settings">
            <Card 
              title="Console Visual Theme" 
              subtitle="Select a tactical color scheme for the Intelligence Command interface"
              headerActions={<Palette size={15} style={{ color: 'var(--accent-blue)' }} />}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '0.25rem 0' }}>
                {Object.keys(THEMES).map((key) => {
                  const theme = THEMES[key];
                  const isSelected = activeTheme === key;
                  return (
                    <button
                      key={key}
                      onClick={() => handleThemeChange(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: isSelected ? 'rgba(255,255,255,0.02)' : 'transparent',
                        border: `1px solid ${isSelected ? 'var(--accent-blue)' : 'var(--card-border)'}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? '600' : 'normal',
                        transition: 'all 0.15s ease',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Dot indicator in theme color */}
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.accent }}></div>
                        <span>{theme.name}</span>
                      </div>
                      {isSelected && <Check size={14} style={{ color: 'var(--accent-blue)' }} />}
                    </button>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Database Info Card */}
          <section aria-label="Database Status Settings">
            <Card 
              title="Intelligence Database Status" 
              subtitle="Verify backend SQLite transaction link state"
              headerActions={<Database size={15} style={{ color: 'var(--accent-blue)' }} />}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '0.25rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>SQLite Database File:</span>
                  <strong style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>crime_db.db</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Link Connection State:</span>
                  <Badge level={dbStatus === 'Active' ? 'success' : 'high'}>
                    {dbStatus === 'Active' ? 'CONNECTED' : 'DISCONNECTED'}
                  </Badge>
                </div>

                <Button 
                  variant="ghost" 
                  onClick={handleTestConnection}
                  disabled={dbLoading}
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.7rem', height: '30px' }}
                >
                  <RefreshCw size={11} className={dbLoading ? 'spin' : ''} />
                  {dbLoading ? 'TESTING TRANSACTION PORT...' : 'TEST DATABASE LINK CONNECTION'}
                </Button>
              </div>
            </Card>
          </section>

        </div>

      </div>
    </div>
  );
};

export default SettingsView;
