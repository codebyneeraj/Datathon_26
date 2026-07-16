import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

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

// Helper component to change map viewport dynamically
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
}

const MapView = ({ activeDistrict, onSelectDistrict, onSelectOffender, riskScores }) => {
  const [mapCenter, setMapCenter] = useState(STATE_CENTER);
  const [mapZoom, setMapZoom] = useState(STATE_ZOOM);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch hotspots when active district changes
  useEffect(() => {
    setLoading(true);
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
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
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

  // Create custom pulsing icon for anomalous districts
  const createPulseIcon = () => {
    return new L.DivIcon({
      className: 'pulse-marker',
      html: '<div style="width: 100%; height: 100%; border-radius: 50%;"></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Interactive Map</span>
          <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>
            {activeDistrict ? `District: ${activeDistrict}` : "Karnataka State Crime Hotspots"}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {activeDistrict && (
            <button className="select-input" onClick={handleReset}>
              Reset State View
            </button>
          )}
          <select
            className="select-input"
            value={activeDistrict || ''}
            onChange={(e) => onSelectDistrict(e.target.value || null)}
          >
            <option value="">-- All Districts --</option>
            {Object.keys(DISTRICT_CENTROIDS).map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="map-wrapper" style={{ flexGrow: 1 }}>
        <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true}>
          <ChangeMapView center={mapCenter} zoom={mapZoom} />
          
          {/* CartoDB Dark Matter tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* 1. Render District Anchors (Only in State View) */}
          {!activeDistrict &&
            Object.entries(DISTRICT_CENTROIDS).map(([name, config]) => {
              const hasAnomaly = riskScores?.find(r => r.district === name)?.anomaly_spike;
              return (
                <React.Fragment key={name}>
                  {/* Pulsing anomaly ring if flagged */}
                  {hasAnomaly && (
                    <Marker position={config.center} icon={createPulseIcon()}>
                      <Popup>
                        <div style={{ color: '#000', fontSize: '12px' }}>
                          <h4 style={{ color: 'var(--accent-red)', fontWeight: 'bold' }}>ANOMALY ALERT</h4>
                          <p><strong>{name}</strong> experienced a sharp crime spike in Burglary incidents during Oct 2025.</p>
                          <button 
                            className="select-input" 
                            style={{ marginTop: '0.5rem', background: 'var(--accent-red)', border: 'none', color: '#fff', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={() => onSelectDistrict(name)}
                          >
                            Drill Down
                          </button>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Standard District boundary indicator */}
                  <Circle
                    center={config.center}
                    radius={22000} // ~22km radius for district representation
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
                    <Popup>
                      <div style={{ color: '#000', fontSize: '11px' }}>
                        <h4 style={{ margin: 0 }}>{name} District</h4>
                        <p style={{ margin: '0.2rem 0' }}>
                          Risk Score: <span style={{ fontWeight: 'bold', color: getDistrictRiskColor(name) }}>
                            {riskScores?.find(r => r.district === name)?.predicted_risk_score || 'N/A'}/100
                          </span>
                        </p>
                        <p style={{ margin: 0 }}>Click to drill into station-level clusters.</p>
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
              const { cluster_id, incident_count, primary_crime, crime_types, radius } = feature.properties;
              
              // Leaflet uses [lat, lon], GeoJSON uses [lon, lat]
              const center = [coordinates[1], coordinates[0]];

              // Size circles proportionally to incident count
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
                >
                  <Popup>
                    <div style={{ color: '#000', fontSize: '11px', width: '220px' }}>
                      <h4 style={{ color: 'var(--accent-red)', margin: '0 0 0.5rem 0' }}>
                        DBSCAN Hotspot #{cluster_id}
                      </h4>
                      <p><strong>Total Incidents:</strong> {incident_count}</p>
                      <p><strong>Primary Incident:</strong> {primary_crime}</p>
                      
                      <div style={{ margin: '0.5rem 0', borderTop: '1px solid #ddd', paddingTop: '0.25rem' }}>
                        <strong style={{ display: 'block', marginBottom: '0.15rem' }}>Breakdown:</strong>
                        {Object.entries(crime_types).map(([type, cnt]) => (
                          <div key={type} style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{type}:</span>
                            <span style={{ fontWeight: 'bold' }}>{cnt}</span>
                          </div>
                        ))}
                      </div>

                      {/* Display Repeat Offender link if Bengaluru */}
                      {activeDistrict === 'Bengaluru' && (
                        <div style={{ borderTop: '1px solid #ddd', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                          <strong style={{ display: 'block', color: 'var(--accent-pink)', marginBottom: '0.25rem' }}>Flagged Repeat Offenders:</strong>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <button
                              style={{
                                background: '#121620',
                                border: '1px solid #ec4899',
                                color: '#ec4899',
                                fontSize: '10px',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontWeight: '500'
                              }}
                              onClick={() => onSelectOffender(1, "Ramesh Kumar (Gowda Gang)")}
                            >
                              Analyze Ramesh Kumar (Hub)
                            </button>
                            <button
                              style={{
                                background: '#121620',
                                border: '1px solid #ec4899',
                                color: '#ec4899',
                                fontSize: '10px',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontWeight: '500'
                              }}
                              onClick={() => onSelectOffender(2, "Suresh Naik (Field Coordinator)")}
                            >
                              Analyze Suresh Naik
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Circle>
              );
            })}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapView;
