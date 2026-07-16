import csv
import os
import random
from datetime import datetime, timedelta

# Try to import Faker; if not present, we will install it later
try:
    from faker import Faker
except ImportError:
    # Fallback to simple random generation or install instructions
    Faker = None

# Districts and centroids
DISTRICTS = {
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946, "stations": ["Indiranagar", "Koramangala", "Jayanagar", "Whitefield", "Malleshwaram"]},
    "Mysuru": {"lat": 12.2958, "lon": 76.6394, "stations": ["Devaraja", "Lashkar", "Mandi", "Nazarbad", "K R Puram"]},
    "Mangaluru": {"lat": 12.9141, "lon": 74.8560, "stations": ["Pandeshwar", "Kadri", "Urwa", "Bunder", "Kankanady"]},
    "Hubli-Dharwad": {"lat": 15.3647, "lon": 75.1240, "stations": ["Gokul Road", "Suburban", "Town Station", "Vidyagiri", "Dharwad Town"]},
    "Belagavi": {"lat": 15.8497, "lon": 74.4977, "stations": ["Khade Bazar", "Market", "Camp", "Shahapur", "Udyambag"]},
    "Kalaburagi": {"lat": 17.3297, "lon": 76.8343, "stations": ["Chowk", "Station Bazaar", "Raghavendra Nagar", "University", "M B Nagar"]},
    "Davanagere": {"lat": 14.4644, "lon": 75.9218, "stations": ["KTJ Nagar", "Gandhinagar", "Extension", "Vidyanagar", "Badashah"]},
    "Shivamogga": {"lat": 13.9299, "lon": 75.5681, "stations": ["Kote", "Doddapete", "Tunga Nagar", "Vinoba Nagar", "Jayanagar"]},
    "Ballari": {"lat": 15.1394, "lon": 76.9214, "stations": ["Brucepet", "Cowlobazaar", "Gandhinagar", "Rural", "APMC"]},
    "Bidar": {"lat": 17.9104, "lon": 77.5199, "stations": ["Town Station", "Gandhi Gunj", "New Town", "Market", "Air Force"]}
}

CRIME_TYPES = ["Burglary", "Theft", "Assault", "Robbery", "Cyber Crime", "Kidnapping", "Narcotics"]
STATUS_OPTIONS = ["Under Investigation", "Solved", "Unsolved", "Charge Sheeted"]
MO_TAGS_POOL = {
    "Burglary": ["night_entry", "broken_lock", "window_forced", "cctv_sprayed", "residential"],
    "Theft": ["shoplifting", "vehicle_theft", "pickpocketing", "unattended_bag", "daytime"],
    "Assault": ["street_brawl", "domestic_dispute", "weapon_blunt", "drunken_altercation", "public_place"],
    "Robbery": ["highway_heist", "weapon_knife", "masked_suspects", "snatching", "cash_transit"],
    "Cyber Crime": ["phishing_link", "otp_fraud", "identity_theft", "fake_profile", "crypto_scam"],
    "Kidnapping": ["ransom_demand", "minor_victim", "vehicle_used", "acquaintance_involved"],
    "Narcotics": ["possession", "peddling", "transit_seizure", "synthetic_drugs", "college_area"]
}

# Socioeconomic stats
DISTRICT_SOCIOECONOMIC = [
    {"district": "Bengaluru", "population": 8443675, "unemployment_rate": 4.2, "urbanization_index": 0.88, "literacy_rate": 88.9},
    {"district": "Mysuru", "population": 3001127, "unemployment_rate": 5.1, "urbanization_index": 0.42, "literacy_rate": 72.8},
    {"district": "Mangaluru", "population": 2089649, "unemployment_rate": 3.8, "urbanization_index": 0.51, "literacy_rate": 88.6},
    {"district": "Hubli-Dharwad", "population": 1847023, "unemployment_rate": 6.4, "urbanization_index": 0.58, "literacy_rate": 80.0},
    {"district": "Belagavi", "population": 4779661, "unemployment_rate": 5.9, "urbanization_index": 0.28, "literacy_rate": 73.5},
    {"district": "Kalaburagi", "population": 2566326, "unemployment_rate": 8.2, "urbanization_index": 0.32, "literacy_rate": 64.9},
    {"district": "Davanagere", "population": 1945497, "unemployment_rate": 5.5, "urbanization_index": 0.35, "literacy_rate": 75.7},
    {"district": "Shivamogga", "population": 1752753, "unemployment_rate": 4.8, "urbanization_index": 0.36, "literacy_rate": 80.5},
    {"district": "Ballari", "population": 2452595, "unemployment_rate": 7.1, "urbanization_index": 0.38, "literacy_rate": 67.4},
    {"district": "Bidar", "population": 1703300, "unemployment_rate": 7.8, "urbanization_index": 0.25, "literacy_rate": 70.5}
]

