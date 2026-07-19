import math
from collections import defaultdict

def detect_hotspots(incidents, eps=0.3, min_samples=4):
    """
    Perform pure-Python DBSCAN clustering on incident lat/long coordinates.
    Returns a list of cluster details for Leaflet map rendering.
    """
    if len(incidents) < min_samples:
        return []

    points = []
    for inc in incidents:
        c_head = inc.minor_head_rel.CrimeHeadName if (hasattr(inc, 'minor_head_rel') and inc.minor_head_rel) else 'Unknown'
        points.append({
            'id': getattr(inc, 'CaseMasterID', 0),
            'lat': float(inc.latitude),
            'long': float(inc.longitude),
            'crime_type': c_head
        })

    if not points:
        return []

    lats = [p['lat'] for p in points]
    lons = [p['long'] for p in points]
    mean_lat = sum(lats) / len(lats)
    mean_lon = sum(lons) / len(lons)
    
    var_lat = sum((x - mean_lat) ** 2 for x in lats) / len(lats)
    var_lon = sum((x - mean_lon) ** 2 for x in lons) / len(lons)
    
    std_lat = math.sqrt(var_lat) if var_lat > 0 else 1.0
    std_lon = math.sqrt(var_lon) if var_lon > 0 else 1.0

    def dist(p1, p2):
        dx = (p1['lat'] - p2['lat']) / std_lat
        dy = (p1['long'] - p2['long']) / std_lon
        return math.sqrt(dx*dx + dy*dy)

    n = len(points)
    labels = [-1] * n
    cluster_id = 0

    for i in range(n):
        if labels[i] != -1:
            continue
        neighbors = [j for j in range(n) if dist(points[i], points[j]) <= eps]
        if len(neighbors) < min_samples:
            labels[i] = -1
        else:
            cluster_id += 1
            labels[i] = cluster_id
            seeds = set(neighbors) - {i}
            while seeds:
                curr = seeds.pop()
                if labels[curr] == -1:
                    labels[curr] = cluster_id
                if labels[curr] != -1 and labels[curr] != cluster_id:
                    continue
                labels[curr] = cluster_id
                curr_neighbors = [j for j in range(n) if dist(points[curr], points[j]) <= eps]
                if len(curr_neighbors) >= min_samples:
                    seeds.update([j for j in curr_neighbors if labels[j] <= 0])

    clusters_dict = defaultdict(list)
    for idx, cid in enumerate(labels):
        if cid > 0:
            clusters_dict[cid].append(points[idx])

    clusters_geojson = []
    for cid, pts in clusters_dict.items():
        c_lats = [p['lat'] for p in pts]
        c_lons = [p['long'] for p in pts]
        cent_lat = sum(c_lats) / len(pts)
        cent_lon = sum(c_lons) / len(pts)

        crime_counts = defaultdict(int)
        for p in pts:
            crime_counts[p['crime_type']] += 1

        max_dist = max(math.sqrt((p['lat'] - cent_lat)**2 + (p['long'] - cent_lon)**2) for p in pts) if pts else 0.01

        clusters_geojson.append({
            "type": "Feature",
            "properties": {
                "cluster_id": cid,
                "incident_count": len(pts),
                "crime_types": dict(crime_counts),
                "primary_crime": max(crime_counts, key=crime_counts.get),
                "radius": float(max_dist * 111000)
            },
            "geometry": {
                "type": "Point",
                "coordinates": [cent_lon, cent_lat]
            }
        })

    return clusters_geojson
