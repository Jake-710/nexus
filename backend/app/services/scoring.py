def compute_blended_score(ml_score: float, rule_score: float, ml_weight: float = 0.7, rule_weight: float = 0.3) -> float:
    score = (ml_weight * ml_score) + (rule_weight * rule_score)
    return max(0.0, min(1.0, score))
