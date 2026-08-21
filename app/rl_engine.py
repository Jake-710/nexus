import torch
import torch.nn as nn
import numpy as np

class PPOPolicy(nn.Module):
    def __init__(self, input_dim=6, num_actions=5):
        super().__init__()
        self.actor = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, num_actions),
            nn.Softmax(dim=-1)
        )
        self.critic = nn.Sequential(
            nn.Linear(input_dim, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1)
        )

    def forward(self, x):
        return self.actor(x), self.critic(x)

class AnomalyScorer:
    def __init__(self):
        self.model = PPOPolicy()
        self.model.eval()

    def score(self, feature_vector: np.ndarray) -> tuple[float, str]:
        tensor_in = torch.tensor(feature_vector, dtype=torch.float32).unsqueeze(0)
        
        with torch.no_grad():
            action_probs, _ = self.model(tensor_in)
            probs = action_probs.squeeze(0).numpy()

        p_high_crit = probs[3] + probs[4]
        stat_dev = float(np.tanh(np.linalg.norm(feature_vector)))
        
        final_score = float(0.7 * p_high_crit + 0.3 * stat_dev)
        
        if final_score >= 0.75:
            severity = "CRITICAL"
        elif final_score >= 0.55:
            severity = "HIGH"
        elif final_score >= 0.35:
            severity = "MEDIUM"
        elif final_score >= 0.15:
            severity = "LOW"
        else:
            severity = "NORMAL"

        return round(final_score, 4), severity