import pandas as pd
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import Incident, DistrictSocioeconomic

router = APIRouter(prefix="/api/correlations", tags=["correlations"])

@router.get("")
def get_correlations_api(db: Session = Depends(get_db)):
    # 1. Query crime counts per district
    crime_counts = db.query(
        Incident.district,
        func.count(Incident.id).label("crime_count")
    ).group_by(Incident.district).all()
    
    crime_map = {district: count for district, count in crime_counts}
    
    # 2. Query socio-economic details
    socio_stats = db.query(DistrictSocioeconomic).all()
    
    # Align data
    aligned_data = []
    for stat in socio_stats:
        count = crime_map.get(stat.district, 0)
        # Crime rate per 100,000 citizens
        crime_rate = round((count / stat.population) * 100000, 2) if stat.population > 0 else 0.0
        
        aligned_data.append({
            "district": stat.district,
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
        
    # Convert to DataFrame to calculate Pearson correlation
    df = pd.DataFrame(aligned_data)
    
    # Compute correlations
    corr_unemployment = float(df["crime_rate"].corr(df["unemployment_rate"], method="pearson"))
    corr_urbanization = float(df["crime_rate"].corr(df["urbanization_index"], method="pearson"))
    corr_literacy = float(df["crime_rate"].corr(df["literacy_rate"], method="pearson"))
    
    # Replace NaN values with 0.0
    corr_unemployment = 0.0 if pd.isna(corr_unemployment) else round(corr_unemployment, 3)
    corr_urbanization = 0.0 if pd.isna(corr_urbanization) else round(corr_urbanization, 3)
    corr_literacy = 0.0 if pd.isna(corr_literacy) else round(corr_literacy, 3)
    
    return {
        "districts": aligned_data,
        "correlations": {
            "unemployment": corr_unemployment,
            "urbanization": corr_urbanization,
            "literacy": corr_literacy
        }
    }
