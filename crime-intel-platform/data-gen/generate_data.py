import csv
import os
import random
from datetime import datetime, timedelta

# Try to import Faker; if not present, procedurally generate names
try:
    from faker import Faker
except ImportError:
    Faker = None

# Districts and centroids (Karnataka)
DISTRICT_CONFIGS = {
    1: {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946, "stations": ["Indiranagar PS", "Koramangala PS", "Jayanagar PS", "Whitefield PS", "Malleshwaram PS"]},
    2: {"name": "Mysuru", "lat": 12.2958, "lon": 76.6394, "stations": ["Devaraja PS", "Lashkar PS", "Mandi PS", "Nazarbad PS", "K R Puram PS"]},
    3: {"name": "Mangaluru", "lat": 12.9141, "lon": 74.8560, "stations": ["Pandeshwar PS", "Kadri PS", "Urwa PS", "Bunder PS", "Kankanady PS"]},
    4: {"name": "Hubli-Dharwad", "lat": 15.3647, "lon": 75.1240, "stations": ["Gokul Road PS", "Suburban PS", "Town Station PS", "Vidyagiri PS", "Dharwad Town PS"]},
    5: {"name": "Belagavi", "lat": 15.8497, "lon": 74.4977, "stations": ["Khade Bazar PS", "Market PS", "Camp PS", "Shahapur PS", "Udyambag PS"]},
    6: {"name": "Kalaburagi", "lat": 17.3297, "lon": 76.8343, "stations": ["Chowk PS", "Station Bazaar PS", "Raghavendra Nagar PS", "University PS", "M B Nagar PS"]},
    7: {"name": "Davanagere", "lat": 14.4644, "lon": 75.9218, "stations": ["KTJ Nagar PS", "Gandhinagar PS", "Extension PS", "Vidyanagar PS", "Badashah PS"]},
    8: {"name": "Shivamogga", "lat": 13.9299, "lon": 75.5681, "stations": ["Kote PS", "Doddapete PS", "Tunga Nagar PS", "Vinoba Nagar PS", "Jayanagar PS"]},
    9: {"name": "Ballari", "lat": 15.1394, "lon": 76.9214, "stations": ["Brucepet PS", "Cowlobazaar PS", "Gandhinagar PS", "Rural PS", "APMC PS"]},
    10: {"name": "Bidar", "lat": 17.9104, "lon": 77.5199, "stations": ["Town Station PS", "Gandhi Gunj PS", "New Town PS", "Market PS", "Air Force PS"]}
}

# Major Heads
MAJOR_HEADS = {
    1: "Crimes Against Body",
    2: "Property Offence",
    3: "Cyber Crime",
    4: "Narcotics"
}

# Minor Heads linked to Major Heads
MINOR_HEADS = {
    101: {"major_id": 1, "name": "Murder"},
    102: {"major_id": 1, "name": "Kidnapping"},
    103: {"major_id": 1, "name": "Assault"},
    201: {"major_id": 2, "name": "Burglary"},
    202: {"major_id": 2, "name": "Theft"},
    203: {"major_id": 2, "name": "Robbery"},
    301: {"major_id": 3, "name": "Phishing"},
    302: {"major_id": 3, "name": "Identity Theft"},
    303: {"major_id": 3, "name": "Crypto Scam"},
    401: {"major_id": 4, "name": "Narcotics Possession"},
    402: {"major_id": 4, "name": "Drug Peddling"}
}

# MO tags by minor head
MO_TAGS_POOL = {
    101: ["weapon_sharp", "private_dispute", "outdoor", "nighttime", "rage"],
    102: ["ransom_demand", "minor_victim", "vehicle_used", "acquaintance_involved"],
    103: ["street_brawl", "domestic_dispute", "weapon_blunt", "drunken_altercation", "public_place"],
    201: ["night_entry", "broken_lock", "window_forced", "cctv_sprayed", "residential"],
    202: ["shoplifting", "vehicle_theft", "pickpocketing", "unattended_bag", "daytime"],
    203: ["highway_heist", "weapon_knife", "masked_suspects", "snatching", "cash_transit"],
    301: ["phishing_link", "email_spoofing", "credential_harvesting", "fake_bank"],
    302: ["identity_theft", "otp_fraud", "sim_swap", "document_forgery"],
    303: ["crypto_scam", "investment_fraud", "fake_exchange", "rug_pull"],
    401: ["possession", "personal_use", "transit_seizure", "college_area"],
    402: ["peddling", "dealership", "bulk_supply", "synthetic_drugs", "network_ring"]
}

# Status options
STATUS_MAP = {
    1: "Under Investigation",
    2: "Charge Sheeted",
    3: "Solved"
}

# Socioeconomic stats
DISTRICT_SOCIOECONOMIC = [
    {"district_id": 1, "population": 8443675, "unemployment_rate": 4.2, "urbanization_index": 0.88, "literacy_rate": 88.9},
    {"district_id": 2, "population": 3001127, "unemployment_rate": 5.1, "urbanization_index": 0.42, "literacy_rate": 72.8},
    {"district_id": 3, "population": 2089649, "unemployment_rate": 3.8, "urbanization_index": 0.51, "literacy_rate": 88.6},
    {"district_id": 4, "population": 1847023, "unemployment_rate": 6.4, "urbanization_index": 0.58, "literacy_rate": 80.0},
    {"district_id": 5, "population": 4779661, "unemployment_rate": 5.9, "urbanization_index": 0.28, "literacy_rate": 73.5},
    {"district_id": 6, "population": 2566326, "unemployment_rate": 8.2, "urbanization_index": 0.32, "literacy_rate": 64.9},
    {"district_id": 7, "population": 1945497, "unemployment_rate": 5.5, "urbanization_index": 0.35, "literacy_rate": 75.7},
    {"district_id": 8, "population": 1752753, "unemployment_rate": 4.8, "urbanization_index": 0.36, "literacy_rate": 80.5},
    {"district_id": 9, "population": 2452595, "unemployment_rate": 7.1, "urbanization_index": 0.38, "literacy_rate": 67.4},
    {"district_id": 10, "population": 1703300, "unemployment_rate": 7.8, "urbanization_index": 0.25, "literacy_rate": 70.5}
]

def generate_lat_lon(centroid_lat, centroid_lon, jitter=0.07):
    return (
        round(centroid_lat + random.uniform(-jitter, jitter), 6),
        round(centroid_lon + random.uniform(-jitter, jitter), 6)
    )

def make_crime_no(district_id, station_id, year, serial):
    # Format: 1 digit category (1) + 4 digit district + 4 digit station + 4 digit year + 5 digit serial
    return f"1{district_id:04d}{station_id:04d}{year:04d}{serial:05d}"

def make_case_no(year, serial):
    # Format: YYYY + 5-digit serial (e.g. 202500042)
    return f"{year:04d}{serial:05d}"

def main():
    print("Initializing KSP ER-aligned synthetic data generation...")
    fake = Faker('en_IN') if Faker else None
    
    out_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)
    
    # 1. Output Districts
    with open(f"{out_dir}/districts.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["DistrictID", "DistrictName", "StateID", "Active"])
        for d_id, cfg in DISTRICT_CONFIGS.items():
            writer.writerow([d_id, cfg["name"], 1, 1])

    # 2. Output Units (Police Stations)
    # Bengaluru has stations 1-5, Mysuru has 6-10, etc.
    station_map = {} # station_id -> {name, district_id}
    station_counter = 1
    with open(f"{out_dir}/units.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["UnitID", "UnitName", "DistrictID", "StateID", "Active"])
        for d_id, cfg in DISTRICT_CONFIGS.items():
            for st_name in cfg["stations"]:
                writer.writerow([station_counter, st_name, d_id, 1, 1])
                station_map[station_counter] = {"name": st_name, "district_id": d_id}
                station_counter += 1

    # 3. Output Case Status Master
    with open(f"{out_dir}/case_status_master.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["CaseStatusID", "CaseStatusName"])
        for st_id, st_name in STATUS_MAP.items():
            writer.writerow([st_id, st_name])

    # 4. Output Crime Heads
    with open(f"{out_dir}/crime_heads.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["CrimeHeadID", "CrimeGroupName", "Active"])
        for h_id, h_name in MAJOR_HEADS.items():
            writer.writerow([h_id, h_name, 1])

    # 5. Output Crime Sub Heads
    with open(f"{out_dir}/crime_sub_heads.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["CrimeSubHeadID", "CrimeHeadID", "CrimeHeadName", "SeqID"])
        for sub_id, cfg in MINOR_HEADS.items():
            writer.writerow([sub_id, cfg["major_id"], cfg["name"], sub_id])

    # 6. Output Socioeconomic stats
    with open(f"{out_dir}/district_socioeconomic.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["DistrictID", "population", "unemployment_rate", "urbanization_index", "literacy_rate"])
        for row in DISTRICT_SOCIOECONOMIC:
            writer.writerow([row["district_id"], row["population"], row["unemployment_rate"], row["urbanization_index"], row["literacy_rate"]])

    # Collections for CaseMaster, Accused, Victims
    cases = []
    accused_records = []
    victims = []
    
    case_id_counter = 1
    accused_id_counter = 1
    victim_id_counter = 1
    
    # Station serial counters: (district_id, station_id, year) -> current running serial
    serial_counters = {}
    def get_next_serial(d_id, st_id, year):
        key = (d_id, st_id, year)
        serial_counters[key] = serial_counters.get(key, 0) + 1
        return serial_counters[key]

    # Generate repeat offenders network in Bengaluru (District 1, Station 1: Indiranagar PS)
    repeat_accused_profiles = []
    repeat_names = ["Ramesh Kumar", "Suresh Naik", "Anil Gowda", "Vijay Shekar", "Kiran Patil"]
    for i, name in enumerate(repeat_names):
        repeat_accused_profiles.append({
            "person_id": f"A-908{i+1}",
            "name": name,
            "age": random.randint(25, 40),
            "gender_id": 1, # Male
            "risk_score": random.randint(78, 96)
        })

    # Pattern A: 12 incidents linked to the same 5 repeat accused
    for i in range(12):
        year = 2025
        serial = get_next_serial(1, 1, year)
        crime_no = make_crime_no(1, 1, year, serial)
        case_no = make_case_no(year, serial)
        
        # Coordinated property offences
        minor_id = 201 if i % 2 == 0 else 203 # Burglary or Robbery
        major_id = 2
        
        dt = datetime(2025, 11, random.randint(1, 28), random.randint(0, 23), random.randint(0, 59))
        lat, lon = generate_lat_lon(DISTRICT_CONFIGS[1]["lat"], DISTRICT_CONFIGS[1]["lon"], jitter=0.03)
        mo_tags = ",".join(random.sample(MO_TAGS_POOL[minor_id], 3))

        cases.append({
            "CaseMasterID": case_id_counter,
            "CrimeNo": crime_no,
            "CaseNo": case_no,
            "CrimeRegisteredDate": dt.strftime("%Y-%m-%d"),
            "IncidentFromDate": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "PoliceStationID": 1, # Indiranagar PS
            "CaseStatusID": 1 if i % 3 == 0 else 2 if i % 3 == 1 else 3,
            "CrimeMajorHeadID": major_id,
            "CrimeMinorHeadID": minor_id,
            "latitude": lat,
            "longitude": lon,
            "BriefFacts": f"Coordinated heist linked to the Bangalore West Gang. MO matches tag '{mo_tags}'. Case details: Property damage reported at Indiranagar jurisdiction.",
            "mo_tags": mo_tags
        })

        # Link all 5 repeat offenders to this case
        for acc in repeat_accused_profiles:
            accused_records.append({
                "AccusedMasterID": accused_id_counter,
                "CaseMasterID": case_id_counter,
                "AccusedName": acc["name"],
                "AgeYear": acc["age"],
                "GenderID": acc["gender_id"],
                "PersonID": acc["person_id"],
                "risk_score": acc["risk_score"]
            })
            accused_id_counter += 1

        # Add 1-2 victims
        for v_idx in range(random.randint(1, 2)):
            victims.append({
                "VictimMasterID": victim_id_counter,
                "CaseMasterID": case_id_counter,
                "VictimName": fake.name() if fake else f"Victim V{victim_id_counter}",
                "AgeYear": random.randint(22, 60),
                "GenderID": random.choice([1, 2])
            })
            victim_id_counter += 1

        case_id_counter += 1

    # Pattern B: Crime Spike in Hubli-Dharwad in October 2025
    # Let's generate 45 extra cases of Burglary (201) / Theft (202) in District 4 (Hubli-Dharwad) in October 2025
    for i in range(45):
        year = 2025
        station_id = random.randint(16, 20) # Hubli-Dharwad stations
        serial = get_next_serial(4, station_id, year)
        crime_no = make_crime_no(4, station_id, year, serial)
        case_no = make_case_no(year, serial)
        
        minor_id = 201 if i % 2 == 0 else 202
        major_id = 2
        
        dt = datetime(2025, 10, random.randint(1, 31), random.randint(0, 23), random.randint(0, 59))
        lat, lon = generate_lat_lon(DISTRICT_CONFIGS[4]["lat"], DISTRICT_CONFIGS[4]["lon"], jitter=0.04)
        mo_tags = ",".join(random.sample(MO_TAGS_POOL[minor_id], 3))

        cases.append({
            "CaseMasterID": case_id_counter,
            "CrimeNo": crime_no,
            "CaseNo": case_no,
            "CrimeRegisteredDate": dt.strftime("%Y-%m-%d"),
            "IncidentFromDate": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "PoliceStationID": station_id,
            "CaseStatusID": random.choice([1, 2, 3]),
            "CrimeMajorHeadID": major_id,
            "CrimeMinorHeadID": minor_id,
            "latitude": lat,
            "longitude": lon,
            "BriefFacts": f"Property offence spike incident. Theft/Burglary reported in Hubli-Dharwad station limits. MO: {mo_tags}.",
            "mo_tags": mo_tags
        })

        # Add accused
        accused_records.append({
            "AccusedMasterID": accused_id_counter,
            "CaseMasterID": case_id_counter,
            "AccusedName": fake.name() if fake else f"Suspect H{accused_id_counter}",
            "AgeYear": random.randint(18, 55),
            "GenderID": random.choice([1, 2]),
            "PersonID": f"A-HD{accused_id_counter}",
            "risk_score": random.randint(25, 80)
        })
        accused_id_counter += 1

        # Add victim
        victims.append({
            "VictimMasterID": victim_id_counter,
            "CaseMasterID": case_id_counter,
            "VictimName": fake.name() if fake else f"Victim H{victim_id_counter}",
            "AgeYear": random.randint(20, 65),
            "GenderID": random.choice([1, 2])
        })
        victim_id_counter += 1
        case_id_counter += 1

    # Standard Random Data Generation: Generate remaining incidents to reach 3000 total cases
    target_count = 3000
    while len(cases) < target_count:
        # Pick random district, station, date
        d_id = random.choice(list(DISTRICT_CONFIGS.keys()))
        cfg = DISTRICT_CONFIGS[d_id]
        
        # Pick station linked to district
        # Station IDs range: Bengaluru (1-5), Mysuru (6-10), etc.
        st_offset = (d_id - 1) * 5
        st_id = st_offset + random.randint(1, 5)
        
        year = 2025
        serial = get_next_serial(d_id, st_id, year)
        crime_no = make_crime_no(d_id, st_id, year, serial)
        case_no = make_case_no(year, serial)

        # Pick random crime minor head
        minor_id = random.choice(list(MINOR_HEADS.keys()))
        major_id = MINOR_HEADS[minor_id]["major_id"]

        # Date range: Jan 2025 to Dec 2025 (excluding October to prevent diluting the spike)
        month = random.choice([1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12])
        dt = datetime(2025, month, random.randint(1, 28), random.randint(0, 23), random.randint(0, 59))
        
        lat, lon = generate_lat_lon(cfg["lat"], cfg["lon"], jitter=0.06)
        mo_tags = ",".join(random.sample(MO_TAGS_POOL[minor_id], 3))

        cases.append({
            "CaseMasterID": case_id_counter,
            "CrimeNo": crime_no,
            "CaseNo": case_no,
            "CrimeRegisteredDate": dt.strftime("%Y-%m-%d"),
            "IncidentFromDate": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "PoliceStationID": st_id,
            "CaseStatusID": random.choice([1, 2, 3]),
            "CrimeMajorHeadID": major_id,
            "CrimeMinorHeadID": minor_id,
            "latitude": lat,
            "longitude": lon,
            "BriefFacts": f"Regular crime incident report. Crime type: {MINOR_HEADS[minor_id]['name']}. MO tags matching '{mo_tags}'. Location details archived.",
            "mo_tags": mo_tags
        })

        # 30% chance to have no accused, 50% for 1 accused, 20% for 2 accused
        rand_val = random.random()
        num_accused = 0 if rand_val < 0.3 else 1 if rand_val < 0.8 else 2
        for _ in range(num_accused):
            # 5% chance to link to an existing repeat offender to create some cross-links
            if random.random() < 0.05:
                acc = random.choice(repeat_accused_profiles)
                accused_records.append({
                    "AccusedMasterID": accused_id_counter,
                    "CaseMasterID": case_id_counter,
                    "AccusedName": acc["name"],
                    "AgeYear": acc["age"],
                    "GenderID": acc["gender_id"],
                    "PersonID": acc["person_id"],
                    "risk_score": acc["risk_score"]
                })
            else:
                accused_records.append({
                    "AccusedMasterID": accused_id_counter,
                    "CaseMasterID": case_id_counter,
                    "AccusedName": fake.name() if fake else f"Suspect S{accused_id_counter}",
                    "AgeYear": random.randint(18, 62),
                    "GenderID": random.choice([1, 2]),
                    "PersonID": f"A-GEN{accused_id_counter}",
                    "risk_score": random.randint(15, 75)
                })
            accused_id_counter += 1

        # 1-2 victims
        for _ in range(random.randint(1, 2)):
            victims.append({
                "VictimMasterID": victim_id_counter,
                "CaseMasterID": case_id_counter,
                "VictimName": fake.name() if fake else f"Victim V{victim_id_counter}",
                "AgeYear": random.randint(12, 75),
                "GenderID": random.choice([1, 2])
            })
            victim_id_counter += 1

        case_id_counter += 1

    # Output Case Master CSV
    with open(f"{out_dir}/case_master.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["CaseMasterID", "CrimeNo", "CaseNo", "CrimeRegisteredDate", "IncidentFromDate", "PoliceStationID", "CaseStatusID", "CrimeMajorHeadID", "CrimeMinorHeadID", "latitude", "longitude", "BriefFacts", "mo_tags"])
        for c in cases:
            writer.writerow([c["CaseMasterID"], c["CrimeNo"], c["CaseNo"], c["CrimeRegisteredDate"], c["IncidentFromDate"], c["PoliceStationID"], c["CaseStatusID"], c["CrimeMajorHeadID"], c["CrimeMinorHeadID"], c["latitude"], c["longitude"], c["BriefFacts"], c["mo_tags"]])

    # Output Accused CSV
    with open(f"{out_dir}/accused.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["AccusedMasterID", "CaseMasterID", "AccusedName", "AgeYear", "GenderID", "PersonID", "risk_score"])
        for a in accused_records:
            writer.writerow([a["AccusedMasterID"], a["CaseMasterID"], a["AccusedName"], a["AgeYear"], a["GenderID"], a["PersonID"], a["risk_score"]])

    # Output Victims CSV
    with open(f"{out_dir}/victims.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["VictimMasterID", "CaseMasterID", "VictimName", "AgeYear", "GenderID"])
        for v in victims:
            writer.writerow([v["VictimMasterID"], v["CaseMasterID"], v["VictimName"], v["AgeYear"], v["GenderID"]])

    print(f"Data generation complete! Saved files to {out_dir}:")
    print(f"- Districts: {len(DISTRICT_CONFIGS)}")
    print(f"- Units (Stations): {len(station_map)}")
    print(f"- Case Master Records: {len(cases)}")
    print(f"- Accused Records: {len(accused_records)}")
    print(f"- Victim Records: {len(victims)}")

if __name__ == "__main__":
    main()
