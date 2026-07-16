# Implementation Plan: Crime Intelligence & Analytical Platform

Based on the [datathon2026-build-plan.md](file:///d:/Code-Base/kerela_hackthon/datathon2026-build-plan.md), we will build the **Crime Intelligence & Analytical Platform**. It features an interactive Leaflet map for hotspot detection, a Cytoscape.js network graph for offender linkages, a FastAPI backend with scikit-learn analytics (DBSCAN + RandomForest), and a React frontend.

---

## User Review Required

> [!IMPORTANT]
> **Theme Selection (No-Blue Theme)**:
> In alignment with the styling rules, we will use a **sleek charcoal-graphite crime-intel dark theme** with **neon amber, crimson, and emerald accents** (avoiding standard blue themes).
> - Background: `#0f1115` (Graphite / Deep Charcoal)
> - Primary Text: `#e2e8f0` (Off-white / Slate)
> - Accent / Hotspots / High Risk: `#f43f5e` (Crimson / Coral Red)
> - Warnings / Mid Risk: `#f59e0b` (Neon Amber)
> - Safe / Resolved / Low Risk: `#10b981` (Emerald Green)
> - Node borders / Selection highlights: `#ec4899` (Hot Pink) or `#d946ef` (Fuchsia)

---

## Open Questions

> [!NOTE]
> 1. **Database Access Mode**: The build plan specifies a `docker-compose.yml` containing PostgreSQL. Should the FastAPI backend run inside Docker as well, or should we run it locally during development and only run the DB inside Docker? (We recommend running Postgres in Docker and running FastAPI/React locally for rapid hot-reloading and development feedback).
> 2. **Map Tiles Provider**: For the dark-themed map, we will use the open-source **CartoDB.DarkMatter** tile layer (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`). Please let us know if you prefer a different provider.
> 3. **Karnataka District Boundaries**: We will generate synthetic lat/long coordinate bounds for the 10 Karnataka districts to make the map look authentic. Do you have actual GeoJSON boundaries for Karnataka districts, or should we generate bounding-box approximations?

---

## Proposed Changes

We will create the directory `crime-intel-platform/` under the workspace root and build the components sequentially.

### 1. Data Generator (`crime-intel-platform/data-gen/`)
A Python data generator utilizing `Faker` to create:
- `incidents.csv`: 3000 crime records across 10 Karnataka districts with realistic coordinates, dates, and times.
- `accused.csv`: 800 offender records with demographic info and risk scores.
- `victims.csv`: Victim demographic mappings linked to incidents.
- `district_socioeconomic.csv`: Census/economic indicators (unemployment, literacy, urbanization) per district.
- **Baked-in patterns**:
  - A repeat-offender network: 5 accused individuals linked across 12 specific incidents in Bangalore (e.g. coordinated heist/robbery series).
  - A massive 40% crime spike: A significant surge in burglary/theft incidents in Hubli-Dharwad during October 2025.
- `generate_data.py`: Main generation script.
- `seed_db.py`: Database seeding script.

#### [NEW] [generate_data.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/data-gen/generate_data.py)
#### [NEW] [seed_db.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/data-gen/seed_db.py)

---

### 2. Backend API (`crime-intel-platform/backend/`)
A FastAPI backend utilizing PostgreSQL for persistence, and `scikit-learn` / `NetworkX` for analytics.
- **DBSCAN Clustering**: Run DBSCAN on lat/long coordinates of incidents in the requested window to extract hotspots.
- **Network Link Analysis**: Trace accused-victim-location-incident linkages and compute Degree & Betweenness Centrality using NetworkX.
- **Risk Score Classifier**: A simple RandomForestClassifier trained on socio-economic and historical incident counts to predict district-level risk scores.

#### [NEW] [docker-compose.yml](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/docker-compose.yml)
#### [NEW] [requirements.txt](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/requirements.txt)
#### [NEW] [main.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/main.py)
#### [NEW] [database.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/database.py)
#### [NEW] [models.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/models.py)
#### [NEW] [clustering.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/analytics/clustering.py)
#### [NEW] [network_build.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/analytics/network_build.py)
#### [NEW] [correlations.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/routers/correlations.py)
#### [NEW] [hotspots.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/routers/hotspots.py)
#### [NEW] [network.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/routers/network.py)
#### [NEW] [risk.py](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/backend/app/routers/risk.py)

---

### 3. Frontend App (`crime-intel-platform/frontend/`)
A React single page application built using Vite, styled with modern Vanilla CSS for a premium dark look.
- **Dashboard Grid**: Sleek grid layout featuring MapView, NetworkView, and CorrelationChart components.
- **MapView**: React-Leaflet integration with district zoom levels. Shows custom circle icons for hotspots and a pulsing red ring for districts experiencing crime spikes.
- **NetworkView**: Cytoscape.js rendering of offender-incident-victim networks. High-centrality nodes appear larger. Click to drill-down/expand nodes.
- **CorrelationChart**: Recharts plotting correlation coefficients and socio-economic charts.
- **RoleSwitcher**: Toggle roles between *Investigator*, *Analyst*, and *Supervisor* to filter UI sections and action permissions.

#### [NEW] [index.html](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/index.html)
#### [NEW] [index.css](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/index.css)
#### [NEW] [App.jsx](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/App.jsx)
#### [NEW] [MapView.jsx](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/components/MapView.jsx)
#### [NEW] [NetworkView.jsx](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/components/NetworkView.jsx)
#### [NEW] [CorrelationChart.jsx](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/components/CorrelationChart.jsx)
#### [NEW] [RoleSwitcher.jsx](file:///d:/Code-Base/kerela_hackthon/crime-intel-platform/frontend/src/components/RoleSwitcher.jsx)

---

## Verification Plan

### Automated Tests
- Write a test script `verify_analytics.py` that loads the generated dataset and asserts:
  - DBSCAN successfully extracts the repeat offender/geographical hotspots.
  - NetworkX properly identifies the top-degree hubs (our baked-in repeat offender network).
  - The correlation endpoints return statistically sound results.

### Manual Verification
- Launch the backend and frontend locally.
- Confirm the Map renders coordinates in Karnataka and groups clusters visually.
- Verify that clicking an offender in the dashboard navigates/drills into their Cytoscape network graph.
- Verify that switching roles updates visible dashboard cards and displays a convincing audit log.
