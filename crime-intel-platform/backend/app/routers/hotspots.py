from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date
from ..database import get_db
from ..models import Incident
from ..analytics.clustering import detect_hotspots

router = APIRouter(prefix="/api/hotspots", tags=["hotspots"])

@router.get("")
def get_hotspots_api(
    district: Optional[str] = Query(None, description="Filter by district"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    query = db.query(Incident)

    if district:
        query = query.filter(Incident.district == district)
        
    if start_date:
        try:
            start = date.fromisoformat(start_date)
            query = query.filter(Incident.date >= start)
        except ValueError:
            pass
            
    if end_date:
        try:
            end = date.fromisoformat(end_date)
            query = query.filter(Incident.date <= end)
        except ValueError:
            pass

    incidents = query.all()
    
    # DBSCAN hyperparameters: eps=0.3, min_samples=4 (scaled)
    # This was tuned for the generated coordinate spread
    features = detect_hotspots(incidents, eps=0.25, min_samples=4)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }
