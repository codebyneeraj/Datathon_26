import sys
import os
import csv

# Add backend directory to sys.path so we can import models and database
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.append(backend_path)

from app.database import engine, SessionLocal, Base
from app.models import (
    District, Unit, CaseStatusMaster, CrimeHead, CrimeSubHead,
    CaseMaster, Accused, Victim, DistrictSocioeconomic
)

def seed_database():
    print("Dropping and recreating database tables matching KSP ER Schema...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    data_gen_dir = os.path.dirname(__file__)
    
    try:
        # 1. Seed Districts
        districts_path = os.path.join(data_gen_dir, "districts.csv")
        print(f"Seeding districts from {districts_path}...")
        with open(districts_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_d = District(
                    DistrictID=int(row["DistrictID"]),
                    DistrictName=row["DistrictName"],
                    StateID=int(row["StateID"]),
                    Active=int(row["Active"])
                )
                db.add(db_d)
        db.commit()

        # 2. Seed Units (Police Stations)
        units_path = os.path.join(data_gen_dir, "units.csv")
        print(f"Seeding units from {units_path}...")
        with open(units_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_u = Unit(
                    UnitID=int(row["UnitID"]),
                    UnitName=row["UnitName"],
                    DistrictID=int(row["DistrictID"]),
                    StateID=int(row["StateID"]),
                    Active=int(row["Active"])
                )
                db.add(db_u)
        db.commit()

        # 3. Seed Case Status Master
        status_path = os.path.join(data_gen_dir, "case_status_master.csv")
        print(f"Seeding case status master from {status_path}...")
        with open(status_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_s = CaseStatusMaster(
                    CaseStatusID=int(row["CaseStatusID"]),
                    CaseStatusName=row["CaseStatusName"]
                )
                db.add(db_s)
        db.commit()

        # 4. Seed Crime Heads (Major Crime Group)
        heads_path = os.path.join(data_gen_dir, "crime_heads.csv")
        print(f"Seeding crime major heads from {heads_path}...")
        with open(heads_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_h = CrimeHead(
                    CrimeHeadID=int(row["CrimeHeadID"]),
                    CrimeGroupName=row["CrimeGroupName"],
                    Active=int(row["Active"])
                )
                db.add(db_h)
        db.commit()

        # 5. Seed Crime Sub Heads (Minor Crime Type)
        subheads_path = os.path.join(data_gen_dir, "crime_sub_heads.csv")
        print(f"Seeding crime sub heads from {subheads_path}...")
        with open(subheads_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_sh = CrimeSubHead(
                    CrimeSubHeadID=int(row["CrimeSubHeadID"]),
                    CrimeHeadID=int(row["CrimeHeadID"]),
                    CrimeHeadName=row["CrimeHeadName"],
                    SeqID=int(row["SeqID"])
                )
                db.add(db_sh)
        db.commit()

        # 6. Seed District Socioeconomic
        se_path = os.path.join(data_gen_dir, "district_socioeconomic.csv")
        print(f"Seeding district socioeconomic data from {se_path}...")
        with open(se_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_se = DistrictSocioeconomic(
                    DistrictID=int(row["DistrictID"]),
                    population=int(row["population"]),
                    unemployment_rate=float(row["unemployment_rate"]),
                    urbanization_index=float(row["urbanization_index"]),
                    literacy_rate=float(row["literacy_rate"])
                )
                db.add(db_se)
        db.commit()

        # 7. Seed Case Master
        cases_path = os.path.join(data_gen_dir, "case_master.csv")
        print(f"Seeding case master records from {cases_path}...")
        with open(cases_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_case = CaseMaster(
                    CaseMasterID=int(row["CaseMasterID"]),
                    CrimeNo=row["CrimeNo"],
                    CaseNo=row["CaseNo"],
                    CrimeRegisteredDate=row["CrimeRegisteredDate"],
                    IncidentFromDate=row["IncidentFromDate"],
                    PoliceStationID=int(row["PoliceStationID"]),
                    CaseStatusID=int(row["CaseStatusID"]),
                    CrimeMajorHeadID=int(row["CrimeMajorHeadID"]),
                    CrimeMinorHeadID=int(row["CrimeMinorHeadID"]),
                    latitude=float(row["latitude"]),
                    longitude=float(row["longitude"]),
                    BriefFacts=row["BriefFacts"],
                    mo_tags=row["mo_tags"]
                )
                db.add(db_case)
        db.commit()

        # 8. Seed Accused
        accused_path = os.path.join(data_gen_dir, "accused.csv")
        print(f"Seeding accused details from {accused_path}...")
        with open(accused_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_acc = Accused(
                    AccusedMasterID=int(row["AccusedMasterID"]),
                    CaseMasterID=int(row["CaseMasterID"]),
                    AccusedName=row["AccusedName"],
                    AgeYear=int(row["AgeYear"]),
                    GenderID=int(row["GenderID"]),
                    PersonID=row["PersonID"],
                    risk_score=int(row["risk_score"])
                )
                db.add(db_acc)
        db.commit()

        # 9. Seed Victims
        victims_path = os.path.join(data_gen_dir, "victims.csv")
        print(f"Seeding victim details from {victims_path}...")
        with open(victims_path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                db_vic = Victim(
                    VictimMasterID=int(row["VictimMasterID"]),
                    CaseMasterID=int(row["CaseMasterID"]),
                    VictimName=row["VictimName"],
                    AgeYear=int(row["AgeYear"]),
                    GenderID=int(row["GenderID"])
                )
                db.add(db_vic)
        db.commit()

        print("Database seed transactions committed successfully!")
    
    except Exception as e:
        print(f"Transaction rollbacked due to error: {e}")
        db.rollback()
        raise e
    
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
