import networkx as nx
from sqlalchemy.orm import Session
from ..models import Accused, CaseMaster, Victim

def build_network_graph(accused_id: int, db: Session):
    # Create NetworkX Graph
    G = nx.Graph()

    # Get target accused link
    target_link = db.query(Accused).filter(Accused.AccusedMasterID == accused_id).first()
    if not target_link:
        return {"nodes": [], "edges": []}

    # Get all case links for this physical person
    all_links = db.query(Accused).filter(Accused.PersonID == target_link.PersonID).all()
    target_case_ids = [l.CaseMasterID for l in all_links]

    if not target_case_ids:
        # Just return target
        return {
            "nodes": [{
                "data": {
                    "id": f"accused_{target_link.PersonID}",
                    "label": target_link.AccusedName,
                    "type": "accused",
                    "centrality": 1.0,
                    "risk_score": target_link.risk_score
                }
            }],
            "edges": []
        }

    # Query all cases linked
    cases = db.query(CaseMaster).filter(CaseMaster.CaseMasterID.in_(target_case_ids)).all()
    cases_map = {c.CaseMasterID: c for c in cases}

    # Query all co-accused links for these cases
    co_links = db.query(Accused).filter(Accused.CaseMasterID.in_(target_case_ids)).all()
    
    # Map PersonID -> Accused object (first link found) to represent the node
    offenders = {}
    for link in co_links:
        if link.PersonID not in offenders:
            offenders[link.PersonID] = link

    # Add nodes and edges
    # 1. Add Accused nodes
    for link in co_links:
        node_id = f"accused_{link.PersonID}"
        rep = offenders[link.PersonID]
        G.add_node(
            node_id, 
            label=rep.AccusedName, 
            type="accused", 
            risk_score=rep.risk_score, 
            age=rep.AgeYear, 
            gender="Male" if rep.GenderID == 1 else "Female"
        )
        
        # Link accused to this case
        case_node_id = f"incident_{link.CaseMasterID}"
        if link.CaseMasterID in cases_map:
            case_obj = cases_map[link.CaseMasterID]
            crime_name = case_obj.minor_head_rel.CrimeHeadName if case_obj.minor_head_rel else "Crime"
            G.add_node(
                case_node_id, 
                label=f"{crime_name} ({case_obj.CrimeRegisteredDate})", 
                type="incident", 
                crime_type=crime_name
            )
            G.add_edge(node_id, case_node_id)

    # 2. Add Victims and Locations (Stations) linked to these cases
    for case_obj in cases:
        case_node_id = f"incident_{case_obj.CaseMasterID}"
        
        # Add Location node
        station_name = case_obj.unit.UnitName if case_obj.unit else f"Station #{case_obj.PoliceStationID}"
        loc_node_id = f"location_{station_name}"
        G.add_node(loc_node_id, label=f"Station: {station_name}", type="location")
        G.add_edge(case_node_id, loc_node_id)
        
        # Add Victim nodes
        for vic in case_obj.victims:
            vic_node_id = f"victim_{vic.VictimMasterID}"
            vic_gender = "Male" if vic.GenderID == 1 else "Female"
            G.add_node(
                vic_node_id, 
                label=f"Victim ({vic_gender}, {vic.AgeYear})", 
                type="victim", 
                age=vic.AgeYear, 
                gender=vic_gender
            )
            G.add_edge(vic_node_id, case_node_id)

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
        deg_c = round(float(degree_centrality.get(node_id, 0.0)), 3)
        bet_c = round(float(betweenness_centrality.get(node_id, 0.0)), 3)
        centrality_score = max(deg_c, bet_c)

        node_data = {
            "id": node_id,
            "label": attrs.get("label", ""),
            "type": attrs.get("type", "unknown"),
            "degree_centrality": deg_c,
            "betweenness_centrality": bet_c,
            "centrality": centrality_score
        }
        
        if attrs.get("type") == "accused":
            node_data["risk_score"] = attrs.get("risk_score", 0)
            node_data["age"] = attrs.get("age")
            node_data["gender"] = attrs.get("gender")
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
