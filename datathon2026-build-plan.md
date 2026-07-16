# Datathon 2026 — Crime Intelligence & Analytical Platform (Challenge 2)
### Build Plan for Coding-Agent-Assisted Development

---

## 1. Demo Narrative

Everything built should serve one story:

> An SCRB analyst opens a dashboard, sees a live crime hotspot alert, drills into the district, sees the network of repeat offenders behind it, and gets an AI-flagged socio-economic correlation explaining why.

One coherent click-path, built from all three feature clusters, beats three disconnected demos.

---

## 2. Feature Scope

### Build for real
- District-level interactive map with drill-down (state → district → station)
- Spatiotemporal hotspot detection (real DBSCAN clustering, not colored dots)
- Node-link network graph for offender/victim/location relationships with centrality scoring
- One socio-economic correlation view (crime rate vs. unemployment/urbanization by district)
- Statistically real anomaly flag (crime spike vs. historical baseline)

### Fake convincingly
- "Predictive risk scoring" — a real but lightweight classifier (RandomForest) on synthetic data, not oversold as production-grade forecasting
- Role-based access — hardcoded 3-role login (Investigator/Analyst/Supervisor) toggling visible sections, no real auth infra
- Audit logs — static table that looks real

### Skip entirely (mention as roadmap in slides)
- Financial transaction link analysis
- Full explainable-AI reasoning trails (use tooltips instead: "based on X, Y correlation")
- Multi-language / voice support (not required in Challenge 2)

---

## 3. Tech Stack (research-backed choices)

| Layer | Choice | Why |
|---|---|---|
| Hotspot clustering | **scikit-learn DBSCAN** | Standard in crime-analytics literature; no pre-set cluster count needed; explicitly labels noise/outliers, which real crime data always has |
| Network graph | **Cytoscape.js** | Best fit when the graph is "an analysis object" — centrality, algorithms, layouts — vs. vis-network (better for lightweight drag/drop diagram editors) or Sigma.js (only needed at large WebGL scale) |
| Backend | **FastAPI** | Fast to scaffold, async, good for analytics endpoints |
| Database | **Postgres (plain lat/long floats)** | Skip PostGIS for the hackathon — at a few thousand synthetic rows, PostGIS setup risk (extension install, GeoAlchemy typing) outweighs the benefit. Only use it if a teammate has done it before |
| Map rendering | **Leaflet.js** | Free, no API key needed, mature heatmap/cluster plugins (Leaflet.heat, Leaflet.markercluster) |
| Charts | **Recharts or Plotly** | Fast to wire up for correlation/anomaly views |
| Frontend | **React** | Pairs cleanly with Cytoscape.js and Leaflet React wrappers |

---

## 4. Repo Structure

```
crime-intel-platform/
├── data-gen/                  # synthetic dataset generator (build FIRST)
├── backend/
│   ├── app/
│   │   ├── models.py
│   │   ├── routers/
│   │   │   ├── hotspots.py
│   │   │   ├── network.py
│   │   │   ├── correlations.py
│   │   │   └── risk.py
│   │   └── analytics/
│   │       ├── clustering.py       # DBSCAN
│   │       ├── network_build.py    # NetworkX -> Cytoscape JSON
│   │       └── correlation.py
│   └── docker-compose.yml
└── frontend/
    └── src/components/
        ├── MapView.jsx           # Leaflet
        ├── NetworkView.jsx       # Cytoscape.js
        ├── CorrelationChart.jsx  # Recharts/Plotly
        └── RoleSwitcher.jsx
```

---

## 5. Synthetic Data Schema

- `incidents`: id, crime_type, date, time, lat, long, district, station, MO_tags, status
- `accused`: id, name (fake), age, gender, past_incident_ids[], risk_score
- `victims`: id, age, gender, incident_id
- `district_socioeconomic`: district, population, unemployment_rate, urbanization_index, literacy_rate