def generate_lat_lon(centroid_lat, centroid_lon, jitter=0.08):
    """Jitter lat/lon slightly around centroid to simulate station clustering."""
    return (
        round(centroid_lat + random.uniform(-jitter, jitter), 6),
        round(centroid_lon + random.uniform(-jitter, jitter), 6)
    )

def main():
    print("Initializing synthetic data generation...")
    fake = Faker('en_IN') if Faker else None
    if not fake:
        print("Faker not found. Names will be procedurally generated.")
    
    os.makedirs("crime-intel-platform/data-gen", exist_ok=True)
    
    incidents = []
    accused_records = []
    victims = []
    
    incident_id_counter = 1
    accused_id_counter = 1
    victim_id_counter = 1
    
    # ----------------------------------------------------
    # Pattern A: Repeat-Offender Network in Bengaluru
    # 5 accused (IDs 1-5) linked across 12 specific incidents
    # ----------------------------------------------------
    bengaluru_centroid = DISTRICTS["Bengaluru"]
    repeat_accused = []
    
    # Pre-create the 5 repeat accused
    accused_names = [
        "Ramesh Kumar", "Suresh Naik", "Anil Gowda", "Vijay Shekar", "Kiran Patil"
    ]
    for i in range(5):
        repeat_accused.append({
            "id": accused_id_counter,
            "name": accused_names[i],
            "age": random.randint(24, 42),
            "gender": "Male",
            "incidents": [],
            "risk_score": random.randint(75, 95)
        })
        accused_id_counter += 1

    # Generate 12 incidents for this repeat offender cluster in Indiranagar/Koramangala
    repeat_incidents_ids = []
    for i in range(12):
        # Coordinates very close together to form a spatial hotspot for DBSCAN
        lat, lon = generate_lat_lon(bengaluru_centroid["lat"], bengaluru_centroid["lon"], jitter=0.01)
        crime = "Robbery" if i % 2 == 0 else "Burglary"
        
        # Incident occurred between March and May 2025
        dt = datetime(2025, 3, 1) + timedelta(days=random.randint(0, 90))
        dt_str = dt.strftime("%Y-%m-%d")
        time_str = f"{random.randint(20, 23)}:{random.choice(['00', '15', '30', '45'])}:00"
        
        station = "Indiranagar" if i % 3 != 0 else "Koramangala"
        mo = random.sample(MO_TAGS_POOL[crime], 2)
        mo.append("repeat_offender_signature")
        
        incidents.append({
            "id": incident_id_counter,
            "crime_type": crime,
            "date": dt_str,
            "time": time_str,
            "lat": lat,
            "long": lon,
            "district": "Bengaluru",
            "station": station,
            "mo_tags": ",".join(mo),
            "status": "Under Investigation" if i % 4 == 0 else "Solved"
        })
        
        # Link 2 to 3 of the repeat offenders to this incident
        selected_offenders = random.sample(repeat_accused, random.randint(2, 3))
        for offender in selected_offenders:
            offender["incidents"].append(incident_id_counter)
            
        # Add victims for these incidents
        num_victims = random.randint(1, 2)
        for _ in range(num_victims):
            victims.append({
                "id": victim_id_counter,
                "age": random.randint(22, 60),
                "gender": random.choice(["Male", "Female"]),
                "incident_id": incident_id_counter
            })
            victim_id_counter += 1
            
        repeat_incidents_ids.append(incident_id_counter)
        incident_id_counter += 1

    # Keep track of generated repeat accused
    accused_records.extend(repeat_accused)

    # ----------------------------------------------------
    # Pattern B: Hubli-Dharwad Burglary Spike in Oct 2025
    # Baseline: ~12 incidents of burglary/month in Hubli-Dharwad from Jan-Dec 2025
    # Spike: Oct 2025 will have ~35 burglaries (approx 3x or 200% increase!)
    # ----------------------------------------------------
    hubli_centroid = DISTRICTS["Hubli-Dharwad"]
    
    # Generate Hubli-Dharwad incidents for 12 months
    for month in range(1, 13):
        # Determine number of burglary incidents for this month
        if month == 10:  # October Spike
            num_burg = random.randint(32, 40)
        else:            # Baseline months
            num_burg = random.randint(8, 14)
            
        # Generate the burglaries
        for _ in range(num_burg):
            lat, lon = generate_lat_lon(hubli_centroid["lat"], hubli_centroid["lon"], jitter=0.04)
            # Focus coordinates near Gokul Road or Town Station to form hotspots
            station = random.choice(hubli_centroid["stations"])
            dt = datetime(2025, month, 1) + timedelta(days=random.randint(0, 27))
            
            incidents.append({
                "id": incident_id_counter,
                "crime_type": "Burglary",
                "date": dt.strftime("%Y-%m-%d"),
                "time": f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00",
                "lat": lat,
                "long": lon,
                "district": "Hubli-Dharwad",
                "station": station,
                "mo_tags": ",".join(random.sample(MO_TAGS_POOL["Burglary"], 2)),
                "status": random.choice(STATUS_OPTIONS)
            })
            
            # Generate a random victim
            victims.append({
                "id": victim_id_counter,
                "age": random.randint(18, 70),
                "gender": random.choice(["Male", "Female"]),
                "incident_id": incident_id_counter
            })
            victim_id_counter += 1
            incident_id_counter += 1
            
        # Also generate some other random crimes in Hubli-Dharwad to keep the dataset full
        num_other = random.randint(5, 10)
        for _ in range(num_other):
            lat, lon = generate_lat_lon(hubli_centroid["lat"], hubli_centroid["lon"], jitter=0.06)
            crime = random.choice([c for c in CRIME_TYPES if c != "Burglary"])
            station = random.choice(hubli_centroid["stations"])
            dt = datetime(2025, month, 1) + timedelta(days=random.randint(0, 27))
            
            incidents.append({
                "id": incident_id_counter,
                "crime_type": crime,
                "date": dt.strftime("%Y-%m-%d"),
                "time": f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00",
                "lat": lat,
                "long": lon,
                "district": "Hubli-Dharwad",
                "station": station,
                "mo_tags": ",".join(random.sample(MO_TAGS_POOL[crime], min(len(MO_TAGS_POOL[crime]), 2))),
                "status": random.choice(STATUS_OPTIONS)
            })
            incident_id_counter += 1

    # ----------------------------------------------------
    # Generate Remaining Background Data
    # 3000 incidents total (we have created ~300 so far)
    # Generate incidents across all 10 districts for Jan-Dec 2025
    # ----------------------------------------------------
    start_date = datetime(2025, 1, 1)
    
    # Districts weights: let's give Bengaluru higher weight to mimic real distributions
    district_names = list(DISTRICTS.keys())
    weights = [0.35 if d == "Bengaluru" else 0.12 if d == "Hubli-Dharwad" else 0.07 for d in district_names]
    
    remaining_incidents_count = 3000 - len(incidents)
    
    for _ in range(remaining_incidents_count):
        dist = random.choices(district_names, weights=weights, k=1)[0]
        # Skip special manual generation for Hubli-Dharwad Burglary here
        crime = random.choice(CRIME_TYPES)
        if dist == "Hubli-Dharwad" and crime == "Burglary":
            # Select another crime type so we don't skew the spike/baseline math
            crime = random.choice([c for c in CRIME_TYPES if c != "Burglary"])
            
        centroid = DISTRICTS[dist]
        lat, lon = generate_lat_lon(centroid["lat"], centroid["lon"], jitter=0.08)
        station = random.choice(centroid["stations"])
        
        # Pick random date in 2025
        dt = start_date + timedelta(days=random.randint(0, 364))
        dt_str = dt.strftime("%Y-%m-%d")
        time_str = f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00"
        
        mo = random.sample(MO_TAGS_POOL[crime], min(len(MO_TAGS_POOL[crime]), 2))
        
        incidents.append({
            "id": incident_id_counter,
            "crime_type": crime,
            "date": dt_str,
            "time": time_str,
            "lat": lat,
            "long": lon,
            "district": dist,
            "station": station,
            "mo_tags": ",".join(mo),
            "status": random.choice(STATUS_OPTIONS)
        })
        
        # Randomly add a victim
        victims.append({
            "id": victim_id_counter,
            "age": random.randint(10, 80),
            "gender": random.choice(["Male", "Female", "Other"]),
            "incident_id": incident_id_counter
        })
        victim_id_counter += 1
        
        incident_id_counter += 1

    # ----------------------------------------------------
    # Generate Remaining Accused Records
    # Total of 800 accused records. We have 5 repeat offenders already.
    # ----------------------------------------------------
    remaining_accused_count = 800 - len(accused_records)
    
    first_names_male = ["Aarav", "Arjun", "Aditya", "Rahul", "Preetham", "Girish", "Manjunath", "Srinivas", "Vikram", "Chethan"]
    first_names_female = ["Ananya", "Divya", "Priya", "Kavya", "Deepa", "Shalini", "Sneha", "Lakshmi", "Meghana", "Sahana"]
    last_names = ["Gowda", "Patil", "Kumar", "Shetty", "Naik", "Reddy", "Bhat", "Rao", "Joshi", "Hegde"]
    
    for _ in range(remaining_accused_count):
        gender = random.choices(["Male", "Female"], weights=[0.85, 0.15], k=1)[0]
        if fake:
            name = fake.name_male() if gender == "Male" else fake.name_female()
        else:
            first = random.choice(first_names_male) if gender == "Male" else random.choice(first_names_female)
            last = random.choice(last_names)
            name = f"{first} {last}"
            
        age = random.randint(18, 65)
        
        # Most accused have only 1 incident. Some might have 2 or 3.
        num_links = random.choices([1, 2, 3], weights=[0.85, 0.12, 0.03], k=1)[0]
        linked_incidents = []
        
        # Select random incidents (excluding the 12 specific repeat offender ones to keep the cluster clean)
        # Choose incidents in the same general region if multiple, but simple random is fine for background
        available_incidents = [inc["id"] for inc in incidents if inc["id"] > 12]
        if available_incidents:
            linked_incidents = random.sample(available_incidents, min(len(available_incidents), num_links))
            
        accused_records.append({
            "id": accused_id_counter,
            "name": name,
            "age": age,
            "gender": gender,
            "incidents": linked_incidents,
            "risk_score": random.randint(10, 70) # Lower risk score than repeat-offender cluster
        })
        accused_id_counter += 1

    # ----------------------------------------------------
    # Write to CSV files
    # ----------------------------------------------------
    print(f"Writing {len(incidents)} incidents to CSV...")
    with open("crime-intel-platform/data-gen/incidents.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "crime_type", "date", "time", "lat", "long", "district", "station", "mo_tags", "status"])
        writer.writeheader()
        writer.writerows(incidents)
        
    print(f"Writing {len(accused_records)} accused to CSV...")
    with open("crime-intel-platform/data-gen/accused.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["id", "name", "age", "gender", "past_incident_ids", "risk_score"])
        for acc in accused_records:
            writer.writerow([
                acc["id"],
                acc["name"],
                acc["age"],
                acc["gender"],
                ",".join(map(str, acc["incidents"])),
                acc["risk_score"]
            ])
            
    print(f"Writing {len(victims)} victims to CSV...")
    with open("crime-intel-platform/data-gen/victims.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "age", "gender", "incident_id"])
        writer.writeheader()
        writer.writerows(victims)
        
    print("Writing district socioeconomic data to CSV...")
    with open("crime-intel-platform/data-gen/district_socioeconomic.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["district", "population", "unemployment_rate", "urbanization_index", "literacy_rate"])
        writer.writeheader()
        writer.writerows(DISTRICT_SOCIOECONOMIC)
        
    print("Data generation completed successfully!")

if __name__ == "__main__":
    main()
