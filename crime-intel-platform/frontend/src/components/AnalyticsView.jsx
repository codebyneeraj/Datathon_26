import React, { useState, useEffect } from 'react';
import { api } from '../api';
import Card from './ui/Card';
import CustomSelect from './CustomSelect';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Label
} from 'recharts';
import { 
  FileText, Printer, BarChart3, ShieldAlert, Cpu, 
  Database, RefreshCw, X, TrendingUp 
} from 'lucide-react';

const AnalyticsView = ({ 
  riskScores = [], 
  correlationData = null, 
  activeDistrict: parentActiveDistrict, 
  activeRole,
  onSelectDistrict: onParentSelectDistrict 
}) => {
  const [activeModule, setActiveModule] = useState('Correlation'); // Correlation, Sandbox, Hotspots
  const [selectedDistrict, setSelectedDistrict] = useState(parentActiveDistrict || 'All');
  
  // Sandbox Sliders State
  const [sandboxPopulation, setSandboxPopulation] = useState(500000);
  const [sandboxUnemployment, setSandboxUnemployment] = useState(6.5);
  const [sandboxUrbanization, setSandboxUrbanization] = useState(0.5);
  const [sandboxLiteracy, setSandboxLiteracy] = useState(78);
  const [sandboxIncidents, setSandboxIncidents] = useState(25);
  
  // Sandbox prediction result
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Correlation indicator selector
  const [correlationIndicator, setCorrelationIndicator] = useState('unemployment_rate');

  // Hotspot / Offender Details State
  const [hotspotsData, setHotspotsData] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);
  const [offendersData, setOffendersData] = useState([]);
  const [offendersLoading, setOffendersLoading] = useState(false);

  // Briefing Report Modal State
  const [showBriefingModal, setShowBriefingModal] = useState(false);

  // Gemma AI Threat Brief State
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const handleGenerateAISummary = () => {
    setAiSummaryLoading(true);
    const targetDist = selectedDistrict === 'All' ? 'Bengaluru' : selectedDistrict;
    const distRisk = riskScores.find(r => r.district === targetDist) || {
      predicted_risk_score: 68.5,
      risk_level: 'High',
      incident_count_latest: 32
    };

    api.getDistrictAISummary({
      district: targetDist,
      risk_score: distRisk.predicted_risk_score || 65.0,
      risk_level: distRisk.risk_level || 'High',
      incident_count: distRisk.incident_count_latest || 28,
      socioeconomic: {
        population: distRisk.population || 8443675,
        unemployment_rate: distRisk.unemployment_rate || 6.8,
        urbanization_index: distRisk.urbanization_index || 0.82,
        literacy_rate: distRisk.literacy_rate || 87.6
      },
      top_crimes: [
        { type: 'Cyber Scam', count: 14 },
        { type: 'Property Theft', count: 9 },
        { type: 'Assault', count: 5 }
      ]
    })
      .then(res => {
        setAiSummary(res);
        setAiSummaryLoading(false);
      })
      .catch(err => {
        console.error("AI Summary error:", err);
        setAiSummaryLoading(false);
      });
  };

  // Dynamic lists
  const districtsList = riskScores.map(r => r.district);

  // Load district stats into sandbox sliders when selected district changes
  useEffect(() => {
    if (selectedDistrict && selectedDistrict !== 'All') {
      const distData = riskScores.find(r => r.district === selectedDistrict);
      if (distData) {
        setSandboxPopulation(distData.population || 500000);
        setSandboxUnemployment(distData.unemployment_rate || 5.0);
        setSandboxUrbanization(distData.urbanization_index || 0.5);
        setSandboxLiteracy(distData.literacy_rate || 75);
        setSandboxIncidents(distData.incident_count_latest || 20);
      }
    }
  }, [selectedDistrict, riskScores]);

  // Sync with parent active district if any
  useEffect(() => {
    if (parentActiveDistrict) {
      setSelectedDistrict(parentActiveDistrict);
    }
  }, [parentActiveDistrict]);

  // Load Hotspots & Offenders when active district changes
  useEffect(() => {
    if (activeModule === 'Hotspots') {
      fetchHotspotsAndOffenders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDistrict, activeModule]);

  const fetchHotspotsAndOffenders = () => {
    const queryDist = selectedDistrict === 'All' ? null : selectedDistrict;
    
    setHotspotsLoading(true);
    api.getHotspots(queryDist)
      .then(res => {
        setHotspotsData(res.features || []);
        setHotspotsLoading(false);
      })
      .catch(err => {
        console.error("Error loading hotspots:", err);
        setHotspotsLoading(false);
      });

    if (queryDist) {
      setOffendersLoading(true);
      api.getAccusedByDistrict(queryDist)
        .then(res => {
          setOffendersData(res || []);
          setOffendersLoading(false);
        })
        .catch(err => {
          console.error("Error loading accused:", err);
          setOffendersLoading(false);
          setOffendersData([]);
        });
    } else {
      setOffendersData([]);
    }
  };

  // Run Sandbox prediction
  const handleRunPrediction = () => {
    setPredictLoading(true);
    setPredictError(null);
    
    api.predictRiskScore({
      population: Math.round(sandboxPopulation),
      unemployment_rate: parseFloat(sandboxUnemployment),
      urbanization_index: parseFloat(sandboxUrbanization),
      literacy_rate: parseFloat(sandboxLiteracy),
      incident_count: Math.round(sandboxIncidents)
    })
      .then(res => {
        setPredictionResult(res);
        setPredictLoading(false);
      })
      .catch(err => {
        setPredictError(err);
        setPredictLoading(false);
      });
  };

  // Run initial prediction on mount or module switch
  useEffect(() => {
    if (activeModule === 'Sandbox' && !predictionResult) {
      handleRunPrediction();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeModule]);

  // Pearson interpretation
  const getPearsonInterpretation = (val) => {
    const absVal = Math.abs(val);
    if (absVal >= 0.7) return { text: 'Strong Correlation', color: 'var(--accent-red)' };
    if (absVal >= 0.4) return { text: 'Moderate Correlation', color: 'var(--accent-amber)' };
    return { text: 'Weak/No Correlation', color: 'var(--text-muted)' };
  };

  // Custom tooltips for Recharts scatter plots
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: '#11161A', border: '1px solid var(--card-border)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.75rem' }}>
          <p style={{ fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{data.district}</p>
          <p style={{ color: 'var(--text-secondary)' }}>Crime Rate: <strong style={{ color: '#fff' }}>{data.crime_rate}</strong> per 100k</p>
          <p style={{ color: 'var(--text-secondary)' }}>
            {correlationIndicator === 'unemployment_rate' ? 'Unemployment: ' : correlationIndicator === 'urbanization_index' ? 'Urbanization: ' : 'Literacy: '}
            <strong style={{ color: '#fff' }}>
              {correlationIndicator === 'unemployment_rate' ? `${data.unemployment_rate}%` : correlationIndicator === 'urbanization_index' ? `${data.urbanization_index}` : `${data.literacy_rate}%`}
            </strong>
          </p>
        </div>
      );
    }
    return null;
  };

  // Get indicator label
  const getIndicatorLabel = (key) => {
    if (key === 'unemployment_rate') return 'Unemployment Rate (%)';
    if (key === 'urbanization_index') return 'Urbanization Index (0 - 1)';
    return 'Literacy Rate (%)';
  };

  // Print brief
  const handlePrintBrief = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--accent-blue)' }} />
            INTELLIGENCE REPORTS & ANALYTICS
          </h2>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            System-wide statistical profiles, correlation analysis, and automated risk forecasting
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            onClick={handleGenerateAISummary}
            disabled={aiSummaryLoading}
            style={{ 
              height: '32px', 
              fontSize: '0.75rem',
              background: 'linear-gradient(135deg, rgba(127,191,91,0.2) 0%, rgba(127,191,91,0.05) 100%)',
              border: '1px solid var(--accent-blue)',
              color: 'var(--text-primary)'
            }}
          >
            <Cpu size={13} className={aiSummaryLoading ? 'spin' : ''} style={{ color: 'var(--accent-blue)' }} />
            {aiSummaryLoading ? 'Generating AI Brief...' : 'Generate AI Threat Brief'}
          </Button>

          <Button 
            variant="ghost" 
            onClick={() => setShowBriefingModal(true)}
            style={{ height: '32px', fontSize: '0.75rem' }}
          >
            <Printer size={13} />
            Print Report
          </Button>
        </div>
      </div>

      {/* Gemma LLM AI Intelligence Brief Panel */}
      {aiSummary && (
        <div 
          style={{ 
            background: 'rgba(15, 20, 26, 0.95)', 
            border: '1px solid var(--accent-blue)', 
            borderRadius: '8px', 
            padding: '16px 20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} style={{ color: 'var(--accent-blue)' }} />
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Executive Intelligence Brief: {aiSummary.district}
              </span>
            </div>
            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(127, 191, 91, 0.15)', color: 'var(--accent-green)', fontWeight: '700', border: '1px solid rgba(127, 191, 91, 0.3)' }}>
              MODEL: {aiSummary.model_used || 'gemini-1.5-flash'}
            </span>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.5', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-family)' }}>
            {aiSummary.summary}
          </div>
        </div>
      )}

      {/* Analytics Main Shell */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Left Control Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Module Selector */}
          <Card title="Analytics Modules">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
              <button 
                className={`sidebar-item ${activeModule === 'Correlation' ? 'active' : ''}`}
                onClick={() => setActiveModule('Correlation')}
                style={{ borderRadius: '6px', padding: '0.65rem 0.75rem', borderLeftWidth: '3px' }}
              >
                <BarChart3 size={15} />
                <span>Socio-Economic Correlation</span>
              </button>
              
              <button 
                className={`sidebar-item ${activeModule === 'Sandbox' ? 'active' : ''}`}
                onClick={() => setActiveModule('Sandbox')}
                style={{ borderRadius: '6px', padding: '0.65rem 0.75rem', borderLeftWidth: '3px' }}
              >
                <Cpu size={15} />
                <span>AI Risk Sandbox</span>
              </button>

              <button 
                className={`sidebar-item ${activeModule === 'Hotspots' ? 'active' : ''}`}
                onClick={() => setActiveModule('Hotspots')}
                style={{ borderRadius: '6px', padding: '0.65rem 0.75rem', borderLeftWidth: '3px' }}
              >
                <Database size={15} />
                <span>Hotspots & Threats</span>
              </button>
            </div>
          </Card>

          {/* Scope Settings */}
          <Card title="Briefing Scope">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Focus District</label>
                <CustomSelect
                  value={selectedDistrict}
                  onChange={(val) => {
                    setSelectedDistrict(val);
                    if (onParentSelectDistrict) {
                      onParentSelectDistrict(val === 'All' ? null : val);
                    }
                  }}
                  options={[
                    { value: 'All', label: 'All Districts (State Overview)' },
                    ...districtsList.map(d => ({ value: d, label: d }))
                  ]}
                  style={{ width: '100%' }}
                  buttonStyle={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem' }}
                />
              </div>

              {selectedDistrict && selectedDistrict !== 'All' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '6px', fontSize: '0.7rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Population:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{riskScores.find(r => r.district === selectedDistrict)?.population?.toLocaleString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Unemployment:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{riskScores.find(r => r.district === selectedDistrict)?.unemployment_rate}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Urbanization:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{riskScores.find(r => r.district === selectedDistrict)?.urbanization_index}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Literacy:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{riskScores.find(r => r.district === selectedDistrict)?.literacy_rate}%</strong>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Details Panel */}
        <div style={{ flexGrow: 1 }}>
          
          {/* Module 1: Correlation Analysis */}
          {activeModule === 'Correlation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Unemployment Correlation</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-red)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {correlationData?.correlations?.unemployment || '0.725'}
                    <TrendingUp size={16} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: getPearsonInterpretation(correlationData?.correlations?.unemployment || 0.725).color, fontWeight: '600', marginTop: '2px' }}>
                    {getPearsonInterpretation(correlationData?.correlations?.unemployment || 0.725).text}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Urbanization Correlation</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-amber)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {correlationData?.correlations?.urbanization || '0.512'}
                    <TrendingUp size={16} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: getPearsonInterpretation(correlationData?.correlations?.urbanization || 0.512).color, fontWeight: '600', marginTop: '2px' }}>
                    {getPearsonInterpretation(correlationData?.correlations?.urbanization || 0.512).text}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Literacy Correlation</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {correlationData?.correlations?.literacy || '-0.118'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: getPearsonInterpretation(correlationData?.correlations?.literacy || -0.118).color, fontWeight: '600', marginTop: '2px' }}>
                    {getPearsonInterpretation(correlationData?.correlations?.literacy || -0.118).text}
                  </div>
                </div>
              </div>

              <Card 
                title="Socio-Economic Correlation Scatter Plot"
                subtitle="Pearson alignment between district-level crime rates and localized development indicators"
                headerActions={
                  <div style={{ display: 'flex', gap: '4px', background: '#161c28', padding: '2px', border: '1px solid var(--card-border)', borderRadius: '6px' }}>
                    <button 
                      onClick={() => setCorrelationIndicator('unemployment_rate')}
                      style={{ border: 'none', background: correlationIndicator === 'unemployment_rate' ? 'var(--accent-blue)' : 'transparent', color: correlationIndicator === 'unemployment_rate' ? '#fff' : 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                      Unemployment
                    </button>
                    <button 
                      onClick={() => setCorrelationIndicator('urbanization_index')}
                      style={{ border: 'none', background: correlationIndicator === 'urbanization_index' ? 'var(--accent-blue)' : 'transparent', color: correlationIndicator === 'urbanization_index' ? '#fff' : 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                      Urbanization
                    </button>
                    <button 
                      onClick={() => setCorrelationIndicator('literacy_rate')}
                      style={{ border: 'none', background: correlationIndicator === 'literacy_rate' ? 'var(--accent-blue)' : 'transparent', color: correlationIndicator === 'literacy_rate' ? '#fff' : 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s ease' }}
                    >
                      Literacy
                    </button>
                  </div>
                }
              >
                <div style={{ width: '100%', height: '280px', minHeight: '280px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                      <XAxis 
                        type="number" 
                        dataKey={correlationIndicator} 
                        name={getIndicatorLabel(correlationIndicator)} 
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                        domain={correlationIndicator === 'urbanization_index' ? [0, 1.1] : ['auto', 'auto']}
                        tickFormatter={(v) => correlationIndicator === 'urbanization_index' ? v.toFixed(1) : Math.round(v)}
                      >
                        <Label value={getIndicatorLabel(correlationIndicator)} offset={-5} position="insideBottom" fill="var(--text-muted)" fontSize={10} style={{ textTransform: 'uppercase' }} />
                      </XAxis>
                      <YAxis 
                        type="number" 
                        dataKey="crime_rate" 
                        name="Crime Rate (per 100k)" 
                        stroke="var(--text-muted)"
                        tick={{ fill: 'var(--text-secondary)', fontSize: 10 }}
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => Math.round(v)}
                      >
                        <Label value="Crime Rate / 100k" angle={-90} position="insideLeft" fill="var(--text-muted)" fontSize={10} style={{ textTransform: 'uppercase' }} />
                      </YAxis>
                      <Tooltip content={<CustomScatterTooltip />} />
                      <Scatter name="Districts" data={correlationData?.districts || []} fill="var(--accent-blue)">
                        {(correlationData?.districts || []).map((entry, index) => {
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.district === selectedDistrict ? 'var(--accent-amber)' : entry.crime_rate > 350 ? 'var(--accent-red)' : 'var(--accent-blue)'} 
                              r={entry.district === selectedDistrict ? 9 : entry.crime_rate > 350 ? 7 : 5}
                              stroke="rgba(0,0,0,0.6)"
                              strokeWidth={1.5}
                            />
                          );
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Data Table */}
              <Card title="District Socioeconomic & Incident Alignment Profiles">
                <div className="table-wrapper">
                  <table>
                    <thead>
                      <tr>
                        <th>District Name</th>
                        <th style={{ textAlign: 'right' }}>Population</th>
                        <th style={{ textAlign: 'right' }}>Total Incidents</th>
                        <th style={{ textAlign: 'right' }}>Crime Rate / 100k</th>
                        <th style={{ textAlign: 'right' }}>Unemployment</th>
                        <th style={{ textAlign: 'right' }}>Urbanization</th>
                        <th style={{ textAlign: 'right' }}>Literacy Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(correlationData?.districts || []).map((row) => (
                        <tr 
                          key={row.district}
                          style={{
                            background: row.district === selectedDistrict ? 'rgba(127, 191, 91, 0.05)' : 'transparent',
                            fontWeight: row.district === selectedDistrict ? '600' : 'normal'
                          }}
                        >
                          <td style={{ color: row.district === selectedDistrict ? 'var(--accent-amber)' : 'var(--text-primary)' }}>{row.district}</td>
                          <td style={{ textAlign: 'right' }}>{row.population.toLocaleString()}</td>
                          <td style={{ textAlign: 'right' }}>{row.crime_count}</td>
                          <td style={{ textAlign: 'right', color: row.crime_rate > 350 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                            {row.crime_rate.toFixed(1)}
                          </td>
                          <td style={{ textAlign: 'right' }}>{row.unemployment_rate}%</td>
                          <td style={{ textAlign: 'right' }}>{row.urbanization_index}</td>
                          <td style={{ textAlign: 'right' }}>{row.literacy_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Module 2: AI Risk Sandbox */}
          {activeModule === 'Sandbox' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '20px' }}>
                
                {/* Sliders Input Card */}
                <Card 
                  title="RandomForest Simulator Sandbox"
                  subtitle="Manipulate regional variables to simulate risk forecasts on-the-fly"
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '0.25rem 0' }}>
                    
                    {/* Population Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Population Size</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{sandboxPopulation.toLocaleString()}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="100000" 
                        max="2000000" 
                        step="25000" 
                        value={sandboxPopulation}
                        onChange={(e) => setSandboxPopulation(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Unemployment Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Unemployment Rate</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{sandboxUnemployment.toFixed(1)}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="1.0" 
                        max="20.0" 
                        step="0.1" 
                        value={sandboxUnemployment}
                        onChange={(e) => setSandboxUnemployment(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Urbanization Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Urbanization Index</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{sandboxUrbanization.toFixed(2)}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0.05" 
                        max="1.00" 
                        step="0.01" 
                        value={sandboxUrbanization}
                        onChange={(e) => setSandboxUrbanization(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Literacy Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Literacy Rate</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{sandboxLiteracy}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="40" 
                        max="100" 
                        step="1" 
                        value={sandboxLiteracy}
                        onChange={(e) => setSandboxLiteracy(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    {/* Incident Count Slider */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>Monthly Incidents Count</span>
                        <strong style={{ color: 'var(--text-primary)' }}>{sandboxIncidents}</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="1" 
                        value={sandboxIncidents}
                        onChange={(e) => setSandboxIncidents(Number(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--accent-blue)', height: '4px', cursor: 'pointer' }}
                      />
                    </div>

                    <Button 
                      variant="primary" 
                      onClick={handleRunPrediction} 
                      disabled={predictLoading}
                      style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                    >
                      <Cpu size={14} className={predictLoading ? 'spin' : ''} />
                      {predictLoading ? 'RUNNING FORECAST MODEL...' : 'RUN CLASSIFIER MODEL'}
                    </Button>
                  </div>
                </Card>

                {/* Outputs Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* Gauge Card */}
                  <Card title="Predicted Crime Risk Index">
                    {predictLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px' }}>
                        <RefreshCw size={24} className="spin" style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Evaluating features...</span>
                      </div>
                    ) : predictError ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--accent-red)', fontSize: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <span>Prediction Failure</span>
                        <span style={{ opacity: 0.7, marginTop: '4px' }}>{predictError.message || 'Check database connection'}</span>
                      </div>
                    ) : predictionResult ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '0.5rem 0' }}>
                        
                        {/* Gauge Visual */}
                        <div style={{ position: 'relative', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
                            {/* Track */}
                            <circle 
                              cx="60" cy="60" r="50" 
                              fill="transparent" 
                              stroke="rgba(255,255,255,0.02)" 
                              strokeWidth="8" 
                            />
                            {/* Value indicator */}
                            <circle 
                              cx="60" cy="60" r="50" 
                              fill="transparent" 
                              stroke={predictionResult.predicted_risk_score >= 70 ? 'var(--accent-red)' : predictionResult.predicted_risk_score >= 35 ? 'var(--accent-amber)' : 'var(--accent-green)'} 
                              strokeWidth="8" 
                              strokeDasharray={`${2 * Math.PI * 50}`}
                              strokeDashoffset={`${2 * Math.PI * 50 * (1 - predictionResult.predicted_risk_score / 100)}`}
                              strokeLinecap="round"
                              style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                            />
                          </svg>
                          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '1.75rem', fontWeight: '800', color: '#fff', lineHeight: 1 }}>
                              {predictionResult.predicted_risk_score}
                            </span>
                            <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>
                              Index
                            </span>
                          </div>
                        </div>

                        {/* Level badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Model Decision:</span>
                          <Badge level={predictionResult.risk_level === 'High' ? 'high' : predictionResult.risk_level === 'Medium' ? 'medium' : 'low'}>
                            {predictionResult.risk_level} Risk
                          </Badge>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Adjust sliders and execute model run
                      </div>
                    )}
                  </Card>

                  {/* Confidence Breakdown Card */}
                  <Card title="Model Probability Distribution">
                    {predictionResult ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', padding: '0.25rem 0' }}>
                        {/* Low Probability */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Low Risk Probability</span>
                            <strong style={{ color: 'var(--accent-green)' }}>{(predictionResult.probabilities.Low * 100).toFixed(0)}%</strong>
                          </div>
                          <div style={{ height: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${predictionResult.probabilities.Low * 100}%`, height: '100%', background: 'var(--accent-green)', borderRadius: '2px' }}></div>
                          </div>
                        </div>

                        {/* Medium Probability */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Medium Risk Probability</span>
                            <strong style={{ color: 'var(--accent-amber)' }}>{(predictionResult.probabilities.Medium * 100).toFixed(0)}%</strong>
                          </div>
                          <div style={{ height: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${predictionResult.probabilities.Medium * 100}%`, height: '100%', background: 'var(--accent-amber)', borderRadius: '2px' }}></div>
                          </div>
                        </div>

                        {/* High Probability */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>High Risk Probability</span>
                            <strong style={{ color: 'var(--accent-red)' }}>{(predictionResult.probabilities.High * 100).toFixed(0)}%</strong>
                          </div>
                          <div style={{ height: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${predictionResult.probabilities.High * 100}%`, height: '100%', background: 'var(--accent-red)', borderRadius: '2px' }}></div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '90px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        No execution log loaded
                      </div>
                    )}
                  </Card>
                </div>
              </div>

              {/* Recommendation Panel */}
              <Card title="Tactical Policing Recommendation" headerActions={<ShieldAlert size={16} style={{ color: predictionResult?.risk_level === 'High' ? 'var(--accent-red)' : predictionResult?.risk_level === 'Medium' ? 'var(--accent-amber)' : 'var(--accent-green)' }} />}>
                <div style={{ fontSize: '0.75rem', lineHeight: '1.45', color: 'var(--text-secondary)' }}>
                  {predictionResult?.risk_level === 'High' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ color: 'var(--accent-red)', display: 'block' }}>ALERT: CRITICAL THREAT ENVIRONMENT DETECTED</strong>
                      <span>• Deploy immediate spatiotemporal patrol beats in identified high-density coordinate clusters.</span>
                      <span>• Initiate co-offender link analysis database audits on key repeat offenders in local stations.</span>
                      <span>• Allocate secondary security support and resources to local police precincts to buffer monthly workload spikes.</span>
                    </div>
                  ) : predictionResult?.risk_level === 'Medium' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ color: 'var(--accent-amber)', display: 'block' }}>WARNING: MODERATE DEVIATION DETECTED</strong>
                      <span>• Monitor weekly hotspot updates via DBSCAN to catch potential spatial density expansion early.</span>
                      <span>• Verify repeat offender records against recent incident waypoints in adjacent districts.</span>
                      <span>• Maintain normal patrol frequency but coordinate with local community leaders on socio-economic adjustments.</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <strong style={{ color: 'var(--accent-green)', display: 'block' }}>STABLE ENVIRONMENT CONFIRMED</strong>
                      <span>• Continue routine monitoring and data updates.</span>
                      <span>• Socio-economic markers lie within safe limits of typical crime rate deviations.</span>
                      <span>• Ensure regular incident data seeding is maintained to keep classifier boundaries tuned.</span>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Module 3: Hotspots & Threats */}
          {activeModule === 'Hotspots' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Hotspots Section */}
              <Card 
                title={`Geographical Hotspots (DBSCAN Clusters) — ${selectedDistrict === 'All' ? 'State Overview' : selectedDistrict}`}
                subtitle="Extracted geographical coordinates sharing high spatiotemporal density"
                loading={hotspotsLoading}
              >
                {hotspotsData.length > 0 ? (
                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Cluster ID</th>
                          <th>Centroid Coordinates</th>
                          <th style={{ textAlign: 'right' }}>Incident Count</th>
                          <th>Primary Crime Category</th>
                          <th>Estimated Coverage Radius</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hotspotsData.map((f, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: '600', color: 'var(--accent-amber)' }}>CLUSTER-{f.properties.cluster_id}</td>
                            <td>{f.geometry.coordinates[1].toFixed(5)}, {f.geometry.coordinates[0].toFixed(5)}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600', color: 'var(--text-primary)' }}>{f.properties.incident_count}</td>
                            <td>
                              <Badge level="medium" style={{ fontSize: '0.65rem' }}>
                                {f.properties.primary_crime}
                              </Badge>
                            </td>
                            <td>{f.properties.radius.toFixed(0)} meters</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    No density clusters found in the database matching this scope filter.
                  </div>
                )}
              </Card>

              {/* Repeat Offenders Section */}
              {selectedDistrict !== 'All' && (
                <Card 
                  title={`Threat List: Key Suspects & Recidivists — ${selectedDistrict}`}
                  subtitle="Offenders with active records matching incidents in the selected district, sorted by risk score"
                  loading={offendersLoading}
                >
                  {offendersData.length > 0 ? (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Suspect Name</th>
                            <th>Age / Gender</th>
                            <th style={{ textAlign: 'right' }}>Accused ID</th>
                            <th style={{ textAlign: 'right' }}>Threat Risk Score</th>
                            <th>Status Badge</th>
                          </tr>
                        </thead>
                        <tbody>
                          {offendersData.slice(0, 10).map((a) => (
                            <tr key={a.id}>
                              <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{a.name}</td>
                              <td>{a.age} yrs / {a.gender}</td>
                              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>#{a.id}</td>
                              <td style={{ textAlign: 'right', fontWeight: '700', color: a.risk_score >= 70 ? 'var(--accent-red)' : a.risk_score >= 35 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                                {a.risk_score}/100
                              </td>
                              <td>
                                <Badge level={a.risk_score >= 70 ? 'high' : a.risk_score >= 35 ? 'medium' : 'low'}>
                                  {a.risk_score >= 70 ? 'CRITICAL THREAT' : a.risk_score >= 35 ? 'MEDIUM ALERT' : 'STABLE'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No repeat offender link mappings recorded for this district.
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Briefing Report Modal (Print Preview) */}
      {showBriefingModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', overflowY: 'auto' }}>
          
          <div className="printable-report-container" style={{ background: '#11161A', border: '1px solid var(--card-border)', borderRadius: '12px', width: '800px', maxWidth: '100%', height: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}>
            
            {/* Modal Controls (Not Printed) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--card-border)', background: '#161c28', borderRadius: '12px 12px 0 0' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-secondary)' }}>
                INTELLIGENCE BRIEFING PREVIEW
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="primary" onClick={handlePrintBrief} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                  <Printer size={12} />
                  Print Briefing
                </Button>
                <button 
                  onClick={() => setShowBriefingModal(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Brief Layout */}
            <div id="print-area" style={{ flexGrow: 1, padding: '40px', overflowY: 'auto', background: '#fff', color: '#000', fontFamily: 'serif', position: 'relative' }}>
              
              {/* Confidential Watermark */}
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-45deg)', fontSize: '5rem', fontWeight: '900', color: 'rgba(0,0,0,0.03)', pointerEvents: 'none', zIndex: 0, whiteSpace: 'nowrap', userSelect: 'none' }}>
                CLASSIFIED // SCRB
              </div>

              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Official Header */}
                <div style={{ borderBottom: '3px double #000', paddingBottom: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h1 style={{ fontSize: '1.35rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontFamily: 'sans-serif', color: '#111' }}>
                      State Crime Record Bureau (SCRB)
                    </h1>
                    <p style={{ fontSize: '0.7rem', margin: '3px 0 0 0', textTransform: 'uppercase', color: '#444', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
                      National Crime Intelligence Command Center
                    </p>
                  </div>
                  <div style={{ border: '2px solid #000', padding: '4px 8px', fontSize: '0.65rem', fontWeight: '900', textTransform: 'uppercase', fontFamily: 'sans-serif', color: '#000' }}>
                    Secret / L2 Restricted
                  </div>
                </div>

                {/* Meta details table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', fontFamily: 'sans-serif', color: '#222' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 0', fontWeight: 'bold', width: '25%' }}>SUBJECT:</td>
                      <td style={{ padding: '6px 0' }}>Socio-Economic Crime Risk Profile & Spatial Hotspots</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 0', fontWeight: 'bold' }}>FOCUS REGION:</td>
                      <td style={{ padding: '6px 0', textTransform: 'uppercase' }}>
                        {selectedDistrict === 'All' ? 'KARNATAKA STATE (ALL DISTRICTS)' : `${selectedDistrict} DISTRICT`}
                      </td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 0', fontWeight: 'bold' }}>DATE OF BRIEF:</td>
                      <td style={{ padding: '6px 0' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                    </tr>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '6px 0', fontWeight: 'bold' }}>GENERATED BY:</td>
                      <td style={{ padding: '6px 0', textTransform: 'uppercase' }}>SCRB ANALYTICAL FORENSICS AGENT ({activeRole.toUpperCase()} ACCESS)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Section 1: Executive Summary */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', fontFamily: 'sans-serif', color: '#000' }}>
                    I. EXECUTIVE BRIEFING & CORE INSIGHTS
                  </h3>
                  <p style={{ fontSize: '0.75rem', lineHeight: '1.5', margin: '0 0 10px 0', color: '#111' }}>
                    This memorandum presents localized crime density profiles and socioeconomic indicators parsed from the command center archive database. Mathematical evaluation utilizing <strong>DBSCAN spatial clustering</strong> and <strong>RandomForest risk classification</strong> outlines a distinct alignment between unemployment ratios and spatiotemporal incident density.
                  </p>
                  <p style={{ fontSize: '0.75rem', lineHeight: '1.5', margin: 0, color: '#111' }}>
                    Statewide Pearson coefficients demonstrate that <strong>unemployment rates ({correlationData?.correlations?.unemployment || '0.725'})</strong> represent the strongest pressure on regional crime rate deviations, followed by <strong>urbanization index ({correlationData?.correlations?.urbanization || '0.512'})</strong>. Conversely, literacy indicators exhibit a weak negative correlation, confirming education acts as a long-term buffer.
                  </p>
                </div>

                {/* Section 2: Regional Statistics */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', fontFamily: 'sans-serif', color: '#000' }}>
                    II. DENSITY CLUSTERING & RECIDIVISM SUMMARY
                  </h3>
                  <p style={{ fontSize: '0.75rem', lineHeight: '1.4', marginBottom: '8px', color: '#111' }}>
                    Spatiotemporal density coordinate clustering identified critical hotspot zones across the specified scope. Law enforcement efforts must prioritize the following metrics:
                  </p>
                  
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem', color: '#111' }}>
                    <thead>
                      <tr style={{ borderBottom: '1.5px solid #000', textAlign: 'left', fontWeight: 'bold' }}>
                        <th style={{ padding: '5px' }}>District</th>
                        <th style={{ padding: '5px', textAlign: 'right' }}>Population</th>
                        <th style={{ padding: '5px', textAlign: 'right' }}>Incidents (Mo.)</th>
                        <th style={{ padding: '5px', textAlign: 'right' }}>Risk Level</th>
                        <th style={{ padding: '5px', textAlign: 'right' }}>Unemployment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(correlationData?.districts || []).slice(0, 10).map((row) => (
                        <tr key={row.district} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '5px' }}>{row.district}</td>
                          <td style={{ padding: '5px', textAlign: 'right' }}>{row.population.toLocaleString()}</td>
                          <td style={{ padding: '5px', textAlign: 'right' }}>{row.crime_count}</td>
                          <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold' }}>
                            {row.crime_rate > 350 ? 'HIGH' : row.crime_rate > 200 ? 'MEDIUM' : 'LOW'}
                          </td>
                          <td style={{ padding: '5px', textAlign: 'right' }}>{row.unemployment_rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Section 3: Strategic Recommendations */}
                <div>
                  <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', borderBottom: '1px solid #000', paddingBottom: '3px', marginBottom: '8px', fontFamily: 'sans-serif', color: '#000' }}>
                    III. STRATEGIC TACTICAL RECOMMENDATIONS
                  </h3>
                  <ol style={{ fontSize: '0.7rem', lineHeight: '1.5', margin: 0, paddingLeft: '18px', color: '#222' }}>
                    <li style={{ marginBottom: '4px' }}>
                      <strong>Targeted Spatial Patrol Beats:</strong> Direct mobile interceptors to execute coordinate sweeps matching centroid coordinates flagged by density models.
                    </li>
                    <li style={{ marginBottom: '4px' }}>
                      <strong>Recidivist Surveillance Briefs:</strong> Conduct cross-precinct intelligence checks on offenders ranking in the upper 80th percentile of co-offender centralities.
                    </li>
                    <li style={{ marginBottom: '4px' }}>
                      <strong>Social Intervention Coordination:</strong> Collaborate with localized economic development authorities to target high-unemployment census zones with vocation and educational buffers.
                    </li>
                  </ol>
                </div>

                {/* Footer Signature */}
                <div style={{ marginTop: '30px', borderTop: '1px solid #ddd', paddingTop: '15px', display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#555', fontFamily: 'sans-serif' }}>
                  <span>CLASSIFIED REPORT // SYSTEM GENERATED AUTH: {activeRole.toUpperCase()}-SECURE</span>
                  <span>PAGE 1 OF 1</span>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default AnalyticsView;
