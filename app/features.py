import numpy as np
import math
from collections import Counter
from typing import List, Dict, Any

class FeatureExtractor:
    @staticmethod
    def extract(history: List[Dict[str, Any]]) -> np.ndarray:
        if not history:
            return np.zeros(6, dtype=np.float32)

        now = history[-1]["timestamp"]
        
        # 1. Event Frequency
        recent_events = [e for e in history if now - e["timestamp"] <= 60]
        freq = len(recent_events) / 10.0

        # 2. Inter-arrival Delta
        if len(history) > 1:
            delta_t = (history[-1]["timestamp"] - history[-2]["timestamp"]) * 1000
            delta_feature = math.exp(-delta_t / 1000.0)
        else:
            delta_feature = 0.0

        # 3. Type Entropy
        types = [e["event_type"] for e in history]
        counts = Counter(types)
        total = len(types)
        entropy = -sum((c / total) * math.log2(c / total) for c in counts.values())

        # 4. Payload Velocity
        payload_sizes = [len(str(e.get("payload", {}))) for e in history]
        velocity = float(np.std(payload_sizes) / 100.0) if len(payload_sizes) > 1 else 0.0

        # 5. Novelty Score
        novelty = 1.0 / counts[history[-1]["event_type"]]

        # 6. Session Depth
        depth = min(history[-1].get("payload", {}).get("privilege_level", 1) / 5.0, 1.0)

        return np.array([freq, delta_feature, entropy, velocity, novelty, depth], dtype=np.float32)