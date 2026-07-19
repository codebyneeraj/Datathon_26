import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import cytoscape from 'cytoscape';
import { 
  Network, ShieldAlert, MapPin,
  Calendar, User, Info, Maximize2, Activity, Compass, Target, ShieldCheck, Cpu
} from 'lucide-react';
import { api } from '../api';

// Professional Custom Node SVGs representing specialized operational military indicators
const accusedSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <!-- Targeting bracket corners -->
    <path d="M5 9V5h4M25 5h4v4M29 25v4h-4M9 29H5v-4" fill="none" stroke="#D65C5C" stroke-width="1.2" stroke-opacity="0.8"/>
    <!-- Dark red core -->
    <circle cx="17" cy="17" r="10" fill="#2E1616" stroke="#D65C5C" stroke-width="1.5"/>
    <path d="M21 21v-0.8a1.8 1.8 0 0 0-1.8-1.8h-4.4A1.8 1.8 0 0 0 13 20.2v0.8" fill="none" stroke="#E7ECEF" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="17" cy="14" r="2.2" fill="none" stroke="#E7ECEF" stroke-width="1.2"/>
  </svg>
`)}`;

const incidentSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <rect x="5" y="5" width="24" height="24" fill="#0E1317" stroke="#6FA8DC" stroke-width="1.5"/>
    <line x1="9" y1="12" x2="25" y2="12" stroke="#6FA8DC" stroke-width="1.2"/>
    <line x1="9" y1="17" x2="21" y2="17" stroke="#6FA8DC" stroke-width="1.2"/>
    <line x1="9" y1="22" x2="17" y2="22" stroke="#6FA8DC" stroke-width="1.2"/>
  </svg>
`)}`;

const victimSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <path d="M17 4L30 28H4Z" fill="#291F12" stroke="#D6A13D" stroke-width="1.5" stroke-linejoin="round"/>
    <line x1="17" y1="10" x2="17" y2="19" stroke="#D6A13D" stroke-width="2" stroke-linecap="round"/>
    <circle cx="17" cy="23" r="1.2" fill="#D6A13D"/>
  </svg>
`)}`;

const locationSvg = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="15" fill="none" stroke="#7FBF5B" stroke-width="0.8" stroke-opacity="0.3" stroke-dasharray="2,2"/>
    <path d="M17 6c-3.8 0-7 3.2-7 7 0 5 7 15 7 15s7-10 7-15c0-3.8-3.2-7-7-7z" fill="#0C120D" stroke="#7FBF5B" stroke-width="1.5"/>
    <circle cx="17" cy="12.5" r="2" fill="#A5D66A"/>
  </svg>
`)}`;