Bake in deliberate patterns so clustering/network algorithms have something genuine to discover:
- A repeat-offender cluster (e.g., 5 accused linked across 12 incidents in one district)
- A real crime-type spike (e.g., 40% increase) in one district in one month

---

## 6. Agent Task Breakdown

Hand each of these as a separate prompt to a coding agent (e.g., Claude Code), in order.

### Task 1 — Data Generator (blocks everything else)
> Write a Python script using Faker that generates a synthetic Karnataka crime dataset: 3000 incidents across 10 districts with lat/long, crime_type, date/time, MO_tags, status; 800 accused records with age/gender and incident links; victim records; a district_socioeconomic table with unemployment/urbanization/literacy stats. Deliberately bake in: one repeat-offender cluster of 5 accused linked across 12 incidents in a single district, and a 40% spike in one crime_type in one district in one month. Output as CSV + a Postgres seed script.

### Task 2 — Backend Skeleton + Hotspot Endpoint
> Set up a FastAPI project with docker-compose (Postgres, no PostGIS). Build `/api/hotspots` that runs DBSCAN (scikit-learn) on incident lat/long + date, using StandardScaler and eps/min_samples tuned via the k-distance elbow method. Return clusters as GeoJSON with cluster_id, incident_count, crime_types.

### Task 3 — Network Endpoint
> Build `/api/network/{accused_id}` using NetworkX to construct a graph of accused-victim-location-incident links, compute degree/betweenness centrality to flag "hub" offenders, and return in Cytoscape.js JSON format (elements: nodes/edges with data fields).

### Task 4 — Correlation + Risk Endpoints
> Build `/api/correlations` returning Pearson correlation between district crime rate and socio-economic indicators. Build `/api/risk-score` using a simple sklearn RandomForestClassifier trained on the synthetic data to output a 0–100 risk score per district.

### Task 5 — Frontend: Map
> Build a React + Leaflet map component with district drill-down (state view → click district → station view), rendering hotspot clusters from `/api/hotspots` as colored circles sized by incident count, with a pulsing red-zone indicator for districts flagged as anomalous spikes.

### Task 6 — Frontend: Network Graph
> Build a React component using Cytoscape.js with the `cose` layout, rendering `/api/network/:id` data, node size scaled by centrality score, click-to-expand for connected incidents.

### Task 7 — Correlation Dashboard + Role Toggle + Polish
> Build a Recharts scatter/bar view for `/api/correlations`, a hardcoded 3-role login (Investigator/Analyst/Supervisor) that toggles which dashboard sections are visible, and a static audit-log table.

---

## 7. Timeline (36-hour hackathon)

| Hours | Milestone |
|---|---|
| 0–3 | Synthetic data generated + schema finalized + seeded into Postgres |
| 3–8 | Backend API skeleton + hotspot clustering endpoint working |
| 8–14 | Map frontend wired to real hotspot data (first "wow" checkpoint) |
| 14–20 | Network graph view (offender-victim-location links) wired to real data |
| 20–26 | Socio-economic correlation chart + anomaly flag |
| 26–30 | Role toggle, polish, fake-but-convincing audit log / risk score UI |
| 30–34 | Demo script rehearsal, cut anything broken, buffer for bugs |
| 34–36 | Slides (problem framing, architecture diagram, roadmap for skipped features) |

---

## 8. Working with Coding Agents — Notes

- Feed Task 1's output schema into every subsequent task prompt. Agents drift on field names otherwise.
- Have the agent write a test for the DBSCAN endpoint against Task 1's known "baked-in" cluster. If it isn't detected, eps/min_samples are wrong — catch this before demo day.
- Keep PostGIS out of scope unless a teammate has used it before — it's the highest setup-risk item relative to payoff at this data scale.
- Prioritize the hotspot → network click-through being rock solid over adding more modules. Judges weight (a) whether the map/network responds to real data vs. hardcoded, (b) one genuine surfaced insight, (c) clean narrative over feature count.
