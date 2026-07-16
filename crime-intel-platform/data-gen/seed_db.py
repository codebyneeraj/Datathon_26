import sys
import os
import csv
from datetime import datetime

# Add backend directory to sys.path so we can import models and database
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.append(backend_path)

from app.database import engine, SessionLocal, Base
from app.models import Incident, Accused, Victim, DistrictSocioeconomic

def seed_database():
    print("Recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    # Check if CSV files exist in data-gen
    data_gen_dir = os.path.dirname(__file__)
    
    # 1. Seed DistrictSocioeconomic
    se_path = os.path.join(data_gen_dir, "district_socioeconomic.csv")
    print(f"Seeding district socioeconomic statistics from {se_path}...")
    with open(se_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            db_se = DistrictSocioeconomic(
                district=row["district"],
                population=int(row["population"]),
                unemployment_rate=float(row["unemployment_rate"]),
                urbanization_index=float(row["urbanization_index"]),
                literacy_rate=float(row["literacy_rate"])
            )
            db.add(db_se)
    db.commit()
    
    # 2. Seed Incidents
    incidents_path = os.path.join(data_gen_dir, "incidents.csv")
    print(f"Seeding incidents from {incidents_path}...")
    with open(incidents_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Parse date and time
            date_val = datetime.strptime(row["date"], "%Y-%m-%d").date()
            time_val = datetime.strptime(row["time"], "%H:%M:%S").time()
            
            db_inc = Incident(
                id=int(row["id"]),
                crime_type=row["crime_type"],
                date=date_val,
                time=time_val,
                lat=float(row["lat"]),
                long=float(row["long"]),
                district=row["district"],
                station=row["station"],
                mo_tags=row["mo_tags"],
                status=row["status"]
            )
            db.add(db_inc)
    db.commit()
    
    # 3. Seed Accused
    accused_path = os.path.join(data_gen_dir, "accused.csv")
    print(f"Seeding accused details from {accused_path}...")
    with open(accused_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            db_acc = Accused(
                id=int(row["id"]),
                name=row["name"],
                age=int(row["age"]),
                gender=row["gender"],
                past_incident_ids=row["past_incident_ids"],
                risk_score=int(row["risk_score"])
            )
            db.add(db_acc)
    db.commit()
    
    # 4. Seed Victims
    victims_path = os.path.join(data_gen_dir, "victims.csv")
    print(f"Seeding victim details from {victims_path}...")
    with open(victims_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            db_vic = Victim(
                id=int(row["id"]),
                age=int(row["age"]),
                gender=row["gender"],
                incident_id=int(row["incident_id"])
            )
            db.add(db_vic)
    db.commit()
    
    db.close()
    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_database()
