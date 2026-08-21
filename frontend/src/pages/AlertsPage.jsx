import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const AlertsPage = () => {
  const { get } = useApi();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [severity, setSeverity] = useState('');

  // Severity tiers with integer percentage floor/ceiling ranges
  const SEVERITY_TIERS = {
    critical: { label: 'Critical', floor: 80, ceiling: 100 },
    high:     { label: 'High',     floor: 60, ceiling: 79 },
    medium:   { label: 'Medium',   floor: 40, ceiling: 59 },
    low:      { label: 'Low',      floor: 0,  ceiling: 39 },
  };

  const fetchAlerts = () => {
    let endpoint = '/alerts/?limit=50';
    if (department) endpoint += `&department=${department}`;

    get(endpoint)
      .then(data => setAlerts(data.alerts || []))
      .catch(err => console.error('Failed to fetch alerts:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = 'Alerts — UEBA';
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 15000);
    return () => clearInterval(interval);
  }, [department]);

  // Filter uses rounded score so display and classification always match
  const filteredAlerts = severity
    ? alerts.filter(a => {
        const pct = Math.round(a.risk_score * 100);
        const tier = SEVERITY_TIERS[severity];
        return pct >= tier.floor && pct <= tier.ceiling;
      })
    : alerts;

  const getSeverityStyle = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return { color: 'var(--accent-red)', badge: 'badge-critical', label: 'Critical' };
    if (pct >= 60) return { color: 'var(--accent-amber)', badge: 'badge-warning', label: 'High' };
    if (pct >= 40) return { color: '#f0c040', badge: 'badge-warning', label: 'Medium' };
    return { color: 'var(--accent-green)', badge: 'badge-low', label: 'Low' };
  };

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Security Alerts</h1>
          <p className="text-secondary">Review and manage behavioral anomalies. ({filteredAlerts.length} alerts)</p>
        </div>
      </div>

      <div className="card mb-6 flex gap-4 items-center" style={{ padding: '1rem 1.5rem' }}>
        <select className="select" style={{ maxWidth: '220px' }} value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical (80%–100%)</option>
          <option value="high">High (60%–79%)</option>
          <option value="medium">Medium (40%–59%)</option>
          <option value="low">Low (0%–39%)</option>
        </select>
        <select className="select" style={{ maxWidth: '200px' }} value={department} onChange={e => { setDepartment(e.target.value); setLoading(true); }}>
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR</option>
          <option value="IT-Admin">IT-Admin</option>
          <option value="Sales">Sales</option>
        </select>
      </div>

      {loading ? (
        <div className="card"><p className="text-secondary">Loading alerts...</p></div>
      ) : filteredAlerts.length === 0 ? (
        <div className="card"><p className="text-secondary">{severity ? `No ${SEVERITY_TIERS[severity].label} alerts found.` : 'No alerts found. The system is monitoring — alerts will appear here when anomalies are detected.'}</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {filteredAlerts.map(alert => {
            const sevStyle = getSeverityStyle(alert.risk_score);
            const initials = alert.user_name ? alert.user_name.split(' ').map(n => n[0]).join('') : '?';
            return (
              <div
                key={alert.id}
                className="card animate-slide-in"
                style={{
                  borderLeft: `4px solid ${sevStyle.color}`,
                  cursor: 'pointer',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => navigate(`/alerts/${alert.id}`)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.05)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                      fontWeight: 'bold', color: sevStyle.color,
                      boxShadow: `inset 0 0 10px ${sevStyle.color}33`
                    }}>
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{alert.user_name}</h4>
                      <div className="text-muted text-sm">{alert.user_department}</div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span className="text-muted text-xs">{new Date(alert.created_at).toLocaleString()}</span>
                    <span className={`badge ${sevStyle.badge}`}>Score: {Math.round(alert.risk_score * 100)}</span>
                  </div>
                </div>

                <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                  <div className="font-medium mb-1">{alert.event_details?.action_type?.replace('_', ' ') || 'Anomaly'}</div>
                  <div className="text-secondary text-sm">
                    {alert.rule_details && Array.isArray(alert.rule_details) ? alert.rule_details.join(' • ') : 'Behavioral anomaly detected'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
