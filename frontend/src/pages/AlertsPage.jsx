import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../App';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 12;

const STATUS_LABELS = {
  new: 'New',
  investigating: 'Investigating',
  resolved: 'Resolved',
  false_positive: 'False Positive',
};

const AlertsPage = () => {
  const { get } = useApi();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [severity, setSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
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
    if (statusFilter) endpoint += `&status=${statusFilter}`;
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
  }, [department, statusFilter]);

  // Reset to page 1 on any filter/sort change
  useEffect(() => { setPage(1); }, [severity, department, search, sortBy, statusFilter]);

  // Export current filter set as CSV (auth-aware blob download)
  const exportCsv = async () => {
    const params = new URLSearchParams({ format: 'csv' });
    if (department) params.append('department', department);
    if (statusFilter) params.append('status', statusFilter);
    try {
      const res = await fetch(`/api/v1/export/alerts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alerts_export.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // Combined filter + search + sort pipeline
  const processedAlerts = useMemo(() => {
    let result = [...alerts];

    // 1. Severity filter
    if (severity) {
      const tier = SEVERITY_TIERS[severity];
      result = result.filter(a => {
        const pct = Math.round(a.risk_score * 100);
        return pct >= tier.floor && pct <= tier.ceiling;
      });
    }

    // 2. Search filter — user name OR rule text (AND with severity/department)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(a => {
        const nameMatch = (a.user_name || '').toLowerCase().includes(q);
        const ruleMatch = Array.isArray(a.rule_details) &&
          a.rule_details.some(r => r.toLowerCase().includes(q));
        return nameMatch || ruleMatch;
      });
    }

    // 3. Sort by rule count
    if (sortBy === 'rules-desc') {
      result.sort((a, b) => (b.rule_details?.length || 0) - (a.rule_details?.length || 0));
    } else if (sortBy === 'rules-asc') {
      result.sort((a, b) => (a.rule_details?.length || 0) - (b.rule_details?.length || 0));
    }

    return result;
  }, [alerts, severity, search, sortBy]);

  const totalPages = Math.ceil(processedAlerts.length / ITEMS_PER_PAGE);
  const paginatedAlerts = processedAlerts.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Security Alerts</h1>
          <p className="text-secondary text-sm">Review and manage behavioral anomalies. ({processedAlerts.length} alerts)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-3 items-center flex-wrap" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search user or rule…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.25rem' }}
          />
          <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>⌕</span>
        </div>
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
        <select className="select" style={{ maxWidth: '180px' }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setLoading(true); }}>
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="investigating">Investigating</option>
          <option value="resolved">Resolved</option>
          <option value="false_positive">False Positive</option>
        </select>
        <select className="select" style={{ maxWidth: '200px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="">Default Order</option>
          <option value="rules-desc">Most Rules Triggered</option>
          <option value="rules-asc">Fewest Rules Triggered</option>
        </select>
        <button className="btn btn-ghost" onClick={exportCsv} style={{ gap: '0.4rem', marginLeft: 'auto' }} title="Export current alerts to CSV">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      </div>

      {loading ? (
        <div className="card"><p className="text-secondary">Loading alerts...</p></div>
      ) : processedAlerts.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🔔</div>
            <div className="empty-text">
              {severity || search
                ? 'No alerts match your current filters.'
                : 'No alerts found. The system is monitoring — alerts will appear here when anomalies are detected.'}
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
                      {alert.status && alert.status !== 'new' && (
                        <span
                          className="badge"
                          style={{
                            fontSize: '0.65rem', fontWeight: 600,
                            background: 'var(--bg-elevated)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {STATUS_LABELS[alert.status] || alert.status}
                        </span>
                      )}
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
