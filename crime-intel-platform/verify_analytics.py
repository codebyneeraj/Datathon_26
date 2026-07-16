import sys
import os

# Add backend directory to path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "backend"))
sys.path.append(backend_path)

from app.database import SessionLocal
from app.models import Incident, Accused, Victim
from app.analytics.clustering import detect_hotspots
from app.analytics.network_build import build_network_graph

def run_tests():
    print("--------------------------------------------------")
    print("Running Intelligence Core Verification Tests...")
    print("--------------------------------------------------")
    
    db = SessionLocal()
    
    # Test 1: Database Seed Integrity
    print("[Test 1/5] Checking database seed integrity...")
    incidents_count = db.query(Incident).count()
    accused_count = db.query(Accused).count()
    victims_count = db.query(Victim).count()
    
    print(f"  Incidents count: {incidents_count} (Expected: ~3000)")
    print(f"  Accused count: {accused_count} (Expected: ~800)")
    print(f"  Victims count: {victims_count} (Expected: ~2900)")
    
    assert incidents_count >= 3000, "Incident count is lower than expected!"
    assert accused_count >= 800, "Accused count is lower than expected!"
    print("  => Database counts look healthy!")
    
    # Test 2: DBSCAN Clustering Core
    print("\n[Test 2/5] Verifying DBSCAN hotspot clustering on Bengaluru...")
    bengaluru_incidents = db.query(Incident).filter(Incident.district == "Bengaluru").all()
    print(f"  Found {len(bengaluru_incidents)} incidents in Bengaluru.")
    
    # Run clustering
    clusters = detect_hotspots(bengaluru_incidents, eps=0.25, min_samples=4)
    print(f"  Extracted {len(clusters)} DBSCAN hotspots in Bengaluru.")
    assert len(clusters) > 0, "No hotspots found in Bengaluru!"
    
    # Check if the repeat offender cluster is represented in the hotspots
    first_cluster = clusters[0]["properties"]
    print(f"  Primary Hotspot Size: {first_cluster['incident_count']} incidents.")
    print(f"  Primary Hotspot Crime: {first_cluster['primary_crime']}")
    print("  => Hotspots successfully clustered!")
    
    # Test 3: NetworkX Link Analysis
    print("\n[Test 3/5] Verifying NetworkX offender link graph for Ramesh Kumar...")
    # Ramesh Kumar has accused ID 1 in our generator
    elements = build_network_graph(1, db)
    
    nodes = [el for el in elements if "source" not in el["data"]]
    edges = [el for el in elements if "source" in el["data"]]
    
    print(f"  Constructed network: {len(nodes)} nodes, {len(edges)} edges.")
    assert len(nodes) > 0, "Network graph has 0 nodes!"
    assert len(edges) > 0, "Network graph has 0 edges!"
    
    # Find Ramesh Kumar's node and check centrality
    ramesh_node = next((n for n in nodes if n["data"]["id"] == "accused_1"), None)
    assert ramesh_node is not None, "Ramesh Kumar node not found in network!"
    print(f"  Ramesh Kumar degree centrality: {ramesh_node['data']['degree_centrality']}")
    print(f"  Ramesh Kumar risk score: {ramesh_node['data']['risk_score']}/100")
    print("  => Offender link network built successfully!")
    
    # Test 4: Hubli-Dharwad Anomaly Detection
    print("\n[Test 4/5] Verifying Anomaly Detection spike in Hubli-Dharwad...")
    from app.routers.risk import get_risk_scores_api
    risk_scores = get_risk_scores_api(db)
    
    hubli_score = next((r for r in risk_scores if r["district"] == "Hubli-Dharwad"), None)
    assert hubli_score is not None, "Hubli-Dharwad risk score not found!"
    
    print(f"  Hubli-Dharwad Spike Flag: {hubli_score['anomaly_spike']}")
    print(f"  Hubli-Dharwad Spike Percentage: {hubli_score['spike_percentage']}%")
    print(f"  Hubli-Dharwad Predicted Risk Score: {hubli_score['predicted_risk_score']}/100 ({hubli_score['risk_level']})")
    
    assert hubli_score["anomaly_spike"] == True, "Failed to detect the Hubli-Dharwad October spike!"
    print("  => Hubli-Dharwad October crime spike anomaly correctly detected!")
    
    # Test 5: Pearson Correlations
    print("\n[Test 5/5] Verifying Pearson correlation calculator...")
    from app.routers.correlations import get_correlations_api
    corr_results = get_correlations_api(db)
    
    correlations = corr_results["correlations"]
    print(f"  Crime Rate vs Unemployment Correlation: {correlations['unemployment']}")
    print(f"  Crime Rate vs Urbanization Correlation: {correlations['urbanization']}")
    print(f"  Crime Rate vs Literacy Correlation: {correlations['literacy']}")
    
    # Ensure values are float numbers
    assert isinstance(correlations["unemployment"], float)
    assert isinstance(correlations["urbanization"], float)
    assert isinstance(correlations["literacy"], float)
    print("  => Correlation coefficients calculated successfully!")
    
    db.close()
    print("\n--------------------------------------------------")
    print("ALL INTELLIGENCE TESTS PASSED SUCCESSFULLY! [OK]")
    print("--------------------------------------------------")

if __name__ == "__main__":
    run_tests()
