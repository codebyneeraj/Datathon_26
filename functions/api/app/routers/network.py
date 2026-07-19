from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..analytics.network_build import build_network_graph

router = APIRouter(prefix="/api/network", tags=["network"])

@router.get("/{accused_id}")
def get_network_api(accused_id: int, db: Session = Depends(get_db)):
    elements = build_network_graph(accused_id, db)
    if not elements:
        raise HTTPException(status_code=404, detail="Accused network not found")
    return elements
