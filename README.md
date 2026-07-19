# Crime Intelligence & Analytical Platform (SCRB Console)

An enterprise-grade, intelligence-driven command dashboard developed for the State Crime Records Bureau (SCRB). The platform breaks down manual data silos, running density-based spatial clustering and graph-theoretic link analysis to uncover spatiotemporal hotspots and organize criminal syndicates.

---

## 🚀 Key Capabilities
*   **Spatiotemporal DBSCAN Hotspots:** Pinpoint high-density crime regions on an interactive Leaflet map.
*   **Topological Link Analysis:** Graph relationships (Accused ⟷ Incident ⟷ Location ⟷ Victim) with centrality scoring via Cytoscape.js & NetworkX.
*   **Socioeconomic Correlation:** Pearson analysis comparing crime rates against unemployment, urbanization, and literacy.
*   **Predictive Risk Model:** Random Forest threat classification.
*   **AI Command Assistant:** Automated briefing generator (Gemma AI) and conversational widget.

---

## 🛠️ Repository & Project Structure
```
crime-intel-platform/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── analytics/        # DBSCAN, NetworkX, and AI Service
│   │   ├── routers/          # API endpoints (risk, hotspots, network, etc.)
│   │   ├── models.py         # SQLAlchemy schemas
│   │   └── database.py       # SQLite connection setup
│   └── requirements.txt
└── frontend/                 # React Static Client
    ├── src/
    │   ├── components/       # MapView, NetworkView, CorrelationChart, etc.
    │   ├── App.jsx           # Shell and layout
    │   └── api.js            # Unified API fetch client
    └── package.json
```

---

## 💻 Local Setup & Execution Instructions

### Prerequisites
*   Python 3.11 or higher
*   Node.js v18 or higher

### 1. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd crime-intel-platform/backend
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
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --port 8000 --reload
   ```
   *The API will be available at: http://127.0.0.1:8000*

### 2. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd crime-intel-platform/frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The UI will be accessible at: http://localhost:5173 (or the port specified in terminal)*

### 3. Verifying the Platform
To verify the databases, models, and graph engines, run the test suite:
```bash
cd crime-intel-platform
backend\.venv\Scripts\python verify_analytics.py
```
All tests should return `[OK]`.

---

## ☁️ Zoho Catalyst Deployment Guide
The organizers require deployment exclusively on the **Zoho Catalyst** platform. Follow these steps to deploy this multi-tier application:

### Step 1: Initialize Catalyst Project
1. Install the Catalyst CLI globally:
   ```bash
   npm install -g zcatalyst-cli
   ```
2. Log in to your Zoho account:
   ```bash
   catalyst login
   ```
3. Initialize the project inside `crime-intel-platform/`:
   ```bash
   catalyst init
   ```
   * Select **Hosting** (for the React frontend static build).
   * Select **Functions** ➔ **Advanced I/O** (Python) for the FastAPI backend.

### Step 2: Configure FastAPI as a Catalyst Function
1. Rename the initialization folder generated for the Python function to match your api structure, or migrate the contents of `backend/app` into the function folder.
2. In the function configuration (`catalyst-config.json` inside your function folder), specify the entry point. Catalyst uses WSGI/ASGI wrappers. Wrap your FastAPI app using `mangum` or a direct Catalyst Advanced I/O handler:
   ```json
   {
     "deployment": {
       "stack": "python3.9",
       "entry_point": "app.main.app"
     }
   }
   ```
3. Ensure `requirements.txt` is updated in your function directory.

### Step 3: Configure Frontend Build
1. In `frontend/src/api.js`, update the base URL to point to the live Catalyst function URL:
   ```javascript
   const VITE_API_BASE_URL = 'https://<your-catalyst-project-subdomain>.catalystserverless.com/server/api';
   ```
2. Build the production assets:
   ```bash
   cd frontend
   npm run build
   ```
3. Move the compiled contents of `frontend/dist/` into the `hosting/` directory initialized by Catalyst.

### Step 4: Deploy
Deploy the entire application to the cloud:
```bash
catalyst deploy
```
Catalyst will output the live **App URL** (hosting) and **Function URL** (backend API).
