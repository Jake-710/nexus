import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 20;

const SEVERITY_TIERS = {
  critical: { label: 'Critical', floor: 80, ceiling: 100, color: '#FF4747' },
  high:     { label: 'High',     floor: 60, ceiling: 79,  color: '#F2A654' },
  medium:   { label: 'Medium',   floor: 40, ceiling: 59,  color: '#FFC100' },
  low:      { label: 'Low',      floor: 0,  ceiling: 39,  color: '#248AFD' },
};

const UsersPage = () => {
  const { get } = useApi();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('risk-desc');
  const [riskLevel, setRiskLevel] = useState('');
  const [page, setPage] = useState(1);

  const fetchUsers = () => {
    let endpoint = '/users/?limit=50';
    if (department) endpoint += `&department=${department}`;
    if (search) endpoint += `&search=${encodeURIComponent(search)}`;
    get(endpoint)
      .then(data => {
        setUsers(data.users || []);
        setTotal(data.total || 0);
      })
      .catch(err => console.error('Failed to fetch users:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = 'Users — UEBA';
    setLoading(true);
    fetchUsers();
    const interval = setInterval(fetchUsers, 15000);
    return () => clearInterval(interval);
  }, [department, search]);

  useEffect(() => { setPage(1); }, [riskLevel, department, search, sortBy]);

  const filteredUsers = riskLevel
    ? users.filter(u => {
        const tier = SEVERITY_TIERS[riskLevel];
        const pct = Math.round((u.max_risk_score || 0) * 100);
        return pct >= tier.floor && pct <= tier.ceiling;
      })
    : users;

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'risk-desc': return (b.max_risk_score || 0) - (a.max_risk_score || 0);
      case 'risk-asc':  return (a.max_risk_score || 0) - (b.max_risk_score || 0);
      case 'alerts':    return (b.alert_count || 0) - (a.alert_count || 0);
      case 'name':      return (a.full_name || '').localeCompare(b.full_name || '');
      default:          return 0;
    }
  });

  const totalPages = Math.ceil(sortedUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = sortedUsers.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const tierCounts = Object.entries(SEVERITY_TIERS).reduce((acc, [key, tier]) => {
    acc[key] = users.filter(u => {
      const pct = Math.round((u.max_risk_score || 0) * 100);
      return pct >= tier.floor && pct <= tier.ceiling;
    }).length;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">User Directory</h1>
          <p className="text-secondary text-sm">Monitor all organization users and their risk profiles. ({total} users)</p>
        </div>
      </div>

      {/* Severity summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
        {Object.entries(SEVERITY_TIERS).map(([key, tier]) => (
          <div
            key={key}
            className="card"
            style={{
              padding: '0.85rem 1rem', cursor: 'pointer',
              borderLeft: `3px solid ${tier.color}`,
              opacity: riskLevel && riskLevel !== key ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
            onClick={() => setRiskLevel(riskLevel === key ? '' : key)}
          >
            <div className="text-muted text-xs uppercase" style={{ letterSpacing: '0.05em' }}>{tier.label}</div>
            <div className="flex justify-between items-end mt-1">
              <span className="font-mono font-bold text-lg" style={{ color: tier.color }}>{tierCounts[key] || 0}</span>
              <span className="text-muted text-xs">{tier.floor}%–{tier.ceiling}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4 flex gap-3 items-center flex-wrap" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '260px' }}>
          <input
            type="text" className="input" placeholder="Search users..."
            value={search} onChange={e => { setSearch(e.target.value); setLoading(true); }}
            style={{ width: '100%', paddingLeft: '2.25rem' }}
          />
          <span style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>⌕</span>
        </div>
        <select className="select" style={{ maxWidth: '180px' }} value={department} onChange={e => { setDepartment(e.target.value); setLoading(true); }}>
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR</option>
          <option value="IT-Admin">IT-Admin</option>
          <option value="Sales">Sales</option>
        </select>
        <select className="select" style={{ maxWidth: '200px' }} value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
          <option value="">All Risk Levels</option>
          <option value="critical">Critical (≥80%)</option>
          <option value="high">High (60%–79%)</option>
          <option value="medium">Medium (40%–59%)</option>
          <option value="low">Low (&lt;40%)</option>
        </select>
        <select className="select" style={{ maxWidth: '200px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk-desc">Sort: Highest Risk</option>
          <option value="risk-asc">Sort: Lowest Risk</option>
          <option value="alerts">Sort: Most Alerts</option>
          <option value="name">Sort: Name (A-Z)</option>
        </select>
      </div>

      {loading ? (
        <div className="card"><p className="text-secondary">Loading users...</p></div>
      ) : users.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <div className="empty-text">No users found matching your criteria.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Department</th>
                    <th>Risk Level</th>
                    <th>Max Risk Score</th>
                    <th>Alerts</th>
                    <th>Last Alert</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map(user => {
                    const sev = getSeverity(user.max_risk_score);
                    const pct = Math.round((user.max_risk_score || 0) * 100);
                    return (
                      <tr key={user.user_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${user.user_id}`)}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{
                              ...getAvatarStyle(user.max_risk_score),
                              width: '34px', height: '34px', borderRadius: '50%',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.75rem', fontWeight: '700',
                              border: `1px solid ${sev.color}30`,
                            }}>
                              {getInitials(user.full_name)}
                            </div>
                            <div>
                              <div className="font-medium">{user.full_name}</div>
                              <div className="text-muted text-xs">{user.username}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-secondary">{user.department}</td>
                        <td><SeverityBadge score={user.max_risk_score} /></td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="font-mono" style={{ color: sev.color, fontWeight: '600', width: '30px' }}>{pct}</span>
                            <div style={{ width: '80px', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: sev.color, borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          {user.alert_count > 0
                            ? <SeverityBadge score={user.alert_count > 5 ? 0.9 : user.alert_count > 2 ? 0.65 : 0.3} label={String(user.alert_count)} />
                            : <span className="text-muted">—</span>
                          }
                        </td>
                        <td><span className="text-muted text-sm font-mono">{user.latest_alert_at ? formatDateTime(user.latest_alert_at) : '—'}</span></td>
                        <td>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            color: user.is_active ? '#22C55E' : 'var(--text-muted)', fontSize: '0.8rem',
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: user.is_active ? '#22C55E' : 'var(--text-muted)' }}></span>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
};

export default UsersPage;
