import networkx as nx
import time

class CrossEntityGraph:
    def __init__(self):
        self.graph = nx.Graph()

    def update_edge(self, user1: str, user2: str, weight_inc: float = 0.5):
        if self.graph.has_edge(user1, user2):
            self.graph[user1][user2]['weight'] += weight_inc
        else:
            self.graph.add_edge(user1, user2, weight=weight_inc, timestamp=time.time())

    def get_subgraph_risk(self, user_id: str) -> float:
        if not self.graph.has_node(user_id):
            return 0.0
        neighbors = list(self.graph.neighbors(user_id))
        if not neighbors:
            return 0.0
        edge_weights = [self.graph[user_id][nbr]['weight'] for nbr in neighbors]
        return min(sum(edge_weights) / 10.0, 0.15)