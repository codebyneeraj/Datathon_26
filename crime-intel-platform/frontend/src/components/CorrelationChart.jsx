import React, { useState } from 'react';
import CustomSelect from './CustomSelect';
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
  Scatter
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

  // Round domain bounds to nearest sensible step based on value magnitude
  // This prevents ugly tick values like 3.58, 4.58, 299996, etc.
  const snapToNice = (val, isFloor) => {
    if (val === 0) return 0;
    const abs = Math.abs(val);
    let step;
    if (abs < 1) step = 0.1;
    else if (abs < 10) step = 1;
    else if (abs < 100) step = 5;
    else if (abs < 1000) step = 50;
    else if (abs < 10000) step = 500;
    else step = 10000;
    return isFloor ? Math.floor(val / step) * step : Math.ceil(val / step) * step;
  };

  const xValues = districtData.map(d => d.metricValue);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const xRange = xMax - xMin;
  const xPad = xRange * 0.1 || (metric === 'urbanization_index' ? 0.1 : 1);
  const xDomain = [snapToNice(xMin - xPad, true), snapToNice(xMax + xPad, false)];

  const yValues = districtData.map(d => d.crimeRate);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const yRange = yMax - yMin;
  const yPad = yRange * 0.1 || 1;
  const yDomain = [snapToNice(yMin - yPad, true), snapToNice(yMax + yPad, false)];

  const fmtTick = (v) => {
    if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
    if (!Number.isInteger(v)) return parseFloat(v.toFixed(2)).toString();
    return v;
  };

  const getMetricLabel = () => {
    if (metric === 'unemployment_rate') return 'Unemployment Rate (%)';
    if (metric === 'urbanization_index') return 'Urbanization Index (0-1)';
    return 'Literacy Rate (%)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      {/* Toolbar: only the metric selector, right-aligned */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <CustomSelect
          value={metric}
          onChange={(val) => setMetric(val)}
          options={[
            { value: 'unemployment_rate', label: 'Unemployment' },
            { value: 'urbanization_index', label: 'Urbanization' },
            { value: 'literacy_rate', label: 'Literacy' }
          ]}
          style={{ width: '140px' }}
          buttonStyle={{ padding: '4px 10px', fontSize: '0.75rem' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1rem', flexGrow: 1, minHeight: 0 }}>
        {/* Pearson Coefficient Chart */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
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
                {/* Added padding to prevent large empty borders on sides, Flaw 9 */}
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} padding={{ left: 20, right: 20 }} />
                <YAxis domain={[-1, 1]} stroke="var(--text-muted)" fontSize={10} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                <Tooltip
                  contentStyle={{ background: '#121620', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                />
                {/* Increased bar size for better proportions, Flaw 9 */}
                <Bar dataKey="value" barSize={35}>
                  {coefficientsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Scatter Chart or Bar Chart showing Crime Rate vs Selected Metric */}
        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginBottom: '0.5rem', textAlign: 'center' }}>
            Crime Rate vs {getMetricLabel().split(' (')[0]}
          </span>
          <div style={{ flexGrow: 1, minHeight: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart
                margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                {/* Tight domain bounds and tickCount for matching gridlines, Flaw 9 */}
                <XAxis
                  type="number"
                  dataKey="metricValue"
                  name={getMetricLabel().split(' (')[0]}
                  stroke="var(--text-muted)"
                  fontSize={10}
                  domain={xDomain}
                  tickCount={5}
                  tickFormatter={fmtTick}
                />
                <YAxis
                  type="number"
                  dataKey="crimeRate"
                  name="Crime Rate (per 100k)"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  domain={yDomain}
                  tickCount={5}
                  tickFormatter={fmtTick}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.1)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{ background: '#121620', border: '1px solid rgba(255,255,255,0.1)', padding: '0.5rem', borderRadius: '6px', fontSize: '11px', color: '#fff' }}>
                          <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{data.name}</p>
                          <p>Crime Rate: <span style={{ color: 'var(--accent-blue)', fontWeight: '600' }}>{data.crimeRate}</span></p>
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
                        /* Replaced pink accent with blue for Bengaluru to avoid pink overloading, Flaw 7 */
                        fill={entry.name === 'Hubli-Dharwad' ? 'var(--accent-red)' : entry.name === 'Bengaluru' ? 'var(--accent-blue)' : 'var(--accent-cyan)'}
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
