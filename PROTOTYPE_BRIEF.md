# PROTOTYPE BRIEF

## 1. Project Overview
- **Project Name**: SCRB Crime Intelligence & Analytical Platform
- **Target Organization**: State Crime Records Bureau (SCRB), Karnataka State Police (KSP)
- **Live Deployed Application (Zoho Catalyst)**: [https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html](https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html)
- **Backend API Base URL**: `https://project-rainfall-60078587276.development.catalystserverless.in/server/api/`
- **GitHub Repository**: [https://github.com/codebyneeraj/Datathon_26](https://github.com/codebyneeraj/Datathon_26)

---

## 2. Problem Statement Addressed
Law enforcement analytical ecosystems currently face critical operational bottlenecks:
- **Manual Data Silos & Fragmented Excel Reporting**: Independent police stations manage records in isolated Excel files, leaving multi-jurisdictional crime syndicates undetected.
- **Lack of Advanced Relational Analytics**: Traditional systems report static counts without analyzing offender relationships, shared Modus Operandi (MO), or topological network hubs.
- **Reactive Policing Approach**: Police deployment remains reactive rather than proactive due to a lack of automated spatiotemporal clustering and socio-economic predictive modeling.

---

## 3. Key Features and Functionalities

### 📍 A. Spatiotemporal DBSCAN Hotspot Detection
- **Density Clustering**: Utilizes Density-Based Spatial Clustering of Applications with Noise (DBSCAN) on FIR coordinate matrices.
- **Interactive Geospatial Visualization**: Renders high-risk micro-zones, cluster centroids, and crime radii on a dark-mode Leaflet map.
- **Multi-Filter Analysis**: Filter by district, date ranges, crime heads, and spatial parameters (`eps`, `min_samples`).

### 🕸️ B. Criminological Link Analysis & Syndicate Mapping
- **Graph Topology Engine**: Built on NetworkX and Cytoscape.js to model complex `Accused ⟷ Incident ⟷ Location ⟷ Victim` relationships.
- **Centrality & Hub Analysis**: Calculates degree centrality scores to instantly isolate ringleaders, bridge suspects, and repeat offender networks across jurisdictions.
- **Visual Suspect Profiles**: Inspect suspect age, risk score, associated FIRs, and co-accused links in one unified view.

### 📊 C. Sociological & Predictive Risk Engine
- **Socioeconomic Correlation Analysis**: Applies Pearson correlation metrics comparing regional crime rates against unemployment, urbanization, and literacy rates.
- **Predictive Risk Scoring**: Machine learning model (Random Forest heuristic) calculating 0–100 threat risk levels (*Low*, *Medium*, *High*) for all districts.
- **Anomaly Detection**: Highlights abnormal incident spikes deviating from baseline historical averages.

### 🤖 D. Tactical Command AI Briefings (`gemma-4-31b-it`)
- **Executive Intelligence Briefs**: Generates structured tactical briefs (Executive Summary, Critical Risk Drivers, Tactical Recommendations) powered by Google's `gemma-4-31b-it` model.
- **Tactical AI Chat Assistant**: Floating command console widget for natural language querying of crime trends, suspect networks, and operational protocols.

### 📋 E. Incident Clearance & Workflow Management
- **Real-Time Status Updating**: Allows authorized officers to update incident clearance statuses (*Under Investigation*, *Charged*, *Cleared*).

---

## 4. Technology Stack Used

| Layer | Technologies & Frameworks |
|---|---|
| **Frontend UI** | React 18, Vite, Vanilla CSS (Dark Mode Glassmorphism), Lucide-React Icons |
| **Data Visualization & Mapping** | Leaflet.js, Cytoscape.js |
| **Backend API Framework** | Python 3.11, FastAPI, Pydantic, SQLAlchemy |
| **Analytics & ML Libraries** | NetworkX, Scikit-Learn, NumPy, DBSCAN |
| **AI / LLM Engine** | Google Generative AI (`gemma-4-31b-it` model) |
| **WSGI / ASGI Gateway** | `a2wsgi` (ASGI to WSGI bridge), Flask |
| **Database** | SQLite Relational FIR Database (`crime_db.db`) |
| **Cloud Hosting & Serverless** | **Zoho Catalyst** (Advanced I/O Python Functions & Web Client Hosting) |

---

## 5. Proposed Impact and Operational Use Case

1. **Strategic Resource Allocation**: Shift police patrol deployment from arbitrary schedules to data-driven micro-zone targeting during peak crime hours.
2. **Multi-Jurisdictional Syndicate Disruption**: Unmask repeat offenders operating across different police stations by visual association mapping.
3. **Evidence-Based Policy**: Give SCRB commanders empirical insights on how socioeconomic variables (unemployment, urbanization) drive regional crime typologies.
4. **Time & Effort Reduction**: Reduce briefing preparation time for station commanders from hours of manual spreadsheet analysis to seconds with automated AI briefs.

---

## 6. Verification & Quick Links
- **Live Deployed Client App**: [https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html](https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html)
- **Live API Endpoint**: [https://project-rainfall-60078587276.development.catalystserverless.in/server/api/hotspots](https://project-rainfall-60078587276.development.catalystserverless.in/server/api/hotspots)
- **Public GitHub Repository**: [https://github.com/codebyneeraj/Datathon_26](https://github.com/codebyneeraj/Datathon_26)
