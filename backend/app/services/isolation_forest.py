import os
import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

class AnomalyDetector:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.training_data = {}  # Collect training data per peer group
        self.min_training_samples = 50
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

    def add_training_sample(self, peer_group_id: int, feature_vector: list):
        """Collect training samples. Auto-train when enough samples collected."""
        if peer_group_id not in self.training_data:
            self.training_data[peer_group_id] = []
        self.training_data[peer_group_id].append(feature_vector)
        
        if len(self.training_data[peer_group_id]) >= self.min_training_samples:
            self.train(peer_group_id, self.training_data[peer_group_id])
            self.training_data[peer_group_id] = []  # Reset after training

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
        print(f"Trained Isolation Forest for peer group {peer_group_id}")

    def predict(self, peer_group_id, feature_vector) -> float:
        if peer_group_id not in self.models or peer_group_id not in self.scalers:
            # Heuristic scoring when no trained model exists
            return self._heuristic_score(feature_vector)
            
        scaler = self.scalers[peer_group_id]
        model = self.models[peer_group_id]
        
        X = np.array(feature_vector).reshape(1, -1)
        X_scaled = scaler.transform(X)
        
        score = model.decision_function(X_scaled)[0]
        
        # Normalize to 0-1 range (higher = more anomalous)
        normalized_score = 1.0 / (1.0 + np.exp(score * 5))  
        
        return float(normalized_score)
    
    def _heuristic_score(self, feature_vector) -> float:
        """Rule-based heuristic scoring when no ML model is available yet.
        Feature vector: [login_hour, failed_login_attempts, files_accessed, 
                        data_volume_mb, distinct_ips, off_hours_flag, first_time_resource]
        """
        score = 0.0
        login_hour = feature_vector[0]
        failed_logins = feature_vector[1]
        files_accessed = feature_vector[2]
        data_volume_mb = feature_vector[3]
        distinct_ips = feature_vector[4]
        off_hours = feature_vector[5]
        first_time_resource = feature_vector[6]
        
        # Off-hours access (late night / early morning)
        if off_hours == 1:
            score += 0.35
        
        # Failed login attempts
        if failed_logins > 3:
            score += min(0.3, failed_logins * 0.05)
        
        # Large data volume
        if data_volume_mb > 50:
            score += min(0.25, (data_volume_mb - 50) / 200.0)
        elif data_volume_mb > 20:
            score += 0.1
        
        # Many files accessed
        if files_accessed > 30:
            score += min(0.2, (files_accessed - 30) / 100.0)
        
        # Multiple IPs
        if distinct_ips > 3:
            score += min(0.15, (distinct_ips - 3) * 0.05)
        
        # First time resource
        if first_time_resource == 1:
            score += 0.1
        
        return min(1.0, max(0.0, score))

anomaly_detector = AnomalyDetector()
