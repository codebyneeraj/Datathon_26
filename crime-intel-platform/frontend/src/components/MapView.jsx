import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Shield, AlertTriangle, AlertCircle, ZoomIn } from 'lucide-react';
import Button from './ui/Button';

// Fix leaflet marker icon issues
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Centroids of Karnataka districts
const DISTRICT_CENTROIDS = {
  "Bengaluru": { center: [12.9716, 77.5946], zoom: 11 },
  "Mysuru": { center: [12.2958, 76.6394], zoom: 10 },
  "Mangaluru": { center: [12.9141, 74.8560], zoom: 10 },
  "Hubli-Dharwad": { center: [15.3647, 75.1240], zoom: 10 },
  "Belagavi": { center: [15.8497, 74.4977], zoom: 10 },
  "Kalaburagi": { center: [17.3297, 76.8343], zoom: 10 },
  "Davanagere": { center: [14.4644, 75.9218], zoom: 10 },
  "Shivamogga": { center: [13.9299, 75.5681], zoom: 10 },
  "Ballari": { center: [15.1394, 76.9214], zoom: 10 },
  "Bidar": { center: [17.9104, 77.5199], zoom: 10 }
};

const STATE_CENTER = [14.97, 75.92];
const STATE_ZOOM = 7;

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const MapView = ({ 
  activeDistrict, 
  onSelectDistrict, 
  onSelectOffender, 
  riskScores, 
  districtAccused, 
  accusedLoading 
}) => {
  const [mapCenter, setMapCenter] = useState(STATE_CENTER);
  const [mapZoom, setMapZoom] = useState(STATE_ZOOM);
  const [hotspots, setHotspots] = useState([]);
  const [hotspotsLoading, setHotspotsLoading] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  // Fetch hotspots and reset active panel when active district changes
  useEffect(() => {
    setSelectedHotspot(null);
    setHotspotsLoading(true);
    let url = "http://localhost:8000/api/hotspots";
    if (activeDistrict) {
      url += `?district=${activeDistrict}`;
      const config = DISTRICT_CENTROIDS[activeDistrict];
      setMapCenter(config.center);
      setMapZoom(config.zoom);
    } else {
      setMapCenter(STATE_CENTER);
      setMapZoom(STATE_ZOOM);
    }

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setHotspots(data.features || []);
        setHotspotsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setHotspotsLoading(false);
      });
  }, [activeDistrict]);

  const handleReset = () => {
    onSelectDistrict(null);
  };

  const getDistrictRiskColor = (districtName) => {
    const distScore = riskScores?.find(r => r.district === districtName);
    if (!distScore) return 'var(--text-muted)';
    if (distScore.predicted_risk_score >= 70) return 'var(--accent-red)';
    if (distScore.predicted_risk_score >= 35) return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  const createPulseIcon = () => {
    return new L.DivIcon({
      className: 'pulse-marker',
      html: '<div style="width: 100%; height: 100%; border-radius: 50%;"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', height: '100%' }} role="region" aria-label="Geographical Crime Hotspots Map">
      {/* Redesigned Compact Header - Removed stacking titles, kept only select and state buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        {activeDistrict && (
          <Button variant="ghost" onClick={handleReset} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}>
            State View
          </Button>
        )}
        <select
          className="select-input"
          value={activeDistrict || ''}
          onChange={(e) => onSelectDistrict(e.target.value || null)}
          aria-label="Select Karnataka district to drill down"
        >
          <option value="">-- All Districts --</option>
          {Object.keys(DISTRICT_CENTROIDS).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="map-wrapper" style={{ flexGrow: 1, position: 'relative' }}>
        {hotspotsLoading && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000, background: 'rgba(11, 13, 19, 0.7)', display: 'flex', alignItems: 'center', justifyBars: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem' }}>
            <div className="pulse" style={{ padding: '1rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
              Querying crime hotspot matrices...
            </div>
          </div>
        )}

        {/* Floating details sidebar panel inside map wrapper (no overlay on anchor, Flaw 3) */}
        {selectedHotspot && (
          <div className="map-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '0.35rem', marginBottom: '0.35rem' }}>
              <h4 style={{ color: 'var(--accent-amber)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: '600' }}>
                <AlertTriangle size={14} aria-hidden="true" /> Hotspot #{selectedHotspot.cluster_id + 1}
              </h4>
              <button 
                onClick={() => setSelectedHotspot(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1', fontWeight: 'bold' }}
                aria-label="Close details panel"
              >
                &times;
              </button>
            </div>
            <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}><strong>Total Incidents:</strong> {selectedHotspot.incident_count}</p>
              <p style={{ color: 'var(--text-secondary)' }}><strong>Dominant Crime:</strong> {selectedHotspot.primary_crime}</p>
              
              <div style={{ margin: '0.25rem 0', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <strong style={{ display: 'block', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Crime Matrix:</strong>
                {Object.entries(selectedHotspot.crime_types).map(([type, cnt]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>
                    <span>{type}:</span>
                    <span style={{ fontWeight: 'bold', color: '#fff' }}>{cnt}</span>
                  </div>
                ))}
              </div>

              {/* Accused regional queries */}
              <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                <strong style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.35rem' }}>
                  <Shield size={12} aria-hidden="true" style={{ color: 'var(--accent-amber)' }} /> Flagged Regional Accused:
                </strong>
                {accusedLoading ? (
                  <div style={{ color: 'var(--text-muted)' }} className="pulse">Syncing records...</div>
                ) : districtAccused.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)' }}>No local records flagged.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', maxHeight: '130px', overflowY: 'auto' }}>
                    {districtAccused.slice(0, 4).map((acc) => (
                      <button
                        key={acc.id}
                        style={{
                          background: 'rgba(245, 158, 11, 0.05)',
                          border: '1px solid rgba(245, 158, 11, 0.2)',
                          color: 'var(--accent-amber)',
                          fontSize: '10px',
                          padding: '0.35rem 0.5rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontWeight: '600',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => onSelectOffender(acc.id, acc.name)}
                      >
                        <span>{acc.name}</span>
                        <span style={{ opacity: 0.8, fontSize: '9px', background: 'rgba(255,255,255,0.08)', padding: '0.05rem 0.2rem', borderRadius: '2px' }}>
                          Risk: {acc.risk_score}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Floating map legend panel (Flaw 5) */}
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          background: 'rgba(23, 27, 36, 0.92)',
          border: '1px solid var(--card-border)',
          borderRadius: '6px',
          padding: '8px 10px',
          zIndex: 1000,
          fontSize: '9px',
          color: 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ fontWeight: '600', borderBottom: '1px solid var(--card-border)', paddingBottom: '2px', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Map Legend</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--accent-red)' }}></span>
            <span>High Risk Zone (&gt;=70)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--accent-amber)' }}></span>
            <span>Med Risk Zone (35-69)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--accent-green)' }}></span>
            <span>Low Risk Zone (&lt;35)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)', opacity: 0.6 }}></span>
            <span>Critical Hotspot (&gt;10 inc.)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-amber)', opacity: 0.6 }}></span>
            <span>Active Hotspot (&lt;=10 inc.)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-red)', border: '1px solid #fff' }} className="pulse"></span>
            <span>Spike Alert Center</span>
          </div>
        </div>
        
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true}>
          <ChangeMapView center={mapCenter} zoom={mapZoom} />
          
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* 1. Render District Anchors (Only in State View) */}
          {!activeDistrict &&
            Object.entries(DISTRICT_CENTROIDS).map(([name, config]) => {
              const rScore = riskScores?.find(r => r.district === name);
              const hasAnomaly = rScore?.anomaly_spike;
              return (
                <React.Fragment key={name}>
                  {hasAnomaly && (
                    <Marker position={config.center} icon={createPulseIcon()}>
                      {/* Leaflet popups with offset so the anchor point stays visible */}
                      <Popup offset={[0, -10]} autoPanPadding={[50, 50]}>
                        <div style={{ color: '#fff', fontSize: '11px', width: '200px' }}>
                          <h4 style={{ color: 'var(--accent-red)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.35rem' }}>
                            <AlertCircle size={14} aria-hidden="true" /> STATISTICAL SPIKE ALERT
                          </h4>
                          <p style={{ color: 'var(--text-secondary)' }}>
                            <strong>{name}</strong> experienced a sharp <strong>{rScore.spike_percentage}% Burglary spike</strong> during Oct 2025.
                          </p>
                          <Button 
                            variant="danger" 
                            style={{ marginTop: '0.6rem', width: '100%', justifyContent: 'center' }}
                            onClick={() => onSelectDistrict(name)}
                          >
                            <ZoomIn size={12} aria-hidden="true" /> Drill Down
                          </Button>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  <Circle
                    center={config.center}
                    radius={22000}
                    pathOptions={{
                      color: getDistrictRiskColor(name),
                      fillColor: getDistrictRiskColor(name),
                      fillOpacity: 0.15,
                      weight: 1.5
                    }}
                    eventHandlers={{
                      click: () => onSelectDistrict(name)
                    }}
                  >
                    <Popup offset={[0, 0]} autoPanPadding={[50, 50]}>
                      <div style={{ color: '#fff', fontSize: '11px' }}>
                        <h4 style={{ marginBottom: '0.25rem' }}>{name} District</h4>
                        <p style={{ color: 'var(--text-secondary)' }}>
                          Risk level: <span style={{ fontWeight: 'bold', color: getDistrictRiskColor(name) }}>
                            {rScore?.risk_level || 'Low'} ({rScore?.predicted_risk_score || 0}/100)
                          </span>
                        </p>
                        <p style={{ marginTop: '0.35rem', color: 'var(--text-muted)' }}>Click zone to view station boundaries.</p>
                      </div>
                    </Popup>
                  </Circle>
                </React.Fragment>
              );
            })}

          {/* 2. Render DBSCAN Hotspots (Only in District View) */}
          {activeDistrict &&
            hotspots.map((feature, idx) => {
              const { coordinates } = feature.geometry;
              const { cluster_id, incident_count, radius } = feature.properties;
              const center = [coordinates[1], coordinates[0]];
              const circleRadius = Math.max(radius, 800); 

              return (
                <Circle
                  key={`hotspot-${cluster_id}-${idx}`}
                  center={center}
                  radius={circleRadius}
                  pathOptions={{
                    color: incident_count > 10 ? 'var(--accent-red)' : 'var(--accent-amber)',
                    fillColor: incident_count > 10 ? 'var(--accent-red)' : 'var(--accent-amber)',
                    fillOpacity: 0.25,
                    weight: 2
                  }}
                  eventHandlers={{
                    click: () => {
                      // Trigger selection of hotspot metrics into sliding details sidebar
                      setSelectedHotspot(feature.properties);
                    }
                  }}
                />
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
