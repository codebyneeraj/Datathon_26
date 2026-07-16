import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import cytoscape from 'cytoscape';
import { Network, ShieldAlert, Award, FileText, MapPin } from 'lucide-react';
import { api } from '../api';
import Badge from './ui/Badge';

/**
 * @typedef {Object} NetworkNodeData
 * @property {string} id
 * @property {string} label
 * @property {string} type
 * @property {number} degree_centrality
 * @property {number} betweenness_centrality
 * @property {number} centrality
 * @property {number} [risk_score]
 * @property {string} [gender]
 * @property {number} [age]
 * @property {string} [crime_type]
 */

/**
 * NetworkView component rendering relationship graph utilizing Cytoscape.js
 * @param {Object} props
 * @param {number|null} props.accusedId
 * @param {string} props.accusedName
 */
const NetworkView = ({ accusedId, accusedName }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fetchGraphData = useCallback(() => {
    if (!accusedId) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);

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

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-family': 'Outfit, sans-serif',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'background-color': '#475569',
            'border-width': '2px',
            'border-color': 'rgba(255,255,255,0.1)',
            'width': 'mapData(centrality, 0, 1, 22, 48)',
            'height': 'mapData(centrality, 0, 1, 22, 48)',
            /* Outlined text to prevent overlapping/edges blend, Flaw 8 */
            'text-outline-color': '#171B24',
            'text-outline-width': '2px',
            'text-outline-opacity': 1,
            'font-weight': '500'
          }
        },
        {
          selector: 'node[type="accused"]',
          style: {
            /* Changed to Red for danger/flag states, Flaw 7 */
            'background-color': '#ef4444',
            'border-color': '#fca5a5',
            'border-width': '3px',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[type="incident"]',
          style: {
            'background-color': '#00e5ff',
            'border-color': '#38bdf8',
            'shape': 'rectangle'
          }
        },
        {
          selector: 'node[type="victim"]',
          style: {
            'background-color': '#ffb300',
            'border-color': '#fbbf24',
            'shape': 'triangle'
          }
        },
        {
          selector: 'node[type="location"]',
          style: {
            'background-color': '#10b981',
            'border-color': '#34d399',
            'shape': 'hexagon'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#334155',
            'curve-style': 'bezier',
            'opacity': 0.8
          }
        },
        {
          selector: 'node:selected',
          style: {
            'border-color': '#fff',
            'border-width': '4px',
            'shadow-blur': '10px',
            'shadow-color': '#fff',
            'shadow-opacity': 0.5
          }
        }
      ],
      layout: {
        name: 'cose',
        idealEdgeLength: 120, // Increased to spread nodes, Flaw 8
        nodeOverlap: 40,
        refresh: 20,
        fit: true,
        padding: 30,
        componentSpacing: 120,
        nodeRepulsion: 1500000, // Increased to prevent labels overlap, Flaw 8
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000
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

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elements, isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Resize multiple times to ensure cytoscape canvas matches the updated container dimensions
    const resizeCy = () => {
      if (cyRef.current) {
        cyRef.current.resize();
        cyRef.current.fit();
      }
    };
    setTimeout(resizeCy, 50);
    setTimeout(resizeCy, 150);
    setTimeout(resizeCy, 300);
  };

  const handleExportPng = () => {
    if (!cyRef.current) return;
    // Export PNG with Cytoscape base64 method
    const png64 = cyRef.current.png({ output: 'base64', bg: '#090B10', full: true });
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${png64}`;
    link.download = `${accusedName || 'network'}_linkage_map.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const nodeCount = elements ? elements.filter(el => !el.data.source).length : 0;
  const edgeCount = elements ? elements.filter(el => el.data.source).length : 0;

  const content = (
    <div 
      className={isFullscreen ? 'network-fullscreen' : ''} 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '0.75rem', 
        height: '100%',
        position: 'relative'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Network size={12} aria-hidden="true" /> Criminal Linkage Explorer
            {accusedId && !loading && !error && (
              <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)' }}>
                ({nodeCount} nodes, {edgeCount} edges)
              </span>
            )}
          </span>
          {accusedName && (
            <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-blue)', marginTop: '0.15rem', fontWeight: '600' }}>
              Target Case: {accusedName}
            </h4>
          )}
        </div>
        {accusedId && !loading && !error && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              className="select-input"
              onClick={() => {
                if (cyRef.current) {
                  cyRef.current.zoom(cyRef.current.zoom() * 1.2);
                }
              }}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="select-input"
              onClick={() => {
                if (cyRef.current) {
                  cyRef.current.zoom(cyRef.current.zoom() / 1.2);
                }
              }}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem' }}
              title="Zoom Out"
            >
              &minus;
            </button>
            <button
              className="select-input"
              onClick={() => cyRef.current?.fit()}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="Center Graph"
            >
              Center
            </button>
            <button
              className="select-input"
              onClick={handleExportPng}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="Export as PNG Image"
            >
              Export
            </button>
            <button
              className="select-input"
              onClick={toggleFullscreen}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              title="Toggle Fullscreen"
            >
              {isFullscreen ? 'Exit Full' : 'Fullscreen'}
            </button>
          </div>
        )}
      </div>

      <div className="cytoscape-wrapper" style={{ flexGrow: 1 }} tabIndex={0} aria-label="Social relationship graph explorer. Use mouse or trackpad to pan and zoom. Click nodes to inspect.">
        {loading ? (
          <div className="network-placeholder">
            <div className="pulse" style={{ padding: '1rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
              Analyzing relationship coordinates...
            </div>
          </div>
        ) : error ? (
          <div className="network-placeholder" style={{ color: 'var(--accent-red)' }}>
            <ShieldAlert size={28} />
            <p style={{ marginTop: '0.5rem', fontWeight: '600' }}>Failed to compile graph matrix</p>
            <button className="select-input" style={{ marginTop: '0.5rem' }} onClick={fetchGraphData}>
              Retry Query
            </button>
          </div>
        ) : !accusedId ? (
          <div className="network-placeholder">
            <Network size={32} style={{ opacity: 0.5 }} aria-hidden="true" />
            <p style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Offender Network Inactive</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '280px' }}>
              Click on a crime hotspot on the map and choose a regional suspect to map co-conspirators, locations, and victims.
            </p>
          </div>
        ) : (
          <div ref={containerRef} className="cytoscape-canvas" />
        )}
      </div>

      {/* Visual legend key (Flaw 5) */}
      {accusedId && !loading && !error && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid var(--card-border)',
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '11px',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '0.25rem'
        }}>
          <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>Graph Legend:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-red)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Accused</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '8px', background: 'var(--accent-cyan)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Incident</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '0', height: '0', borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderBottom: '10px solid var(--accent-amber)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Victim</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ display: 'inline-block', width: '10px', height: '10px', background: 'var(--accent-green)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>Location</span>
          </div>
        </div>
      )}

      {selectedNode && (
        <div className="selection-details" role="status" aria-live="polite">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Award size={14} aria-hidden="true" /> Node Profile: {selectedNode.label}
          </h4>
          <p style={{ textTransform: 'capitalize' }}>Entity Type: <span>{selectedNode.type}</span></p>
          
          {selectedNode.type === 'accused' && (
            <>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Threat Risk: 
                <Badge level={selectedNode.risk_score >= 70 ? 'high' : selectedNode.risk_score >= 35 ? 'medium' : 'low'}>
                  {selectedNode.risk_score}/100 Risk Rating
                </Badge>
              </p>
              <p>Degree Centrality: <span>{selectedNode.degree_centrality} (Hub status)</span></p>
            </>
          )}
          {selectedNode.type === 'incident' && (
            <>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <FileText size={11} aria-hidden="true" /> Crime Tag: <span>{selectedNode.crime_type}</span>
              </p>
              <p>Connection Centrality: <span>{selectedNode.centrality}</span></p>
            </>
          )}
          {selectedNode.type === 'victim' && (
            <>
              <p>Gender / Age: <span>{selectedNode.gender} / {selectedNode.age} yrs</span></p>
            </>
          )}
          {selectedNode.type === 'location' && (
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <MapPin size={11} aria-hidden="true" /> Focus Station: <span>{selectedNode.label}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (isFullscreen) {
    return createPortal(content, document.body);
  }
  return content;
};

export default NetworkView;
