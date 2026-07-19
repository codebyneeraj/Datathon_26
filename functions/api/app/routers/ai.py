from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
try:
    from ..analytics.ai_service import ai_service
except ImportError:
    from app.analytics.ai_service import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])

class DistrictSummaryRequest(BaseModel):
    district: str
    risk_score: float = 50.0
    risk_level: str = "Medium"
    incident_count: int = 0
    socioeconomic: Dict[str, Any] = Field(default_factory=dict)
    top_crimes: List[Dict[str, Any]] = Field(default_factory=list)

class NetworkInsightRequest(BaseModel):
    accused_id: int
    accused_name: str = "Unknown Suspect"
    total_nodes: int = 1
    total_edges: int = 0
    co_accused: List[Dict[str, Any]] = Field(default_factory=list)

class ChatRequest(BaseModel):
    query: str
    context: Optional[str] = None

@router.get("/status")
def get_ai_status():
    """Returns local AI backend health and active model information."""
    try:
        return ai_service.get_status()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI status error: {str(e)}")

@router.post("/district-summary")
def get_district_summary(req: DistrictSummaryRequest):
    """Generates an executive threat intelligence summary using the configured local AI backend."""
    try:
        return ai_service.generate_district_summary(
            district=req.district,
            risk_score=req.risk_score,
            risk_level=req.risk_level,
            incident_count=req.incident_count,
            socioeconomic=req.socioeconomic,
            top_crimes=req.top_crimes
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Summary generation error: {str(e)}")

@router.post("/network-insight")
def get_network_insight(req: NetworkInsightRequest):
    """Generates criminal network link analysis insights using the configured local AI backend."""
    try:
        return ai_service.generate_network_insight(
            accused_id=req.accused_id,
            accused_name=req.accused_name,
            total_nodes=req.total_nodes,
            total_edges=req.total_edges,
            co_accused=req.co_accused
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Network Insight error: {str(e)}")

@router.post("/chat")
def chat_ai_assistant(req: ChatRequest):
    """Interactive command assistant Q&A powered by the configured local AI backend."""
    try:
        return ai_service.chat_assistant(query=req.query, context=req.context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Assistant error: {str(e)}")
