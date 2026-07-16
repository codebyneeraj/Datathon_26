import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ScatterChart,
  Scatter,
  LabelList
} from 'recharts';

const CorrelationChart = ({ correlationData }) => {
  const [metric, setMetric] = useState('unemployment_rate');

  if (!correlationData || !correlationData.districts) {
    return <div className="network-placeholder">Loading correlation model...</div>;
  }

  const { correlations, districts } = correlationData;

  // Format data for the coefficients bar chart
  const coefficientsData = [
    {
      name: 'Unemployment',
      value: correlations.unemployment,
      color: correlations.unemployment > 0 ? 'var(--accent-red)' : 'var(--accent-green)'
    },
    {
      name: 'Urbanization',
      value: correlations.urbanization,
      color: correlations.urbanization > 0 ? 'var(--accent-amber)' : 'var(--accent-green)'
    },
    {
      name: 'Literacy',
      value: correlations.literacy,
      color: correlations.literacy > 0 ? 'var(--accent-red)' : 'var(--accent-green)'
    }
  ];

  // Format data for district comparison
  const districtData = districts.map(d => ({
    name: d.district,
    crimeRate: d.crime_rate,
    metricValue: d[metric],
    population: d.population
  }));

  const getMetricLabel = () => {
    if (metric === 'unemployment_rate') return 'Unemployment Rate (%)';
    if (metric === 'urbanization_index') return 'Urbanization Index (0-1)';
    return 'Literacy Rate (%)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Socioeconomic Analysis</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            className="select-input"
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
          >
            <option value="unemployment_rate">Unemployment</option>
            <option value="urbanization_index">Urbanization</option>
            <option value="literacy_rate">Literacy</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', flexGrow: 1, minHeight: 230 }}>
        {/* Pearson Coefficient Chart */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Pearson Correlation (r)
          </span>
          <div style={{ flexGrow: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coefficientsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                <YAxis domain={[-1, 1]} stroke="var(--text-muted)" fontSize={10} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  contentStyle={{ background: '#121620', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                <Bar dataKey="value" barSize={18}>
                  {coefficientsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Chart or Bar Chart showing Crime Rate vs Selected Metric */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Crime Rate vs {getMetricLabel().split(' (')[0]}
          </span>
          <div style={{ flexGrow: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  type="number"
                  dataKey="metricValue"
                  name={getMetricLabel().split(' (')[0]}
                  stroke="var(--text-muted)"
                  fontSize={10}
                  domain={['auto', 'auto']}
                />
                <YAxis
                  type="number"
                  dataKey="crimeRate"
                  name="Crime Rate (per 100k)"
                  stroke="var(--text-muted)"
                  fontSize={10}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '11px', color: '#fff' }}>
                          <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{data.name}</p>
                          <p>Crime Rate: <span style={{ color: 'var(--accent-pink)' }}>{data.crimeRate}</span></p>
                          <p>{getMetricLabel().split(' (')[0]}: <span>{data.metricValue}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Districts" data={districtData} fill="var(--accent-cyan)">
                  {districtData.map((entry, index) => {
                    // Highlight Bengaluru and Hubli-Dharwad
                    const isHighlight = entry.name === 'Bengaluru' || entry.name === 'Hubli-Dharwad';
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.name === 'Hubli-Dharwad' ? 'var(--accent-red)' : entry.name === 'Bengaluru' ? 'var(--accent-pink)' : 'var(--accent-cyan)'}
                        radius={isHighlight ? 8 : 5}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrelationChart;
