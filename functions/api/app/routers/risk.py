import math
from collections import defaultdict
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import CaseMaster, DistrictSocioeconomic, Accused, District, Unit, CaseStatusMaster

import time

router = APIRouter(prefix="/api/risk", tags=["risk"])

_RISK_SCORES_CACHE = None
_RISK_SCORES_CACHE_TIME = 0
_RISK_SCORES_CACHE_TTL = 300

def _calculate_pure_risk(inc_count, population, unemployment, urbanization, literacy):
    # Normalized risk heuristic derived from threat model factors
    base_inc_factor = min(inc_count / 30.0, 1.0) * 50
    unemployment_factor = (unemployment / 15.0) * 20
    urban_factor = (urbanization / 100.0) * 15
    literacy_factor = max(0, (100.0 - literacy) / 40.0) * 15

    score = int(base_inc_factor + unemployment_factor + urban_factor + literacy_factor)
    return min(max(score, 0), 100)


@router.get("/scores")
def get_risk_scores_api(db: Session = Depends(get_db)):
    global _RISK_SCORES_CACHE, _RISK_SCORES_CACHE_TIME
    now = time.time()
    if _RISK_SCORES_CACHE is not None and (now - _RISK_SCORES_CACHE_TIME < _RISK_SCORES_CACHE_TTL):
        return _RISK_SCORES_CACHE
    rows = db.query(
        District.DistrictName,
        func.substr(CaseMaster.CrimeRegisteredDate, 1, 7).label("month"),
        func.count(CaseMaster.CaseMasterID).label("cnt")
    ).join(Unit, CaseMaster.PoliceStationID == Unit.UnitID)\
     .join(District, Unit.DistrictID == District.DistrictID)\
     .group_by(District.DistrictName, "month").all()

    district_monthly = defaultdict(dict)
    for d_name, m_str, c_count in rows:
        if d_name and m_str:
            district_monthly[d_name][m_str] = c_count

    socio = db.query(DistrictSocioeconomic).join(District).all()
    results = []

    for s in socio:
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

        # Baseline anomaly detection (Oct 2025 vs < Oct 2025)
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
                b_std = math.sqrt(b_var)
            else:
                b_std = 0.0

            if b_std == 0:
                if spike_percentage >= 40.0:
                    anomaly_flag = True
            else:
                if oct_count > (b_mean + 1.8 * b_std) and spike_percentage >= 40.0:
                    anomaly_flag = True

        results.append({
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

    _RISK_SCORES_CACHE = results
    _RISK_SCORES_CACHE_TIME = now
    return results


@router.get("/accused")
def get_accused_api(
    district: str = Query(..., description="District to query accused for"),
    db: Session = Depends(get_db)
):
    links = db.query(Accused).join(CaseMaster).join(Unit).join(District).filter(District.DistrictName == district).all()
    unique_offenders = {}
    for l in links:
        if l.PersonID not in unique_offenders:
            unique_offenders[l.PersonID] = l

    results = [{
        "id": acc.AccusedMasterID,
        "name": acc.AccusedName,
        "age": acc.AgeYear,
        "gender": "Male" if acc.GenderID == 1 else "Female",
        "risk_score": acc.risk_score
    } for acc in unique_offenders.values()]

    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


@router.get("/stats")
def get_stats_api(db: Session = Depends(get_db)):
    total_count = db.query(CaseMaster).count()
    solved_count = db.query(CaseMaster).join(CaseStatusMaster).filter(CaseStatusMaster.CaseStatusName.in_(["Solved", "Charge Sheeted"])).count()
    clearance_rate = round((solved_count / total_count) * 100, 1) if total_count > 0 else 0.0
    risk_scores = get_risk_scores_api(db)
    anomalies_count = sum(1 for r in risk_scores if r["anomaly_spike"])

    return {
        "total_incidents": total_count,
        "clearance_rate": clearance_rate,
        "anomalies_count": anomalies_count
    }


@router.get("/predict")
def predict_risk_api(
    population: int,
    unemployment_rate: float,
    urbanization_index: float,
    literacy_rate: float,
    incident_count: int,
    db: Session = Depends(get_db)
):
    risk_score_val = _calculate_pure_risk(
        incident_count, population, unemployment_rate, urbanization_index, literacy_rate
    )
    p_high = min(max(risk_score_val / 100.0, 0.0), 1.0)
    p_med = min(max((100.0 - abs(risk_score_val - 50.0) * 2) / 100.0, 0.0), 1.0)
    p_low = max(0.0, 1.0 - (p_high + p_med) / 2.0)
    total_p = p_low + p_med + p_high or 1.0

    return {
        "predicted_risk_score": risk_score_val,
        "risk_level": "High" if risk_score_val >= 70 else "Medium" if risk_score_val >= 35 else "Low",
        "probabilities": {
            "Low": round(p_low / total_p, 3),
            "Medium": round(p_med / total_p, 3),
            "High": round(p_high / total_p, 3)
        }
    }


@router.get("/incidents")
def get_incidents_api(
    district: Optional[str] = Query(None, description="Filter by district"),
    limit: int = Query(50, description="Max records to return"),
    db: Session = Depends(get_db)
):
    query = db.query(CaseMaster)
    if district and district != 'All':
        query = query.join(Unit).join(District).filter(District.DistrictName == district)
    incidents = query.order_by(CaseMaster.CrimeRegisteredDate.desc()).limit(limit).all()

    return [{
        "id": inc.CaseMasterID,
        "crime_type": inc.minor_head_rel.CrimeHeadName if inc.minor_head_rel else "Unknown",
        "date": inc.CrimeRegisteredDate,
        "time": inc.IncidentFromDate.split(" ")[1] if (inc.IncidentFromDate and " " in inc.IncidentFromDate) else "00:00:00",
        "district": inc.unit.district.DistrictName if inc.unit else "Unknown",
        "station": inc.unit.UnitName if inc.unit else "Unknown",
        "mo_tags": inc.mo_tags,
        "status": inc.status_rel.CaseStatusName if inc.status_rel else "Unknown"
    } for inc in incidents]


@router.post("/incidents/{incident_id}/status")
def update_incident_status(
    incident_id: int,
    status: str = Query(..., description="New status value"),
    db: Session = Depends(get_db)
):
    incident = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == incident_id).first()
    if not incident:
        return {"error": "Incident not found"}
    status_row = db.query(CaseStatusMaster).filter(CaseStatusMaster.CaseStatusName == status).first()
    if status_row:
        incident.CaseStatusID = status_row.CaseStatusID
        db.commit()
        db.refresh(incident)
    return {
        "status": "success",
        "incident_id": incident_id,
        "new_status": incident.status_rel.CaseStatusName if incident.status_rel else status
    }


@router.get("/incidents/{incident_id}/accused")
def get_incident_accused_api(incident_id: int, db: Session = Depends(get_db)):
    accused_list = db.query(Accused).filter(Accused.CaseMasterID == incident_id).all()
    return [{
        "id": acc.AccusedMasterID,
        "name": acc.AccusedName,
        "person_id": acc.PersonID
    } for acc in accused_list]
