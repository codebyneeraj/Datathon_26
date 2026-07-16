import pandas as pd
import numpy as np
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from sklearn.ensemble import RandomForestClassifier
from ..database import get_db
from ..models import Incident, DistrictSocioeconomic, Accused

router = APIRouter(prefix="/api/risk", tags=["risk"])


@router.get("/scores")
def get_risk_scores_api(db: Session = Depends(get_db)):
    # 1. Query all incidents and group by district and month
    # We will parse the date to extract year-month
    incidents = db.query(Incident).all()
    
    if not incidents:
        return []
        
    df_inc = pd.DataFrame([{
        "district": inc.district,
        "date": inc.date,
        "month": inc.date.strftime("%Y-%m")
    } for inc in incidents])
    
    # Count incidents per district per month
    df_monthly = df_inc.groupby(["district", "month"]).size().reset_index(name="incident_count")
    
    # 2. Get socioeconomic factors
    socio = db.query(DistrictSocioeconomic).all()
    df_socio = pd.DataFrame([{
        "district": s.district,
        "population": s.population,
        "unemployment_rate": s.unemployment_rate,
        "urbanization_index": s.urbanization_index,
        "literacy_rate": s.literacy_rate
    } for s in socio])
    
    # Merge datasets
    df_merged = pd.merge(df_monthly, df_socio, on="district")
    
    # Create target label for Random Forest
    # Low risk (0): < 15 crimes/month
    # Medium risk (1): 15-28 crimes/month
    # High risk (2): > 28 crimes/month
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
    
    # 3. Calculate Risk Score for each district for the latest month (e.g. "2025-10" or "2025-12")
    # We will use the latest month available in the dataset for each district
    latest_months = df_monthly.groupby("district")["month"].max().to_dict()
    
    results = []
    
    for s in socio:
        dist_name = s.district
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
        # Classes: 0 (Low), 1 (Medium), 2 (High)
        # Handle cases where all classes might not be present in y
        prob_dict = {cls: prob for cls, prob in zip(rf.classes_, probs)}
        p_low = prob_dict.get(0, 0.0)
        p_med = prob_dict.get(1, 0.0)
        p_high = prob_dict.get(2, 0.0)
        
        # Calculate continuous 0-100 risk score
        risk_score_val = int((p_med * 45) + (p_high * 100))
        # Ensure it falls within 0-100
        risk_score_val = min(max(risk_score_val, 0), 100)
        
        # 4. Calculate Anomaly Spike Flag (October 2025 vs Jan-Sept 2025)
        # Compare October 2025 count to the average of previous months (Jan-Sep 2025)
        dist_incidents_by_month = df_monthly[df_monthly["district"] == dist_name]
        
        baseline_data = dist_incidents_by_month[dist_incidents_by_month["month"] < "2025-10"]
        oct_data = dist_incidents_by_month[dist_incidents_by_month["month"] == "2025-10"]
        
        anomaly_flag = False
        spike_percentage = 0.0
        
        if not baseline_data.empty and not oct_data.empty:
            baseline_mean = baseline_data["incident_count"].mean()
            baseline_std = baseline_data["incident_count"].std()
            oct_count = oct_data["incident_count"].values[0]
            
            # Anomaly is flagged if October is 40% higher than the baseline mean
            if baseline_mean > 0:
                spike_percentage = round(((oct_count - baseline_mean) / baseline_mean) * 100, 1)
                
            # If standard deviation is 0 (or NaN), use a simple 40% threshold.
            # Otherwise use Mean + 2*Std AND 40% threshold
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
    # 1. Query all incident IDs in this district
    incident_ids = [
        r[0] for r in db.query(Incident.id).filter(Incident.district == district).all()
    ]
    
    if not incident_ids:
        return []

    # 2. Query all accused
    all_accused = db.query(Accused).all()
    
    # 3. Filter accused who have at least one past_incident_id in incident_ids
    results = []
    for acc in all_accused:
        if not acc.past_incident_ids:
            continue
        try:
            acc_inc_ids = {int(x.strip()) for x in acc.past_incident_ids.split(",") if x.strip()}
        except ValueError:
            continue
            
        if acc_inc_ids.intersection(incident_ids):
            results.append({
                "id": acc.id,
                "name": acc.name,
                "age": acc.age,
                "gender": acc.gender,
                "risk_score": acc.risk_score
            })
            
    # Sort by risk_score descending to show top threats first
    results.sort(key=lambda x: x["risk_score"], reverse=True)
    return results

@router.get("/stats")
def get_stats_api(db: Session = Depends(get_db)):
    # 1. Total incidents
    total_count = db.query(Incident).count()
    
    # 2. Solved incidents count (Solved or Charge Sheeted)
    solved_count = db.query(Incident).filter(Incident.status.in_(["Solved", "Charge Sheeted"])).count()
    clearance_rate = round((solved_count / total_count) * 100, 1) if total_count > 0 else 0.0
    
    # 3. Anomalies count
    risk_scores = get_risk_scores_api(db)
    anomalies_count = sum(1 for r in risk_scores if r["anomaly_spike"])
    
    return {
        "total_incidents": total_count,
        "clearance_rate": clearance_rate,
        "anomalies_count": anomalies_count
      }


