import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';

const NetworkView = ({ accusedId, accusedName }) => {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    if (!accusedId) return;

    setLoading(true);
    setSelectedNode(null);
    fetch(`http://localhost:8000/api/network/${accusedId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch graph data");
        return res.json();
      })
      .then((data) => {
        setElements(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
        setElements([]);
      });
  }, [accusedId]);

  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    // Destroy existing instance if any
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    // Initialize Cytoscape
    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: elements,
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'color': '#cbd5e1',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-margin-y': '6px',
            'background-color': '#475569',
            'border-width': '2px',
            'border-color': 'rgba(255,255,255,0.1)',
            'transition-property': 'background-color, border-color, border-width',
            'transition-duration': '0.2s',
            'width': 'mapData(centrality, 0, 1, 20, 45)',
            'height': 'mapData(centrality, 0, 1, 20, 45)'
          }
        },
        {
          selector: 'node[type="accused"]',
          style: {
            'background-color': '#ec4899',
            'border-color': '#f472b6',
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
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0
      }
    });

    // Add click listeners
    cyRef.current.on('tap', 'node', (evt) => {
      const node = evt.target;
      setSelectedNode(node.data());
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
  }, [elements]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignBars: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Offender Network Graph
          </span>
          {accusedName && (
            <h4 style={{ fontSize: '0.9rem', color: 'var(--accent-pink)', marginTop: '0.15rem' }}>
              Target Profile: {accusedName}
            </h4>
          )}
        </div>
        {accusedId && (
          <button
            className="select-input"
            onClick={() => {
              if (cyRef.current) cyRef.current.fit();
            }}
            style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
          >
            Reset Fit
          </button>
        )}
      </div>

      <div className="cytoscape-wrapper" style={{ flexGrow: 1 }}>
        {loading ? (
          <div className="network-placeholder">Analyzing network linkages...</div>
        ) : !accusedId ? (
          <div className="network-placeholder">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94-3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p style={{ fontWeight: '500', color: 'var(--text-secondary)' }}>No Active Case Selected</p>
            <p style={{ fontSize: '0.75rem', marginTop: '0.25rem', maxWidth: '280px' }}>
              Select a repeat offender from Bengaluru (e.g. Ramesh Kumar) or click an offender in the audit table to map co-conspirator, victim, and incident relationships.
            </p>
          </div>
        ) : elements.length === 0 ? (
          <div className="network-placeholder">No network relationships found for this offender.</div>
        ) : (
          <div ref={containerRef} className="cytoscape-canvas" />
        )}
      </div>

      {selectedNode && (
        <div className="selection-details">
          <h4>Node Detail: {selectedNode.label}</h4>
          <p style={{ textTransform: 'capitalize' }}>Type: <span>{selectedNode.type}</span></p>
          
          {selectedNode.type === 'accused' && (
            <>
              <p>Risk Score: <span style={{ color: selectedNode.risk_score > 70 ? 'var(--accent-red)' : 'var(--accent-amber)' }}>{selectedNode.risk_score}/100</span></p>
              <p>Network Centrality: <span>{selectedNode.centrality}</span></p>
            </>
          )}
          {selectedNode.type === 'incident' && (
            <>
              <p>Crime Type: <span>{selectedNode.crime_type}</span></p>
              <p>Connection Centrality: <span>{selectedNode.centrality}</span></p>
            </>
          )}
          {selectedNode.type === 'victim' && (
            <>
              <p>Gender: <span>{selectedNode.gender}</span></p>
              <p>Age: <span>{selectedNode.age} yrs</span></p>
            </>
          )}
          {selectedNode.type === 'location' && (
            <p>Node connects all crimes within this station bounds.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkView;
