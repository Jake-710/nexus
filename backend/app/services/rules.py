SUSPICIOUS_IPS = {'185.220.101.42', '91.121.87.18', '103.75.201.4', '45.33.32.156'}
SUSPICIOUS_GEOS = {'Moscow, Russia', 'Lagos, Nigeria', 'Pyongyang, North Korea', 'Unknown VPN'}
SENSITIVE_RESOURCES = {
    'payroll-db', 'employee-records', 'banking-gateway', 'active-directory',
    'firewall-config', 'certificate-store', 'security-logs', 'cloud-admin-console',
    'prod-db-readonly', 'client-contracts', 'tax-filing-system', 'vpn-manager',
    'hris-system', 'audit-logs', 'patch-management', 'backup-console'
}

def evaluate_rules(features: dict, event: dict) -> tuple[float, list[str]]:
    score = 0.0
    triggered_rules = []
    
    # 1. Off-hours access
    if features.get('off_hours_flag', 0) == 1:
        score += 0.25
        triggered_rules.append('Off-hours access detected')
    
    # 2. Weekend access
    if features.get('is_weekend', 0) == 1:
        score += 0.2
        triggered_rules.append('Weekend access detected')
    
    # 3. Large data transfer
    data_vol = features.get('data_volume_mb', 0)
    if data_vol > 100:
        score += 0.25
        triggered_rules.append(f'Large data transfer ({data_vol:.1f} MB)')
    elif data_vol > 50:
        score += 0.15
        triggered_rules.append(f'Elevated data transfer ({data_vol:.1f} MB)')
    
    # 4. Excessive file access
    files_acc = features.get('files_accessed', 0)
    if files_acc > 50:
        score += 0.2
        triggered_rules.append(f'Excessive file access ({files_acc} files)')
    elif files_acc > 25:
        score += 0.1
        triggered_rules.append(f'High file access volume ({files_acc} files)')
    
    # 5. Failed login spike
    failed_logins = features.get('failed_login_attempts', 0)
    if failed_logins > 5:
        score += 0.3
        triggered_rules.append(f'Failed login spike ({failed_logins} attempts)')
    elif failed_logins > 2:
        score += 0.15
        triggered_rules.append(f'Multiple failed logins ({failed_logins} attempts)')
    
    # 6. Multiple IP addresses (credential sharing indicator)
    distinct_ips = features.get('distinct_ips', 0)
    if distinct_ips > 5:
        score += 0.25
        triggered_rules.append(f'Credential sharing suspected ({distinct_ips} IPs)')
    elif distinct_ips > 3:
        score += 0.15
        triggered_rules.append(f'Multiple IP addresses ({distinct_ips} IPs)')
    
    # 7. First-time resource access
    if features.get('first_time_resource', 0) == 1:
        score += 0.1
        triggered_rules.append('First-time resource access')
    
    # 8. Suspicious source IP
    src_ip = event.get('src_ip', '')
    if src_ip in SUSPICIOUS_IPS:
        score += 0.35
        triggered_rules.append(f'Suspicious source IP ({src_ip})')
    
    # 9. Geo-location anomaly
    geo = event.get('geo_location', '')
    if geo in SUSPICIOUS_GEOS:
        score += 0.3
        triggered_rules.append(f'Geo-location anomaly ({geo})')
    
    # 10. Cross-department resource access
    if features.get('is_cross_department', 0) == 1:
        score += 0.2
        triggered_rules.append('Cross-department resource access')
    
    # 11. Sensitive resource access
    resource_id = event.get('resource_id', '')
    if resource_id in SENSITIVE_RESOURCES:
        score += 0.15
        triggered_rules.append(f'Sensitive resource accessed ({resource_id})')
    
    # 12. Rapid successive actions
    rapid_actions = features.get('rapid_actions_count', 0)
    if rapid_actions > 10:
        score += 0.25
        triggered_rules.append(f'Rapid successive actions ({rapid_actions} in 5 min)')
    elif rapid_actions > 5:
        score += 0.1
        triggered_rules.append(f'Elevated activity rate ({rapid_actions} in 5 min)')
    
    # 13. After-hours bulk download (combo rule)
    action_type = event.get('action_type', '')
    if features.get('off_hours_flag', 0) == 1 and action_type == 'file_download' and data_vol > 30:
        score += 0.2
        triggered_rules.append('After-hours bulk download')
    
    # 14. VPN from suspicious location
    if src_ip and src_ip.startswith('172.16.') and geo in SUSPICIOUS_GEOS:
        score += 0.25
        triggered_rules.append('VPN access from suspicious location')
    
    # 15. Privilege escalation pattern (accessing admin resources as non-admin)
    admin_resources = {'active-directory', 'firewall-config', 'cloud-admin-console', 'certificate-store', 'patch-management'}
    if resource_id in admin_resources and features.get('is_cross_department', 0) == 1:
        score += 0.3
        triggered_rules.append('Potential privilege escalation attempt')
    
    final_score = min(score, 1.0)
    return final_score, triggered_rules
