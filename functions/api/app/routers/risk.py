import pandas as pd
import numpy as np
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.ensemble import RandomForestClassifier
from ..database import get_db
from ..models import CaseMaster, DistrictSocioeconomic, Accused, District, Unit, CaseStatusMaster

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/scores")
def get_risk_scores_api(db: Session = Depends(get_db)):
    # 1. Query all incidents and join to get district name
    incidents = db.query(CaseMaster).join(Unit).join(District).all()
    
    if not incidents:
        return []
        
    df_inc = pd.DataFrame([{
        "district": inc.unit.district.DistrictName,
        "month": inc.CrimeRegisteredDate[:7]
    } for inc in incidents])
    
    # Count incidents per district per month
    df_monthly = df_inc.groupby(["district", "month"]).size().reset_index(name="incident_count")
    
    # 2. Get socioeconomic factors
    socio = db.query(DistrictSocioeconomic).join(District).all()
    df_socio = pd.DataFrame([{
        "district": s.district.DistrictName,
        "population": s.population,
        "unemployment_rate": s.unemployment_rate,
        "urbanization_index": s.urbanization_index,
        "literacy_rate": s.literacy_rate
    } for s in socio])
    
    # Merge datasets
    df_merged = pd.merge(df_monthly, df_socio, on="district")
    
    # Create target label for Random Forest
    def define_risk(count):
        if count > 28:
            return 2
        elif count >= 15:
            return 1
        else:
            return 0
            
    df_merged["risk_class"] = df_merged["incident_count"].apply(define_risk)
    
    # Features for training
    features = ["population", "unemployment_rate", "urbanization_index", "literacy_rate", "incident_count"]
    X = df_merged[features].values
    y = df_merged["risk_class"].values
    
    # Fit Random Forest Classifier
    rf = RandomForestClassifier(n_estimators=50, random_state=42)
    rf.fit(X, y)
    
    # 3. Calculate Risk Score for each district for the latest month
    latest_months = df_monthly.groupby("district")["month"].max().to_dict()
    
    results = []
    
    for s in socio:
        dist_name = s.district.DistrictName
        # Get incident count for latest month
        dist_monthly = df_monthly[df_monthly["district"] == dist_name]
        
        if dist_monthly.empty:
            latest_count = 0
            latest_month = "2025-12"
        else:
            latest_month = latest_months[dist_name]
            latest_count = int(dist_monthly[dist_monthly["month"] == latest_month]["incident_count"].values[0])
            
        # Feature vector for prediction
        feat_vector = np.array([[s.population, s.unemployment_rate, s.urbanization_index, s.literacy_rate, latest_count]])
        
        # Predict class probabilities
        probs = rf.predict_proba(feat_vector)[0]
        prob_dict = {cls: prob for cls, prob in zip(rf.classes_, probs)}
        p_low = prob_dict.get(0, 0.0)
        p_med = prob_dict.get(1, 0.0)
        p_high = prob_dict.get(2, 0.0)
        
        # Calculate continuous 0-100 risk score
        risk_score_val = int((p_med * 45) + (p_high * 100))
        risk_score_val = min(max(risk_score_val, 0), 100)
        
        # 4. Calculate Anomaly Spike Flag (October 2025 vs Jan-Sept 2025)
        dist_incidents_by_month = df_monthly[df_monthly["district"] == dist_name]
        
        baseline_data = dist_incidents_by_month[dist_incidents_by_month["month"] < "2025-10"]
        oct_data = dist_incidents_by_month[dist_incidents_by_month["month"] == "2025-10"]
        
        anomaly_flag = False
        spike_percentage = 0.0
        
        if not baseline_data.empty and not oct_data.empty:
            baseline_mean = baseline_data["incident_count"].mean()
            baseline_std = baseline_data["incident_count"].std()
            oct_count = oct_data["incident_count"].values[0]
            
            if baseline_mean > 0:
                spike_percentage = round(((oct_count - baseline_mean) / baseline_mean) * 100, 1)
                
            if pd.isna(baseline_std) or baseline_std == 0:
                if spike_percentage >= 40.0:
                    anomaly_flag = True
            else:
                if oct_count > (baseline_mean + 1.8 * baseline_std) and spike_percentage >= 40.0:
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
        
    return results


@router.get("/accused")
def get_accused_api(
    district: str = Query(..., description="District to query accused for"),
    db: Session = Depends(get_db)
):
    # Query accused links where case unit is in target district
    links = db.query(Accused).join(CaseMaster).join(Unit).join(District).filter(District.DistrictName == district).all()
    
    # Group by PersonID to avoid duplicate offender nodes
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
    
    # Sort by risk_score descending to show top threats first
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results


@router.get("/stats")
def get_stats_api(db: Session = Depends(get_db)):
    # 1. Total incidents
    total_count = db.query(CaseMaster).count()
    
    # 2. Solved incidents count (Solved or Charge Sheeted)
    solved_count = db.query(CaseMaster).join(CaseStatusMaster).filter(CaseStatusMaster.CaseStatusName.in_(["Solved", "Charge Sheeted"])).count()
    clearance_rate = round((solved_count / total_count) * 100, 1) if total_count > 0 else 0.0
    
    # 3. Anomalies count
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
    incidents = db.query(CaseMaster).join(Unit).join(District).all()
    if not incidents:
        return {
            "predicted_risk_score": 0,
            "risk_level": "Low",
            "probabilities": {"Low": 1.0, "Medium": 0.0, "High": 0.0}
        }
        
    df_inc = pd.DataFrame([{
        "district": inc.unit.district.DistrictName,
        "month": inc.CrimeRegisteredDate[:7]
    } for inc in incidents])
    
    df_monthly = df_inc.groupby(["district", "month"]).size().reset_index(name="incident_count")
    
    socio = db.query(DistrictSocioeconomic).join(District).all()
    df_socio = pd.DataFrame([{
        "district": s.district.DistrictName,
        "population": s.population,
        "unemployment_rate": s.unemployment_rate,
        "urbanization_index": s.urbanization_index,
        "literacy_rate": s.literacy_rate
    } for s in socio])
    
    df_merged = pd.merge(df_monthly, df_socio, on="district")
    
    def define_risk(count):
        if count > 28:
            return 2
        elif count >= 15:
            return 1
        else:
            return 0
            
    df_merged["risk_class"] = df_merged["incident_count"].apply(define_risk)
    
    features = ["population", "unemployment_rate", "urbanization_index", "literacy_rate", "incident_count"]
    X = df_merged[features].values
    y = df_merged["risk_class"].values
    
    rf = RandomForestClassifier(n_estimators=50, random_state=42)
    rf.fit(X, y)
    
    feat_vector = np.array([[population, unemployment_rate, urbanization_index, literacy_rate, incident_count]])
    probs = rf.predict_proba(feat_vector)[0]
    
    prob_dict = {cls: prob for cls, prob in zip(rf.classes_, probs)}
    p_low = float(prob_dict.get(0, 0.0))
    p_med = float(prob_dict.get(1, 0.0))
    p_high = float(prob_dict.get(2, 0.0))
    
    risk_score_val = int((p_med * 45) + (p_high * 100))
    risk_score_val = min(max(risk_score_val, 0), 100)
    
    return {
        "predicted_risk_score": risk_score_val,
        "risk_level": "High" if risk_score_val >= 70 else "Medium" if risk_score_val >= 35 else "Low",
        "probabilities": {
            "Low": round(p_low, 3),
            "Medium": round(p_med, 3),
            "High": round(p_high, 3)
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



