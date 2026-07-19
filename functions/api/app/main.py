from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import hotspots, network, correlations, risk, ai

app = FastAPI(
    title="Crime Intelligence & Analytical Platform API",
    description="Backend API for clustering, link analysis, risk scoring, and Gemma LLM AI summaries.",
    version="1.0.0"
)

# Set up CORS middleware so frontend can access the endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For hackathon, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(hotspots.router)
app.include_router(network.router)
app.include_router(correlations.router)
app.include_router(risk.router)
app.include_router(ai.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Welcome to the Crime Intelligence & Analytical Platform API"
    }
