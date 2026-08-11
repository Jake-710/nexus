import os

API_URL = os.environ.get('SIMULATOR_API_URL', 'http://localhost:8000')
INTERVAL_MS = int(os.environ.get('SIMULATOR_INTERVAL_MS', 2000))
USER_COUNT = int(os.environ.get('SIMULATOR_USER_COUNT', 150))

DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'IT-Admin', 'Sales']

RESOURCES = {
    'Engineering': ['git-repo-main', 'ci-cd-pipeline', 'staging-server', 'prod-db-readonly', 'jira-board', 'confluence-wiki', 'docker-registry', 'aws-console', 'monitoring-grafana', 'code-review-tool'],
    'Finance': ['erp-system', 'payroll-db', 'budget-reports', 'invoice-portal', 'tax-filing-system', 'financial-dashboard', 'expense-tracker', 'audit-logs', 'vendor-portal', 'banking-gateway'],
    'HR': ['hris-system', 'recruitment-portal', 'employee-records', 'leave-management', 'training-platform', 'performance-reviews', 'onboarding-docs', 'benefits-portal', 'compliance-training', 'exit-interviews'],
    'IT-Admin': ['active-directory', 'firewall-config', 'vpn-manager', 'patch-management', 'backup-console', 'dns-manager', 'certificate-store', 'security-logs', 'network-monitor', 'cloud-admin-console'],
    'Sales': ['crm-system', 'lead-database', 'proposal-templates', 'client-contracts', 'sales-dashboard', 'commission-tracker', 'territory-maps', 'product-catalog', 'demo-environment', 'partner-portal']
}

IPS = {
    'normal': ['10.0.1.101', '10.0.1.102', '10.0.1.103', '10.0.1.104', '10.0.1.105', '10.0.2.50', '10.0.2.51', '10.0.3.10'],
    'vpn': ['172.16.0.10', '172.16.0.11', '172.16.0.12'],
    'suspicious': ['185.220.101.42', '91.121.87.18', '103.75.201.4', '45.33.32.156']
}

GEO_LOCATIONS = {
    'normal': ['Coimbatore, India', 'Chennai, India', 'Bangalore, India', 'Mumbai, India', 'Hyderabad, India'],
    'suspicious': ['Moscow, Russia', 'Lagos, Nigeria', 'Pyongyang, North Korea', 'Unknown VPN']
}