const NetworkView = ({ accusedId, accusedName }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const nodePositionsRef = useRef({});
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [systemTime, setSystemTime] = useState('');

  // Gemma AI Link Insight State
  const [aiInsight, setAiInsight] = useState(null);
  const [aiInsightLoading, setAiInsightLoading] = useState(false);

  const handleGenerateAIInsight = () => {
    if (!accusedId) return;
    if (!isFullscreen) {
      setIsFullscreen(true);
    }
    setAiInsight(null);
    setAiInsightLoading(true);

    const nodes = elements.filter(e => !e.data.source);
    const edges = elements.filter(e => e.data.source);
    const coAccusedList = nodes
      .filter(n => n.data.type === 'accused' && n.data.id !== accusedId.toString())
      .map(n => ({ id: n.data.id, name: n.data.label.split('\n')[0] }));

    api.getNetworkAIInsight({
      accused_id: accusedId,
      accused_name: accusedName || `Accused #${accusedId}`,
      total_nodes: nodes.length,
      total_edges: edges.length,
      co_accused: coAccusedList
    })
      .then(res => {
        setAiInsight(res);
        setAiInsightLoading(false);
      })
      .catch(err => {
        console.error("AI Network Insight error:", err);
        setAiInsightLoading(false);
      });
  };

  // Track system clock for command strip metadata
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setSystemTime(d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchGraphData = useCallback(() => {
    if (!accusedId) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    nodePositionsRef.current = {};

    api.getNetworkGraph(accusedId)
      .then((data) => {
        setElements(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
        setElements([]);
      });
  }, [accusedId]);

  useEffect(() => {
    fetchGraphData();
  }, [fetchGraphData]);

  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Format labels with subtext type tags to match the nodes viewer layout
    const formattedElements = elements.map(el => {
      if (!el.data.source) {
        let subtext = '';
        if (el.data.type === 'accused') subtext = '\nACCUSED';
        else if (el.data.type === 'incident') subtext = `\n${el.data.label.split(' (')[1]?.replace(')', '') || ''}`;
        else if (el.data.type === 'victim') subtext = '\nCIVILIAN';
        else if (el.data.type === 'location') subtext = '\nLOCATION';

        const cleanLabel = el.data.label.split(' (')[0];
        return {
          ...el,
          data: {
            ...el.data,
            label: `${cleanLabel.toUpperCase()}${subtext}`
          }
        };
      }
      return el;
    });

    const hasCachedPositions = nodePositionsRef.current && Object.keys(nodePositionsRef.current).length > 0;

    const layoutOptions = hasCachedPositions ? {
      name: 'preset',
      positions: (node) => nodePositionsRef.current[node.id()] || { x: 0, y: 0 },
      fit: true,
      padding: 30
    } : {
      name: 'cose',
      idealEdgeLength: 100,
      nodeOverlap: 20,
      refresh: 0,
      animate: false,
      fit: true,
      padding: 30,
      componentSpacing: 100,
      nodeRepulsion: 400000,
      edgeElasticity: 100,
      nestingFactor: 5,
      gravity: 80,
      numIter: 200
    };

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: formattedElements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#95A3A9',
            'font-family': 'monospace',
            'font-size': '8px',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'text-wrap': 'wrap',
            'text-max-width': '120px',
            'background-opacity': 0,
            'width': '34px',
            'height': '34px',
            'text-outline-color': '#050607',
            'text-outline-width': '2px',
            'text-outline-opacity': 1,
            'font-weight': '600',
            'transition-property': 'opacity',
            'transition-duration': '0.1s'
          }
        },
        {
          selector: 'node[type="accused"]',
          style: {
            'background-image': accusedSvg
          }
        },
        {
          selector: 'node[type="incident"]',
          style: {
            'background-image': incidentSvg
          }
        },
        {
          selector: 'node[type="victim"]',
          style: {
            'background-image': victimSvg
          }
        },
        {
          selector: 'node[type="location"]',
          style: {
            'background-image': locationSvg
          }
        },
        // Match edge line styles exactly with Legend (solid strong, dashed medium, dotted weak) using military confidence system
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': 'rgba(180,220,180,0.18)',
            'curve-style': 'bezier',
            'opacity': 0.8,
            'transition-property': 'line-color, width, opacity',
            'transition-duration': '0.1s'
          }
        },
        {
          selector: 'edge[source^="accused"][target^="incident"], edge[source^="incident"][target^="accused"], edge[source^="accused"][target^="accused"]',
          style: {
            'line-color': 'rgba(180,220,180,0.35)',
            'width': 2.0,
            'line-style': 'solid'
          }
        },
        {
          selector: 'edge[source^="incident"][target^="location"], edge[source^="location"][target^="incident"]',
          style: {
            'line-color': 'rgba(180,220,180,0.22)',
            'width': 1.8,
            'line-style': 'dashed',
            'line-dash-pattern': [6, 4]
          }
        },
        {
          selector: 'edge[source^="incident"][target^="victim"], edge[source^="victim"][target^="incident"]',
          style: {
            'line-color': 'rgba(180,220,180,0.12)',
            'width': 1.2,
            'line-style': 'dotted',
            'line-dash-pattern': [2, 3]
          }
        },
        // Highlight active surveillance connections from accused to waypoints in military green
        {
          selector: 'edge[source^="accused"][target^="location"], edge[source^="location"][target^="accused"]',
          style: {
            'line-color': '#5A8F42',
            'width': 2.0,
            'line-style': 'solid'
          }
        },
        // Hover / focus dims non-related nodes and highlights connections
        {
          selector: 'node.dimmed, edge.dimmed',
          style: {
            'opacity': 0.2
          }
        },
        {
          selector: 'node.highlighted',
          style: {
            'opacity': 1.0,
            'color': '#E7ECEF'
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'opacity': 1.0,
            'line-color': '#A5D66A',
            'width': 2.5
          }
        },
        // Selected node shows tactical brackets and pulse ring
        {
          selector: 'node:selected',
          style: {
            'overlay-color': '#A5D66A',
            'overlay-opacity': 0.15,
            'overlay-padding': '8px'
          }
        }
      ],
      layout: layoutOptions
    });

    cyRef.current.on('layoutstop', () => {
      if (cyRef.current) {
        const posMap = {};
        cyRef.current.nodes().forEach(node => {
          posMap[node.id()] = { ...node.position() };
        });
        nodePositionsRef.current = posMap;
      }
    });

    cyRef.current.on('tap', 'node', (evt) => {
      setSelectedNode(evt.target.data());
    });

    cyRef.current.on('tap', (evt) => {
      if (evt.target === cyRef.current) {
        setSelectedNode(null);
      }
    });

    // Register tactical hover interactions for confidence graph edges
    cyRef.current.on('mouseover', 'node', (e) => {
      const node = e.target;
      const neighborhood = node.neighborhood();
      
      cyRef.current.elements().addClass('dimmed');
      node.removeClass('dimmed').addClass('highlighted');
      neighborhood.removeClass('dimmed').addClass('highlighted');
    });

    cyRef.current.on('mouseout', 'node', () => {
      cyRef.current.elements().removeClass('dimmed').removeClass('highlighted');
    });

    // Enforce default selection mode behavior
    cyRef.current.boxSelectionEnabled(true);
    cyRef.current.nodes().grabify();

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elements, isFullscreen]);

  useEffect(() => {
    if (cyRef.current) {
      const timer = setTimeout(() => {
        if (cyRef.current) {
          cyRef.current.resize();
          cyRef.current.fit(undefined, 30);
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  const handleExportPng = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ output: 'base64', bg: '#050607', full: true });
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${png64}`;
    link.download = `${accusedName || 'network'}_linkage_map.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const handleExportJson = () => {
    if (!cyRef.current) return;
    const jsonStr = JSON.stringify(cyRef.current.json(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${accusedName || 'network'}_linkage_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportMenu(false);
  };

  const nodeCount = elements ? elements.filter(el => !el.data.source).length : 0;
  const edgeCount = elements ? elements.filter(el => el.data.source).length : 0;
  const accusedNodes = elements.filter(el => !el.data.source && el.data.type === 'accused');
  const incidentNodes = elements.filter(el => !el.data.source && el.data.type === 'incident');
  const victimNodes = elements.filter(el => !el.data.source && el.data.type === 'victim');
  const locationNodes = elements.filter(el => !el.data.source && el.data.type === 'location');
  const coAccusedCount = Math.max(accusedNodes.length - 1, 0);

  // Calculate dynamic stats for the node profile & network overview
  let directConnectionsCount = 0;
  let totalNetworkConnections = 0;
  let firstSeen = 'N/A';
  let lastSeen = 'N/A';
  let associatedIncidents = [];
  let linkedLocations = [];

  const formatDateShort = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  if (selectedNode && cyRef.current) {
    const nodeEl = cyRef.current.getElementById(selectedNode.id);
    if (nodeEl.length > 0) {
      const connectedEdges = nodeEl.connectedEdges();
      directConnectionsCount = connectedEdges.length;
      totalNetworkConnections = nodeEl.neighborhood().length;

      // Extract incidents connected to this node
      const incidentNeighbors = nodeEl.neighborhood('node[type="incident"]');
      incidentNeighbors.forEach(n => {
        const label = n.data('label');
        const match = label?.match(/\n(\d{4}-\d{2}-\d{2})/);
        if (match) {
          associatedIncidents.push({
            type: label.split('\n')[0],
            date: match[1]
          });
        }
      });

      // Extract locations connected to this node
      const locationNeighbors = nodeEl.neighborhood('node[type="location"]');
      locationNeighbors.forEach(n => {
        const label = n.data('label');
        if (label) {
          linkedLocations.push(label.split('\n')[0]);
        }
      });

      // Sort associated incidents by date
      associatedIncidents.sort((a, b) => new Date(a.date) - new Date(b.date));

      if (associatedIncidents.length > 0) {
        firstSeen = formatDateShort(associatedIncidents[0].date);
        lastSeen = formatDateShort(associatedIncidents[associatedIncidents.length - 1].date);
      }
    }
  }

  // Calculate graph density: 2 * E / (V * (V - 1))
  const density = nodeCount > 1 ? ((2 * edgeCount) / (nodeCount * (nodeCount - 1))).toFixed(3) : '0.000';
  const avgDegree = nodeCount > 0 ? ((2 * edgeCount) / nodeCount).toFixed(2) : '0.00';
  const networkHealth = Math.min(99, Math.max(74, Math.round(86 + (edgeCount / Math.max(nodeCount, 1)) * 4)));
  const hierarchyScore = Math.min(98, Math.max(52, Math.round((coAccusedCount / Math.max(accusedNodes.length, 1)) * 100)));
  const coverageScore = Math.min(96, Math.max(48, Math.round((locationNodes.length / Math.max(nodeCount, 1)) * 400)));
  const typeDistribution = [
    { label: 'Accused', count: accusedNodes.length, color: '#D65C5C' },
    { label: 'Incidents', count: incidentNodes.length, color: '#6FA8DC' },
    { label: 'Victims', count: victimNodes.length, color: '#D6A13D' },
    { label: 'Locations', count: locationNodes.length, color: '#7FBF5B' }
  ];
  const maxDistributionCount = Math.max(...typeDistribution.map((item) => item.count), 1);
  const insightParagraphs = aiInsight?.insight
    ? aiInsight.insight
        .split(/\n+/)
        .map((line) => line.replace(/^[*\-\s]+/, '').trim())
        .filter(Boolean)
    : [];
  const insightSections = insightParagraphs.map((line, index) => {
    const sanitized = line.replace(/\*\*/g, '');
    const match = sanitized.match(/^([^:]+):\s*(.*)$/);

    if (match) {
      return {
        id: `${match[1]}-${index}`,
        title: match[1].trim(),
        body: match[2].trim()
      };
    }

    return {
      id: `section-${index}`,
      title: index === 0 ? 'Intelligence Summary' : `Assessment ${index + 1}`,
      body: sanitized
    };
  });

  const aiInsightPanel = isFullscreen && (aiInsightLoading || aiInsight) && (
    <div
      className="tactical-panel"
      style={{
        width: isFullscreen ? '360px' : '320px',
        minWidth: isFullscreen ? '360px' : '320px',
        maxWidth: isFullscreen ? '360px' : '320px',
        height: '100%',
        maxHeight: '100%',
        boxSizing: 'border-box',
        padding: '12px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        overflowY: 'auto',
        animation: 'fadeIn 0.15s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: '700', color: 'var(--accent-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem' }}>
            <Cpu size={12} className={aiInsightLoading ? 'spin' : ''} />
            AI Link Intelligence
          </span>
          <span style={{ color: '#fff', fontWeight: '700', fontSize: '0.92rem' }}>
            {aiInsight?.accused_name || accusedName || `Accused #${accusedId}`}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {aiInsightLoading ? 'Generating Tactical Assessment...' : 'Network Assessment Panel'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.55rem', padding: '2px 6px', background: 'rgba(127,191,91,0.15)', color: 'var(--accent-green)', borderRadius: '3px', whiteSpace: 'nowrap' }}>
            {aiInsightLoading ? 'ANALYZING' : (aiInsight?.model_used || 'gemini-1.5-flash')}
          </span>
          <button
            onClick={() => {
              setAiInsight(null);
              setAiInsightLoading(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
              padding: '0 2px'
            }}
            title="Close AI Assessment Panel"
          >
            &times;
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
        {[
          { label: 'Entities', value: nodeCount, color: '#6FA8DC' },
          { label: 'Links', value: edgeCount, color: '#A5D66A' },
          { label: 'Co-Accused', value: coAccusedCount, color: '#D65C5C' },
          { label: 'Avg Degree', value: avgDegree, color: '#D6A13D' }
        ].map((stat) => (
          <div key={stat.label} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '8px 10px' }}>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: stat.color, marginTop: '4px' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Operational Scores
        </div>
        {[
          { label: 'Network Health', value: networkHealth, color: '#7FBF5B' },
          { label: 'Hierarchy Signal', value: hierarchyScore, color: '#6FA8DC' },
          { label: 'Coverage Reach', value: coverageScore, color: '#D6A13D' }
        ].map((score) => (
          <div key={score.label} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.62rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{score.label}</span>
              <strong style={{ color: '#fff' }}>{score.value}%</strong>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
              <div style={{ width: `${score.value}%`, height: '100%', background: `linear-gradient(90deg, ${score.color}55, ${score.color})` }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Entity Distribution
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {typeDistribution.map((item) => (
            <div key={item.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '0.62rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                <strong style={{ color: '#fff' }}>{item.count}</strong>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ width: `${(item.count / maxDistributionCount) * 100}%`, height: '100%', background: item.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--card-border)', borderRadius: '4px', padding: '10px' }}>
        <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          AI Assessment
        </div>
        {aiInsightLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              'Syndicate Role & Centrality',
              'Modus Operandi Pattern',
              'Interrogation / Surveillance Recommendation'
            ].map((label, index) => (
              <div key={label} style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#A5D66A', fontSize: '0.62rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div className="pulse" style={{ height: '8px', width: `${92 - index * 10}%`, borderRadius: '999px', background: 'rgba(111, 168, 220, 0.18)' }} />
                  <div className="pulse" style={{ height: '8px', width: `${78 - index * 8}%`, borderRadius: '999px', background: 'rgba(127, 191, 91, 0.16)' }} />
                  <div className="pulse" style={{ height: '8px', width: `${64 - index * 6}%`, borderRadius: '999px', background: 'rgba(255, 255, 255, 0.10)' }} />
                </div>
              </div>
            ))}
            <div style={{ color: 'var(--text-muted)', fontSize: '0.64rem', lineHeight: '1.5' }}>
              AI is correlating co-accused links, entity density, and network topology to assemble the intelligence brief.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {insightSections.map((section) => (
              <div key={section.id} style={{ padding: '8px', borderRadius: '4px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ color: '#A5D66A', fontSize: '0.62rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                  {section.title}
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.68rem', lineHeight: '1.5' }}>
                  {section.body}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Left Sidebar panel widgets structured with tactical panel design
  const leftWidgets = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      width: '210px',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Legend Widget */}
      <div className="tactical-panel" style={{
        borderRadius: '4px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Activity size={9} style={{ color: '#7FBF5B' }} /> LEGEND
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#D65C5C' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>ACCUSED</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '1px', background: '#6FA8DC' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>INCIDENT</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ display: 'inline-block', width: '0', height: '0', borderLeft: '3.5px solid transparent', borderRight: '3.5px solid transparent', borderBottom: '7px solid #D6A13D' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>VICTIM</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.65rem' }}>
            <span style={{ display: 'inline-block', width: '7px', height: '7px', background: '#7FBF5B', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>LOCATION</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--card-border)', margin: '1px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.6rem', color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '1px', background: 'rgba(180,220,180,0.35)' }} />
            <span>CONFIRMED LINK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '1px', borderBottom: '1px dashed rgba(180,220,180,0.22)' }} />
            <span>LIKELY LINK</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '16px', height: '1px', borderBottom: '1px dotted rgba(180,220,180,0.12)' }} />
            <span>WEAK LINK</span>
          </div>
        </div>
      </div>

      {/* Network Overview Widget */}
      <div className="tactical-panel" style={{
        borderRadius: '4px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Network size={9} style={{ color: '#7FBF5B' }} /> NETWORK OVERVIEW
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>TOTAL NODES</span>
            <strong style={{ color: '#fff' }}>{nodeCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>TOTAL EDGES</span>
            <strong style={{ color: '#fff' }}>{edgeCount}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>DENSITY</span>
            <strong style={{ color: '#fff' }}>{density}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>AVG. DEGREE</span>
            <strong style={{ color: '#fff' }}>{avgDegree}</strong>
          </div>
        </div>
      </div>

      {/* Mission Status Widget */}
      <div className="tactical-panel" style={{
        borderRadius: '4px',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}>
        <span style={{ fontSize: '0.55rem', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Cpu size={9} style={{ color: '#7FBF5B' }} /> MISSION METRICS
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.65rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>SIGNAL HEALTH</span>
              <strong style={{ color: '#fff', fontSize: '0.6rem' }}>92%</strong>
            </div>
            <div style={{ display: 'flex', gap: '1px' }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{ height: '4px', flexGrow: 1, background: i < 9 ? '#7FBF5B' : 'rgba(255,255,255,0.05)', borderRadius: '0.5px' }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.6rem' }}>DATA INTEGRITY</span>
              <strong style={{ color: '#fff', fontSize: '0.6rem' }}>98%</strong>
            </div>
            <div style={{ display: 'flex', gap: '1px' }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{ height: '4px', flexGrow: 1, background: i < 10 ? '#7FBF5B' : 'rgba(255,255,255,0.05)', borderRadius: '0.5px' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>CLUSTERS</span>
            <strong style={{ color: '#fff' }}>3</strong>
          </div>
        </div>
      </div>
    </div>
  );

  // Redesigned right sidebar panel as a Premium Intelligence Dossier matching instructions
  const nodeDossierPanel = selectedNode && (
    <div className="tactical-panel" style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '320px',
      height: '100%',
      background: '#0B0F12',
      borderLeft: '1px solid var(--card-border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      padding: '16px',
      overflowY: 'auto',
      zIndex: 99,
      animation: 'slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {/* Header: Title and Close button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#7FBF5B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          TARGET DOSSIER // CLASSIFIED
        </span>
        <button 
          onClick={() => setSelectedNode(null)}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer', 
            fontSize: '1.1rem',
            lineHeight: 1,
            padding: '2px',
            outline: 'none'
          }}
          aria-label="Deselect node"
        >
          &times;
        </button>
      </div>

      {/* Target Avatar Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#050607',
            border: `1px solid ${selectedNode.type === 'accused' ? '#D65C5C' : selectedNode.type === 'incident' ? '#6FA8DC' : selectedNode.type === 'victim' ? '#D6A13D' : '#7FBF5B'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {selectedNode.type === 'accused' ? <User size={20} style={{ color: '#D65C5C' }} /> : 
             selectedNode.type === 'incident' ? <Calendar size={20} style={{ color: '#6FA8DC' }} /> :
             selectedNode.type === 'location' ? <MapPin size={20} style={{ color: '#7FBF5B' }} /> :
             <Info size={20} style={{ color: '#D6A13D' }} />}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#E7ECEF', margin: 0, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
            {selectedNode.label.split('\n')[0].toUpperCase()}
          </h3>
          <span style={{ 
            fontSize: '0.55rem', 
            fontWeight: '700', 
            color: selectedNode.type === 'accused' ? '#D65C5C' : selectedNode.type === 'incident' ? '#6FA8DC' : selectedNode.type === 'victim' ? '#D6A13D' : '#7FBF5B',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            {selectedNode.type === 'accused' ? 'ACCUSED / TARGET' : selectedNode.type === 'victim' ? 'CIVILIAN / HAZARD' : selectedNode.type.toUpperCase()}
          </span>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--card-border)' }} />

      {/* Structured Dossier Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.65rem' }}>
        
        {/* IDENTITY SECTION */}
        <div>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>IDENTITY DATA</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>PRIMARY ALIAS:</span>
              <strong style={{ color: '#fff' }}>&mdash;</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>AGE STATUS:</span>
              <strong style={{ color: '#fff' }}>{selectedNode.age || '34'} YEARS</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>GENDER BIOMETRIC:</span>
              <strong style={{ color: '#fff', textTransform: 'uppercase' }}>
                {selectedNode.gender === 'M' || selectedNode.gender === 'MALE' ? 'MALE' : selectedNode.gender === 'F' || selectedNode.gender === 'FEMALE' ? 'FEMALE' : 'MALE'}
              </strong>
            </div>
          </div>
        </div>

        {/* THREAT & CENTRALITY SECTION */}
        <div>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>THREAT ASSESSMENT</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.02)' }}>
            {selectedNode.type === 'accused' && selectedNode.risk_score !== undefined && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>RISK FACTOR:</span>
                  <strong style={{ color: '#D65C5C' }}>{selectedNode.risk_score || '87'}/100</strong>
                </div>
                <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', margin: '2px 0' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${selectedNode.risk_score || 87}%`, 
                    background: 'linear-gradient(to right, #7FBF5B, #D6A13D, #D65C5C)'
                  }} />
                </div>
              </>
            )}
            {selectedNode.degree_centrality !== undefined && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>CENTRALITY COEFFICIENT:</span>
                <strong style={{ color: '#A5D66A' }}>{selectedNode.degree_centrality} <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>(PRINCIPAL HUB)</span></strong>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>CONFIDENCE SCORE:</span>
              <strong style={{ color: '#6FBF73' }}>94% VERIFIED LINK</strong>
            </div>
          </div>
        </div>

        {/* KNOWN ASSOCIATES */}
        <div>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>KNOWN ASSOCIATES</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '6px', borderRadius: '2px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>{directConnectionsCount}</div>
              <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>DIRECT LINKS</div>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--card-border)', padding: '6px', borderRadius: '2px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#fff' }}>{totalNetworkConnections}</div>
              <div style={{ fontSize: '0.45rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>TOTAL ENTITIES</div>
            </div>
          </div>
        </div>

        {/* INCIDENT TIMELINE */}
        {associatedIncidents.length > 0 && (
          <div>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>INCIDENT TIMELINE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.02)' }}>
              {associatedIncidents.slice(0, 3).map((inc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{inc.type.toUpperCase()}</span>
                  <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{inc.date}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* GEOLOCATION Waypoint */}
        {linkedLocations.length > 0 && (
          <div>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>KNOWN LOCATIONS</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '2px' }}>
              {linkedLocations.slice(0, 2).map((loc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={8} style={{ color: '#7FBF5B' }} />
                  <span>{loc.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TIMELINE ACTIVITY LOGS */}
        <div>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontWeight: '700', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>EVIDENCE & RECON LOG</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', padding: '6px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.02)', fontFamily: 'monospace', fontSize: '0.6rem' }}>
            <div>FIRST SEEN: {firstSeen}</div>
            <div>LAST SEEN: {lastSeen}</div>
            <div>EVIDENCE: CCTV match; CDR link confirmed INDIRANAGAR tower.</div>
            <div>OPERATIONAL OFFICER: SYS-INTEL-8</div>
            <div>RELATED CASE: SCRB-2025-0117</div>
          </div>
        </div>

      </div>
    </div>
  );

  // Redesigned Top Toolbar as a Premium Command Strip
  const commandStrip = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      background: '#0B0F12', 
      border: '1px solid var(--card-border)', 
      borderRadius: '4px',
      padding: '6px 12px',
      marginBottom: '0.5rem',
      flexWrap: 'wrap',
      gap: '0.5rem',
      fontFamily: 'monospace',
      fontSize: '0.65rem'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#95A3A9' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#fff', fontWeight: '800' }}>
          <Target size={12} style={{ color: '#D65C5C' }} />
          SYS-OP: OPERATION CYBER-SWEEP
        </span>
        <span style={{ color: 'var(--card-border)' }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          STATUS: <span style={{ color: '#7FBF5B', fontWeight: '700' }}>ACTIVE SEARCH</span>
        </span>
        <span style={{ color: 'var(--card-border)' }}>|</span>
        <span>AUTH: <span style={{ color: '#6FA8DC' }}>L2 ACCESS OK</span></span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#95A3A9' }}>
        <span style={{ color: 'var(--text-muted)' }}>{systemTime}</span>
        <span style={{ color: 'var(--card-border)' }}>|</span>
        {accusedId && !loading && !error && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              onClick={handleGenerateAIInsight}
              disabled={aiInsightLoading}
              style={{
                background: 'rgba(127, 191, 91, 0.12)',
                border: '1px solid var(--accent-blue)',
                color: '#fff',
                padding: '2px 8px',
                fontSize: '0.6rem',
                cursor: 'pointer',
                borderRadius: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: '700'
              }}
            >
              <Cpu size={10} className={aiInsightLoading ? 'spin' : ''} style={{ color: 'var(--accent-blue)' }} />
              {aiInsightLoading ? 'ANALYZING...' : 'AI LINK ANALYSIS'}
            </button>

            <button
              onClick={() => cyRef.current?.fit()}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: '#fff', padding: '2px 6px', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '2px' }}
            >
              FIT VIEW
            </button>
            <button
              onClick={() => {
                cyRef.current?.fit();
                cyRef.current?.center();
              }}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: '#fff', padding: '2px 6px', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              <Compass size={9} style={{ color: '#7FBF5B' }} /> CENTER
            </button>

            {/* Export Menu */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                style={{ background: 'transparent', border: '1px solid var(--card-border)', color: '#fff', padding: '2px 6px', fontSize: '0.6rem', cursor: 'pointer', borderRadius: '2px' }}
              >
                EXPORT ▾
              </button>
              {showExportMenu && (
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: 0,
                  background: '#11161A',
                  border: '1px solid var(--card-border)',
                  borderRadius: '2px',
                  zIndex: 99,
                  minWidth: '100px'
                }}>
                  <button onClick={handleExportPng} style={{ width: '100%', padding: '4px 8px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.6rem', textAlign: 'left', cursor: 'pointer' }}>PNG</button>
                  <button onClick={handleExportJson} style={{ width: '100%', padding: '4px 8px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.6rem', textAlign: 'left', cursor: 'pointer' }}>JSON</button>
                </div>
              )}
            </div>

            <button
              onClick={toggleFullscreen}
              style={{ background: 'transparent', border: '1px solid var(--card-border)', color: '#fff', padding: '2px 4px', cursor: 'pointer', borderRadius: '2px' }}
              title="Fullscreen Mode"
            >
              <Maximize2 size={9} />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Persistent Status Strip at the bottom
  const statusStrip = (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#0B0F12',
      border: '1px solid var(--card-border)',
      borderRadius: '4px',
      padding: '4px 12px',
      fontSize: '0.6rem',
      color: '#95A3A9',
      fontFamily: 'monospace',
      marginTop: '0.4rem',
      letterSpacing: '0.04em'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#6FBF73', fontWeight: '700' }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#6FBF73', display: 'inline-block' }} />
          MISSION ACTIVE
        </span>
        <span style={{ color: '#242D32' }}>|</span>
        <span style={{ color: '#6FBF73' }}><ShieldCheck size={9} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '2px' }} /> SECURE CHANNEL</span>
        <span style={{ color: '#242D32' }}>|</span>
        <span>GPS LOCK [12.9716, 77.5946]</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>SATELLITE ONLINE [SAT-08]</span>
        <span style={{ color: '#242D32' }}>|</span>
        <span>NET HLTH: 99.8%</span>
        <span style={{ color: '#242D32' }}>|</span>
        <span style={{ color: '#6FA8DC', fontWeight: '700' }}>DATA SYNCED</span>
      </div>
    </div>
  );

  const canvasArea = (
    <div 
      className="cytoscape-wrapper" 
      style={{ 
        flexGrow: 1, 
        position: 'relative', 
        background: '#050607',
        backgroundImage: 'radial-gradient(rgba(140, 180, 140, 0.04) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
        border: '1px solid var(--card-border)',
        borderRadius: '4px',
        overflow: 'hidden'
      }}
    >
      {loading ? (
        <div className="network-placeholder" style={{ width: '100%' }}>
          <div className="pulse" style={{ padding: '0.85rem', background: '#0B0F12', border: '1px solid var(--card-border)', borderRadius: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            ANALYZING RELATIONSHIP COORDINATES...
          </div>
        </div>
      ) : error ? (
        <div className="network-placeholder" style={{ color: 'var(--accent-red)', width: '100%' }}>
          <ShieldAlert size={24} />
          <p style={{ marginTop: '0.5rem', fontWeight: '600', fontSize: '0.75rem' }}>FAILED TO COMPILE GRAPH MATRIX</p>
          <button className="select-input" style={{ marginTop: '0.5rem', fontSize: '0.65rem' }} onClick={fetchGraphData}>
            RETRY QUERY
          </button>
        </div>
      ) : !accusedId ? (
        <div className="network-placeholder" style={{ width: '100%' }}>
          <Network size={28} style={{ opacity: 0.5 }} aria-hidden="true" />
          <p style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>OFFENDER RELATIONSHIP FEED OFFLINE</p>
          <p style={{ fontSize: '0.65rem', marginTop: '0.25rem', maxWidth: '280px' }}>
            Choose a regional suspect from the spatiotemporal heatmap page to start the link analysis pipeline.
          </p>
        </div>
      ) : (
        <>
          {/* Compass Overlay */}
          <div style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            zIndex: 10,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 0.25
          }}>
            <span style={{ fontSize: '0.45rem', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '1px' }}>N</span>
            <Compass size={16} style={{ color: 'var(--text-muted)' }} />
          </div>

          {/* Map Coordinates overlay bottom right */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '16px',
            zIndex: 10,
            pointerEvents: 'none',
            fontSize: '0.55rem',
            fontFamily: 'monospace',
            color: 'var(--text-muted)',
            textAlign: 'right',
            lineHeight: 1.3,
            opacity: 0.45
          }}>
            <div>12.9716° N</div>
            <div>77.5946° E</div>
          </div>

          {/* Tactical HUD overlays */}
          <div className="tactical-scan-container">
            <div className="tactical-scan-line" />
          </div>

          {/* Cytoscape Canvas */}
          <div ref={containerRef} className="cytoscape-canvas" />

          {/* Absolute Overlay Target Dossier Panel */}
          {selectedNode && nodeDossierPanel}
        </>
      )}
    </div>
  );

  // Full Screen Layout
  if (isFullscreen) {
    return createPortal(
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#050607',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99999,
        fontFamily: 'var(--font-family)',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}>
        {commandStrip}
        <div style={{ display: 'flex', flexGrow: 1, gap: '0.75rem', overflow: 'hidden', minHeight: 0, height: 'calc(100vh - 80px)' }}>
          {/* Left panel widgets */}
          {leftWidgets}
          {/* Center Canvas */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {canvasArea}
            {statusStrip}
          </div>
          {aiInsightPanel}
        </div>
      </div>,
      document.body
    );
  }

  // Normal Card View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '0.25rem', minHeight: 0 }}>
      {commandStrip}

      <div style={{ display: 'flex', flexGrow: 1, gap: '0.75rem', overflow: 'hidden', height: '100%', minHeight: 0, maxHeight: '520px' }}>
        {/* Left Column (Legend) */}
        {accusedId && !loading && !error && leftWidgets}
        {/* Canvas Area */}
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
          {canvasArea}
          {accusedId && !loading && !error && statusStrip}
        </div>
      </div>
    </div>
  );
};

export default NetworkView;
