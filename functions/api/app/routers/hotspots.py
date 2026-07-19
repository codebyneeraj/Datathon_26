from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..database import get_db
from ..models import CaseMaster, District, Unit
from ..analytics.clustering import detect_hotspots

router = APIRouter(prefix="/api/hotspots", tags=["hotspots"])

@router.get("")
@router.get("/")
def get_hotspots_api(
    district: Optional[str] = Query(None, description="Filter by district"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    eps: float = Query(0.25, description="DBSCAN epsilon parameter"),
    min_samples: int = Query(4, description="DBSCAN min_samples parameter"),
    db: Session = Depends(get_db)
):
    query = db.query(CaseMaster)

    if district and district != 'All':
        query = query.join(Unit).join(District).filter(District.DistrictName == district)
        
    if start_date:
        query = query.filter(CaseMaster.CrimeRegisteredDate >= start_date)
            
    if end_date:
        query = query.filter(CaseMaster.CrimeRegisteredDate <= end_date)

    incidents = query.all()
    features = detect_hotspots(incidents, eps=eps, min_samples=min_samples)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }
