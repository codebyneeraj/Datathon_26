import math
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import CaseMaster, District, Unit, DistrictSocioeconomic

import time

router = APIRouter(prefix="/api/correlations", tags=["correlations"])

_CORRELATIONS_CACHE = None
_CORRELATIONS_CACHE_TIME = 0
_CORRELATIONS_CACHE_TTL = 300

def _pearson_corr(x, y):
    n = len(x)
    if n < 2:
        return 0.0
    mx = sum(x) / n
    my = sum(y) / n
    vx = sum((a - mx)**2 for a in x)
    vy = sum((b - my)**2 for b in y)
    if vx == 0 or vy == 0:
        return 0.0
    cov = sum((a - mx) * (b - my) for a, b in zip(x, y))
    r = cov / math.sqrt(vx * vy)
    return round(r, 3)

@router.get("")
@router.get("/")
def get_correlations_api(db: Session = Depends(get_db)):
    global _CORRELATIONS_CACHE, _CORRELATIONS_CACHE_TIME
    now = time.time()
    if _CORRELATIONS_CACHE is not None and (now - _CORRELATIONS_CACHE_TIME < _CORRELATIONS_CACHE_TTL):
        return _CORRELATIONS_CACHE
    crime_counts = db.query(
        District.DistrictName,
        func.count(CaseMaster.CaseMasterID).label("crime_count")
    ).select_from(CaseMaster).join(Unit).join(District).group_by(District.DistrictName).all()
    
    crime_map = {dist_name: count for dist_name, count in crime_counts}
    socio_stats = db.query(DistrictSocioeconomic).join(District).all()
    
    aligned_data = []
    for stat in socio_stats:
        dist_name = stat.district.DistrictName
        count = crime_map.get(dist_name, 0)
        crime_rate = round((count / stat.population) * 100000, 2) if stat.population > 0 else 0.0
        
        aligned_data.append({
            "district": dist_name,
            "crime_count": count,
            "population": stat.population,
            "crime_rate": crime_rate,
            "unemployment_rate": stat.unemployment_rate,
            "urbanization_index": stat.urbanization_index,
            "literacy_rate": stat.literacy_rate
        })
        
    if len(aligned_data) < 2:
        return {
            "districts": aligned_data,
            "correlations": {
                "unemployment": 0.0,
                "urbanization": 0.0,
                "literacy": 0.0
            }
        }
        
    rates = [d["crime_rate"] for d in aligned_data]
    unemp = [d["unemployment_rate"] for d in aligned_data]
    urban = [d["urbanization_index"] for d in aligned_data]
    lit = [d["literacy_rate"] for d in aligned_data]
    
    res = {
        "districts": aligned_data,
        "correlations": {
            "unemployment": _pearson_corr(rates, unemp),
            "urbanization": _pearson_corr(rates, urban),
            "literacy": _pearson_corr(rates, lit)
        }
    }
    _CORRELATIONS_CACHE = res
    _CORRELATIONS_CACHE_TIME = now
    return res
