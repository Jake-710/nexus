from datetime import datetime, timezone
import math

DEPARTMENT_RESOURCES = {
    'Engineering': {'git-repo-main', 'ci-cd-pipeline', 'staging-server', 'prod-db-readonly', 'jira-board', 'confluence-wiki', 'docker-registry', 'aws-console', 'monitoring-grafana', 'code-review-tool'},
    'Finance': {'erp-system', 'payroll-db', 'budget-reports', 'invoice-portal', 'tax-filing-system', 'financial-dashboard', 'expense-tracker', 'audit-logs', 'vendor-portal', 'banking-gateway'},
    'HR': {'hris-system', 'recruitment-portal', 'employee-records', 'leave-management', 'training-platform', 'performance-reviews', 'onboarding-docs', 'benefits-portal', 'compliance-training', 'exit-interviews'},
    'IT-Admin': {'active-directory', 'firewall-config', 'vpn-manager', 'patch-management', 'backup-console', 'dns-manager', 'certificate-store', 'security-logs', 'network-monitor', 'cloud-admin-console'},
    'Sales': {'crm-system', 'lead-database', 'proposal-templates', 'client-contracts', 'sales-dashboard', 'commission-tracker', 'territory-maps', 'product-catalog', 'demo-environment', 'partner-portal'}
}

def get_department_for_resource(resource_id: str) -> str:
    for dept, resources in DEPARTMENT_RESOURCES.items():
        if resource_id in resources:
            return dept
    return ''

def compute_features(event, user_baseline, recent_events) -> dict:
    # 1. login_hour
    try:
        timestamp_dt = datetime.fromisoformat(event.get('timestamp').replace('Z', '+00:00'))
    except Exception:
        timestamp_dt = datetime.now(timezone.utc)
    
    login_hour = timestamp_dt.hour
    
    # 2. failed_login_attempts in last 10 min
    ten_mins_ago = timestamp_dt.timestamp() - 600
    failed_login_attempts = sum(
        1 for e in recent_events 
        if e.action_type == 'failed_login' and e.timestamp.timestamp() >= ten_mins_ago
    )
    
    # 3. files_accessed in last 1 hour
    one_hour_ago = timestamp_dt.timestamp() - 3600
    files_accessed = sum(
        1 for e in recent_events 
        if e.action_type in ('file_access', 'file_download') and e.timestamp.timestamp() >= one_hour_ago
    )
    
    # 4. data_volume_mb in last 1 hour
    data_volume_mb = sum(
        (e.volume_mb or 0.0) for e in recent_events 
        if e.timestamp.timestamp() >= one_hour_ago
    )
    
    # 5. distinct_ips in last 24 hours
    twenty_four_hours_ago = timestamp_dt.timestamp() - 86400
    ip_set = set(
        e.src_ip for e in recent_events 
        if e.timestamp.timestamp() >= twenty_four_hours_ago
    )
    current_ip = event.get('src_ip')
    if current_ip:
        ip_set.add(current_ip)
    distinct_ips = len(ip_set)
        
    # 6. off_hours_flag
    off_hours_flag = 1 if login_hour < 8 or login_hour > 20 else 0
    
    # 7. first_time_resource
    typical_resources = []
    if user_baseline and user_baseline.typical_resources:
        typical_resources = user_baseline.typical_resources
    
    resource_id = event.get('resource_id')
    first_time_resource = 1 if resource_id and resource_id not in typical_resources else 0
    
    # 8. peer_group_deviation
    peer_group_deviation = 0.0
    if user_baseline:
        diff_hour = (login_hour - (user_baseline.avg_login_hour or 12)) ** 2
        diff_files = (files_accessed - (user_baseline.avg_files_per_day or 0)) ** 2
        diff_vol = (data_volume_mb - (user_baseline.avg_volume_mb or 0)) ** 2
        peer_group_deviation = math.sqrt(diff_hour + (diff_files/100.0) + (diff_vol/1000.0))
    
    # 9. is_weekend
    is_weekend = 1 if timestamp_dt.weekday() >= 5 else 0
    
    # 10. is_cross_department - accessing resources outside own department
    is_cross_department = 0
    if resource_id and user_baseline:
        # Get user's department from baseline peer_group_id
        dept_map = {0: 'Engineering', 1: 'Finance', 2: 'HR', 3: 'IT-Admin', 4: 'Sales'}
        user_dept = dept_map.get(user_baseline.peer_group_id, '')
        resource_dept = get_department_for_resource(resource_id)
        if resource_dept and resource_dept != user_dept:
            is_cross_department = 1
    
    # 11. rapid_actions_count - events in last 5 minutes
    five_mins_ago = timestamp_dt.timestamp() - 300
    rapid_actions_count = sum(
        1 for e in recent_events 
        if e.timestamp.timestamp() >= five_mins_ago
    )
        
    return {
        "login_hour": login_hour,
        "failed_login_attempts": failed_login_attempts,
        "files_accessed": files_accessed,
        "data_volume_mb": data_volume_mb,
        "distinct_ips": distinct_ips,
        "off_hours_flag": off_hours_flag,
        "first_time_resource": first_time_resource,
        "peer_group_deviation": peer_group_deviation,
        "is_weekend": is_weekend,
        "is_cross_department": is_cross_department,
        "rapid_actions_count": rapid_actions_count,
    }
