import numpy as np
import pandas as pd
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler

def detect_hotspots(incidents, eps=0.3, min_samples=4):
    """
    Perform DBSCAN clustering on incident lat/long coordinates.
    Standardizes the coordinates first as requested.
    Returns a list of cluster details.
    """
    if len(incidents) < min_samples:
        return []

    # Convert incidents to DataFrame
    df = pd.DataFrame([{
        "id": inc.id,
        "lat": inc.lat,
        "long": inc.long,
        "crime_type": inc.crime_type
    } for inc in incidents])

    coords = df[["lat", "long"]].values

    # Standardize features
    scaler = StandardScaler()
    coords_scaled = scaler.fit_transform(coords)

    # Run DBSCAN
    db = DBSCAN(eps=eps, min_samples=min_samples).fit(coords_scaled)
    labels = db.labels_

    df["cluster"] = labels

    clusters_geojson = []
    
    # Process each cluster (excluding noise label -1)
    unique_labels = set(labels) - {-1}
    
    for cluster_id in unique_labels:
        cluster_data = df[df["cluster"] == cluster_id]
        
        # Calculate cluster centroid
        centroid_lat = float(cluster_data["lat"].mean())
        centroid_lon = float(cluster_data["long"].mean())
        
        # Get count and dominant crime types
        incident_count = len(cluster_data)
        crime_counts = cluster_data["crime_type"].value_counts().to_dict()
        
        # Return coordinates and metadata for Leaflet
        clusters_geojson.append({
            "type": "Feature",
            "properties": {
                "cluster_id": int(cluster_id),
                "incident_count": incident_count,
                "crime_types": crime_counts,
                "primary_crime": max(crime_counts, key=crime_counts.get),
                "radius": float(np.max(np.linalg.norm(cluster_data[["lat", "long"]].values - [centroid_lat, centroid_lon], axis=1)) * 111000) # radius in meters (roughly)
            },
            "geometry": {
                "type": "Point",
                "coordinates": [centroid_lon, centroid_lat]
            }
        })
        
    return clusters_geojson
