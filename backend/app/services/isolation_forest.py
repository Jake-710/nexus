import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class AnomalyDetector:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "models")
        os.makedirs(self.models_dir, exist_ok=True)
        self.load_models()
        
    def load_models(self):
        try:
            for file in os.listdir(self.models_dir):
                if file.endswith("_model.joblib"):
                    peer_group_id = int(file.split("_")[0])
                    self.models[peer_group_id] = joblib.load(os.path.join(self.models_dir, file))
                elif file.endswith("_scaler.joblib"):
                    peer_group_id = int(file.split("_")[0])
                    self.scalers[peer_group_id] = joblib.load(os.path.join(self.models_dir, file))
        except Exception as e:
            print(f"Error loading models: {e}")

    def train(self, peer_group_id, feature_matrix):
        if not feature_matrix or len(feature_matrix) == 0:
            return
            
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(feature_matrix)
        
        model = IsolationForest(contamination=0.1, n_estimators=100, random_state=42)
        model.fit(X_scaled)
        
        self.models[peer_group_id] = model
        self.scalers[peer_group_id] = scaler
        
        joblib.dump(model, os.path.join(self.models_dir, f"{peer_group_id}_model.joblib"))
        joblib.dump(scaler, os.path.join(self.models_dir, f"{peer_group_id}_scaler.joblib"))

    def predict(self, peer_group_id, feature_vector) -> float:
        if peer_group_id not in self.models or peer_group_id not in self.scalers:
            return 0.5  # Default score if no model exists
            
        scaler = self.scalers[peer_group_id]
        model = self.models[peer_group_id]
        
        # Reshape for single sample
        X = np.array(feature_vector).reshape(1, -1)
        X_scaled = scaler.transform(X)
        
        # decision_function returns negative values for anomalies, positive for normal
        # lower values are more anomalous
        score = model.decision_function(X_scaled)[0]
        
        # Normalize to 0-1 range (higher = more anomalous)
        # Assuming decision_function typically ranges from -0.5 to 0.5 roughly
        # We can map it using sigmoid or min-max.
        # Let's map negative scores to high anomaly (towards 1)
        normalized_score = 1.0 / (1.0 + np.exp(score * 5))  
        
        return float(normalized_score)

anomaly_detector = AnomalyDetector()
