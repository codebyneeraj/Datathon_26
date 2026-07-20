# State Crime Records Bureau (SCRB) Crime Intelligence & Analytical Platform

An enterprise-grade, AI-driven crime intelligence command console developed for the State Crime Records Bureau (SCRB), Karnataka State Police. The platform breaks down manual data silos, running density-based spatial clustering and graph-theoretic link analysis to uncover spatiotemporal hotspots, track repeat offenders, and organize criminal syndicates.

---

## 🌟 Live Links & Deployment
- **Live Deployed Application (Zoho Catalyst)**: [https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html](https://project-rainfall-60078587276.development.catalystserverless.in/app/index.html)
- **Live Backend API Base URL**: `https://project-rainfall-60078587276.development.catalystserverless.in/server/api/`
- **GitHub Repository**: [https://github.com/codebyneeraj/Datathon_26](https://github.com/codebyneeraj/Datathon_26)

---

## 🚀 Key Capabilities

### 📍 1. Spatiotemporal DBSCAN Hotspot Detection
- **Density Clustering**: Pinpoints high-density crime regions using Density-Based Spatial Clustering of Applications with Noise (DBSCAN) on geocoded FIR coordinates.
- **Geospatial Mapping**: Renders interactive crime cluster centroids, incident radii, and multi-district filter controls on a dark-mode Leaflet map.

### 🕸️ 2. Criminological Link Analysis & Syndicate Topology
- **Relational Graph Mapping**: Built on NetworkX and Cytoscape.js to visually map `Accused ⟷ Incident ⟷ Location ⟷ Victim` relationships.
- **Degree Centrality Scoring**: Calculates graph centrality to isolate syndicate hubs, bridge suspects, and repeat offender networks.

### 📊 3. Sociological & Predictive Risk Engine
- **Socioeconomic Correlation**: Uses Pearson correlation metrics comparing regional crime rates against unemployment, urbanization, and literacy rates.
- **Predictive Risk Classification**: Machine learning model (Random Forest heuristic) computing 0–100 threat risk levels (*Low*, *Medium*, *High*).
- **Baseline Anomaly Spikes**: Flags sudden regional crime spikes deviating from historical baselines.

### 🤖 4. Tactical Command AI Briefings (`gemma-4-31b-it`)
- **Automated Briefing Generator**: Generates structured tactical briefs (Executive Summary, Critical Risk Drivers, Tactical Recommendations) powered by Google's `gemma-4-31b-it` model.
- **Command AI Chat Widget**: Interactive command console for natural language querying of crime trends, suspect networks, and operational protocols.

---

## 🛠️ Repository & Project Structure

```
.
├── crime-intel-platform/
│   ├── frontend/             # React 18 + Vite Frontend Application
│   │   ├── src/
│   │   │   ├── components/   # MapView, NetworkView, CorrelationChart, Card UI
│   │   │   ├── App.jsx       # Main Dashboard Layout
│   │   │   └── api.js        # Centralized API Fetch Client
│   │   ├── dist/             # Compiled Production Client Bundle
│   │   └── package.json
│   └── backend/              # Standalone Local Backend Reference
├── functions/
│   └── api/                  # Zoho Catalyst Advanced I/O Python Function
│       ├── app/
│       │   ├── analytics/    # DBSCAN, NetworkX, AI Service (`gemma-4-31b-it`)
│       │   ├── routers/      # FastAPI endpoints (hotspots, network, risk, ai)
│       │   ├── models.py     # SQLAlchemy ORM Schemas
│       │   └── database.py   # SQLite Connection Setup
│       ├── main.py           # Catalyst WSGI / Flask Handler Entrypoint
│       ├── crime_db.db       # Relational FIR Database
│       ├── catalyst-config.json
│       └── requirements.txt
├── catalyst.json             # Zoho Catalyst Deployment Descriptor
├── .gitignore
└── README.md
```

---

## 💻 Local Setup & Execution Instructions

### Prerequisites
- Python 3.11 or higher
- Node.js v18 or higher

### 1. Backend Setup
1. Navigate to the backend function directory:
   ```bash
   cd functions/api
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Linux/macOS:
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI local server:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```
   *API available at:* `http://127.0.0.1:8000`

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd crime-intel-platform/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Dashboard available at:* `http://localhost:5173`

---

## ☁️ Zoho Catalyst Deployment

The project is configured for serverless deployment on **Zoho Catalyst**:

```bash
# Log in to Zoho Catalyst CLI
catalyst login

# Deploy Advanced I/O Python functions and Web Client
catalyst deploy
```

---

## 📄 License
Developed for the State Crime Records Bureau (SCRB) Datathon 2026.
