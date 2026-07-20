import time
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from ..database import get_db
from ..models import CaseMaster, District, Unit, DistrictSocioeconomic
from ..analytics.clustering import detect_hotspots
from .correlations import _pearson_corr
from .risk import _calculate_pure_risk

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

_DASHBOARD_CACHE = None
_DASHBOARD_CACHE_TIME = 0
_DASHBOARD_CACHE_TTL = 300


@router.get("/init")
def get_dashboard_init(
    district: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Consolidated dashboard initialization endpoint.
    Fetches hotspots, risk scores, and correlations in a single serverless execution pass.
    """
    global _DASHBOARD_CACHE, _DASHBOARD_CACHE_TIME
    now = time.time()

    # Serve cached payload for unfiltered default dashboard view
    if (not district or district == 'All') and _DASHBOARD_CACHE is not None:
        if now - _DASHBOARD_CACHE_TIME < _DASHBOARD_CACHE_TTL:
            return _DASHBOARD_CACHE

    # 1. Hotspots
    query = db.query(CaseMaster)
    if district and district != 'All':
        query = query.join(Unit).join(District).filter(District.DistrictName == district)
    incidents = query.order_by(CaseMaster.CrimeRegisteredDate.desc()).limit(400).all()
    hotspot_features = detect_hotspots(incidents, eps=0.25, min_samples=4)
    hotspots_data = {
        "type": "FeatureCollection",
        "features": hotspot_features
    }

    # 2. Risk Scores
    rows = db.query(
        District.DistrictName,
        func.substr(CaseMaster.CrimeRegisteredDate, 1, 7).label("month"),
        func.count(CaseMaster.CaseMasterID).label("cnt")
    ).join(Unit, CaseMaster.PoliceStationID == Unit.UnitID)\
     .join(District, Unit.DistrictID == District.DistrictID)\
     .group_by(District.DistrictName, "month").all()

    district_monthly = {}
    for d_name, m_str, c_count in rows:
        if d_name and m_str:
            if d_name not in district_monthly:
                district_monthly[d_name] = {}
            district_monthly[d_name][m_str] = c_count

    socio_stats = db.query(DistrictSocioeconomic).join(District).all()
    risk_scores = []
    aligned_data = []

    for s in socio_stats:
        dist_name = s.district.DistrictName
        months_dict = district_monthly.get(dist_name, {})
        
        if months_dict:
            latest_month = max(months_dict.keys())
            latest_count = months_dict[latest_month]
        else:
            latest_month = "2025-12"
            latest_count = 0

        risk_score_val = _calculate_pure_risk(
            latest_count, s.population, s.unemployment_rate, s.urbanization_index, s.literacy_rate
        )

        baseline_counts = [count for m, count in months_dict.items() if m < "2025-10"]
        oct_count = months_dict.get("2025-10", 0)

        anomaly_flag = False
        spike_percentage = 0.0

        if baseline_counts and oct_count > 0:
            b_mean = sum(baseline_counts) / len(baseline_counts)
            if b_mean > 0:
                spike_percentage = round(((oct_count - b_mean) / b_mean) * 100, 1)

            if len(baseline_counts) > 1:
                b_var = sum((x - b_mean) ** 2 for x in baseline_counts) / (len(baseline_counts) - 1)
                b_std = (b_var) ** 0.5
            else:
                b_std = 0.0

            if b_std == 0:
                if spike_percentage >= 40.0:
                    anomaly_flag = True
            else:
                if oct_count > (b_mean + 1.8 * b_std) and spike_percentage >= 40.0:
                    anomaly_flag = True

        risk_scores.append({
            "district": dist_name,
            "latest_month": latest_month,
            "incident_count_latest": latest_count,
            "predicted_risk_score": risk_score_val,
            "risk_level": "High" if risk_score_val >= 70 else "Medium" if risk_score_val >= 35 else "Low",
            "anomaly_spike": anomaly_flag,
            "spike_percentage": spike_percentage,
            "unemployment_rate": s.unemployment_rate,
            "urbanization_index": s.urbanization_index,
            "literacy_rate": s.literacy_rate
        })

        total_dist_crime = sum(months_dict.values())
        crime_rate = round((total_dist_crime / s.population) * 100000, 2) if s.population > 0 else 0.0
        aligned_data.append({
            "district": dist_name,
            "crime_count": total_dist_crime,
            "population": s.population,
            "crime_rate": crime_rate,
            "unemployment_rate": s.unemployment_rate,
            "urbanization_index": s.urbanization_index,
            "literacy_rate": s.literacy_rate
        })

    # 3. Correlations
    rates = [d["crime_rate"] for d in aligned_data]
    unemp = [d["unemployment_rate"] for d in aligned_data]
    urban = [d["urbanization_index"] for d in aligned_data]
    lit = [d["literacy_rate"] for d in aligned_data]

    correlations_data = {
        "districts": aligned_data,
        "correlations": {
            "unemployment": _pearson_corr(rates, unemp),
            "urbanization": _pearson_corr(rates, urban),
            "literacy": _pearson_corr(rates, lit)
        }
    }

    result = {
        "hotspots": hotspots_data,
        "risk_scores": risk_scores,
        "correlations": correlations_data
    }

    if not district or district == 'All':
        _DASHBOARD_CACHE = result
        _DASHBOARD_CACHE_TIME = now

    return result
