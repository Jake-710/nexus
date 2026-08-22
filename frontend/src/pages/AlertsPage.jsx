import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 12;

const AlertsPage = () => {
  const { get } = useApi();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [severity, setSeverity] = useState('');
  const [page, setPage] = useState(1);

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

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [severity, department]);

  const filteredAlerts = severity
    ? alerts.filter(a => {
        const pct = Math.round(a.risk_score * 100);
        const tier = SEVERITY_TIERS[severity];
        return pct >= tier.floor && pct <= tier.ceiling;
      })
    : alerts;

  const totalPages = Math.ceil(filteredAlerts.length / ITEMS_PER_PAGE);
  const paginatedAlerts = filteredAlerts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Security Alerts</h1>
          <p className="text-secondary text-sm">Review and manage behavioral anomalies. ({filteredAlerts.length} alerts)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-4 items-center" style={{ padding: '0.75rem 1rem' }}>
        <select className="select" style={{ maxWidth: '200px' }} value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="">All Severities</option>
          <option value="critical">Critical (80%–100%)</option>
          <option value="high">High (60%–79%)</option>
          <option value="medium">Medium (40%–59%)</option>
          <option value="low">Low (0%–39%)</option>
        </select>
        <select className="select" style={{ maxWidth: '180px' }} value={department} onChange={e => { setDepartment(e.target.value); setLoading(true); }}>
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
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <div className="empty-text">
              {severity ? `No ${SEVERITY_TIERS[severity].label} alerts found.` : 'No alerts found. The system is monitoring — alerts will appear here when anomalies are detected.'}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem', alignItems: 'stretch' }}>
            {paginatedAlerts.map(alert => {
              const sev = getSeverity(alert.risk_score);
              const initials = getInitials(alert.user_name);
              return (
                <div
                  key={alert.id}
                  className="card"
                  style={{
                    borderLeft: `3px solid ${sev.color}`,
                    cursor: 'pointer', padding: '1.25rem',
                    display: 'flex', flexDirection: 'column',
                  }}
                  onClick={() => navigate(`/alerts/${alert.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div style={{
                        ...getAvatarStyle(alert.risk_score),
                        width: '38px', height: '38px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.85rem', fontWeight: '700',
                      }}>
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-semibold">{alert.user_name}</h4>
                        <div className="text-muted text-xs">{alert.user_department}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-muted text-xs font-mono">{formatDateTime(alert.created_at)}</span>
                      <SeverityBadge score={alert.risk_score} showScore />
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
                    <div className="font-medium text-sm mb-1">{alert.event_details?.action_type?.replace('_', ' ') || 'Anomaly'}</div>
                    <div className="text-secondary text-xs line-clamp-2">
                      {alert.rule_details && Array.isArray(alert.rule_details) ? alert.rule_details.join(' • ') : 'Behavioral anomaly detected'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default AlertsPage;
