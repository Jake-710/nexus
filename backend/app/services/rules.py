def evaluate_rules(features: dict, event: dict) -> tuple[float, list[str]]:
    score = 0.0
    triggered_rules = []
    
    if features.get('off_hours_flag', 0) == 1:
        score += 0.3
        triggered_rules.append('Off-hours access detected')
        
    data_vol = features.get('data_volume_mb', 0)
    if data_vol > 100:
        score += 0.25
        triggered_rules.append(f'Large data transfer (>{data_vol:.2f}MB)')
        
    files_acc = features.get('files_accessed', 0)
    if files_acc > 50:
        score += 0.2
        triggered_rules.append(f'Excessive file access ({files_acc} files)')
        
    failed_logins = features.get('failed_login_attempts', 0)
    if failed_logins > 5:
        score += 0.3
        triggered_rules.append(f'Failed login spike ({failed_logins} attempts)')
        
    distinct_ips = features.get('distinct_ips', 0)
    if distinct_ips > 3:
        score += 0.15
        triggered_rules.append(f'Multiple IP addresses ({distinct_ips} IPs)')
        
    if features.get('first_time_resource', 0) == 1:
        score += 0.1
        triggered_rules.append('First-time resource access')
        
    final_score = min(score, 1.0)
    
    return final_score, triggered_rules
