import networkx as nx
from sqlalchemy.orm import Session
from ..models import Accused, Incident, Victim

def build_network_graph(accused_id: int, db: Session):
    # Create NetworkX Graph
    G = nx.Graph()

    # Get target accused
    target_accused = db.query(Accused).filter(Accused.id == accused_id).first()
    if not target_accused:
        return {"nodes": [], "edges": []}

    # Helper function to get incidents linked to an accused
    def parse_incident_ids(past_ids_str):
        if not past_ids_str:
            return []
        try:
            return [int(x.strip()) for x in past_ids_str.split(",") if x.strip()]
        except ValueError:
            return []

    target_inc_ids = parse_incident_ids(target_accused.past_incident_ids)
    if not target_inc_ids:
        # If no incidents, just return the single node
        return {
            "nodes": [{
                "data": {
                    "id": f"accused_{target_accused.id}",
                    "label": target_accused.name,
                    "type": "accused",
                    "centrality": 1.0,
                    "risk_score": target_accused.risk_score
                }
            }],
            "edges": []
        }

    # Query all incidents linked to the target accused
    incidents = db.query(Incident).filter(Incident.id.in_(target_inc_ids)).all()
    incidents_map = {inc.id: inc for inc in incidents}

    # Query all accused in the database to find co-accused
    all_accused = db.query(Accused).all()
    co_accused_list = []
    
    # We want to find any accused that shares at least one incident with our target accused
    for acc in all_accused:
        acc_inc_ids = parse_incident_ids(acc.past_incident_ids)
        shared = set(target_inc_ids).intersection(set(acc_inc_ids))
        if shared:
            co_accused_list.append((acc, acc_inc_ids))

    # Build nodes and edges
    # 1. Add Accused nodes
    for acc, acc_inc_ids in co_accused_list:
        node_id = f"accused_{acc.id}"
        G.add_node(node_id, label=acc.name, type="accused", risk_score=acc.risk_score)
        
        # Link accused to their incidents
        for inc_id in acc_inc_ids:
            if inc_id in incidents_map:
                G.add_node(f"incident_{inc_id}", label=f"{incidents_map[inc_id].crime_type} ({incidents_map[inc_id].date})", type="incident", crime_type=incidents_map[inc_id].crime_type)
                G.add_edge(node_id, f"incident_{inc_id}")

    # 2. Add Victims and Locations (Stations) linked to these incidents
    for inc in incidents:
        inc_node_id = f"incident_{inc.id}"
        
        # Add Location node
        loc_node_id = f"location_{inc.station}"
        G.add_node(loc_node_id, label=f"Station: {inc.station}", type="location")
        G.add_edge(inc_node_id, loc_node_id)
        
        # Add Victim nodes
        for vic in inc.victims:
            vic_node_id = f"victim_{vic.id}"
            G.add_node(vic_node_id, label=f"Victim ({vic.gender}, {vic.age})", type="victim", age=vic.age, gender=vic.gender)
            G.add_edge(vic_node_id, inc_node_id)

    # Compute Centralities
    if len(G.nodes) > 0:
        degree_centrality = nx.degree_centrality(G)
        try:
            betweenness_centrality = nx.betweenness_centrality(G)
        except Exception:
            betweenness_centrality = {node: 0.0 for node in G.nodes}
    else:
        degree_centrality = {}
        betweenness_centrality = {}

    # Format into Cytoscape JSON
    cytoscape_elements = []

    for node_id, attrs in G.nodes(data=True):
        # Merge centrality attributes
        deg_c = round(float(degree_centrality.get(node_id, 0.0)), 3)
        bet_c = round(float(betweenness_centrality.get(node_id, 0.0)), 3)
        
        # Combined centrality score
        centrality_score = max(deg_c, bet_c)

        node_data = {
            "id": node_id,
            "label": attrs.get("label", ""),
            "type": attrs.get("type", "unknown"),
            "degree_centrality": deg_c,
            "betweenness_centrality": bet_c,
            "centrality": centrality_score
        }
        
        # Add type-specific attributes
        if attrs.get("type") == "accused":
            node_data["risk_score"] = attrs.get("risk_score", 0)
        elif attrs.get("type") == "victim":
            node_data["age"] = attrs.get("age")
            node_data["gender"] = attrs.get("gender")
        elif attrs.get("type") == "incident":
            node_data["crime_type"] = attrs.get("crime_type")

        cytoscape_elements.append({"data": node_data})

    for source, target in G.edges():
        edge_id = f"edge_{source}_{target}"
        cytoscape_elements.append({
            "data": {
                "id": edge_id,
                "source": source,
                "target": target
            }
        })

    return cytoscape_elements
