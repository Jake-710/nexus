import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

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

  // Severity tiers with defined floor/ceiling values (integer percentages)
  const SEVERITY_TIERS = {
    critical: { label: 'Critical', floor: 80, ceiling: 100, color: 'var(--accent-red)' },
    high:     { label: 'High',     floor: 60, ceiling: 79,  color: 'var(--accent-amber)' },
    medium:   { label: 'Medium',   floor: 40, ceiling: 59,  color: '#f0c040' },
    low:      { label: 'Low',      floor: 0,  ceiling: 39,  color: 'var(--accent-green)' },
  };

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

  const getRiskColor = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return SEVERITY_TIERS.critical.color;
    if (pct >= 60) return SEVERITY_TIERS.high.color;
    if (pct >= 40) return SEVERITY_TIERS.medium.color;
    return SEVERITY_TIERS.low.color;
  };

  const getRiskLabel = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return 'Critical';
    if (pct >= 60) return 'High';
    if (pct >= 40) return 'Medium';
    if (pct > 0) return 'Low';
    return 'None';
  };

  const getRiskBadge = (score) => {
    const pct = Math.round(score * 100);
    if (pct >= 80) return 'badge-critical';
    if (pct >= 60) return 'badge-warning';
    if (pct >= 40) return 'badge-warning';
    return 'badge-low';
  };

  // Filter by selected severity tier using rounded score
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

  // Count users per severity tier
  const tierCounts = Object.entries(SEVERITY_TIERS).reduce((acc, [key, tier]) => {
    acc[key] = users.filter(u => {
      const pct = Math.round((u.max_risk_score || 0) * 100);
      return pct >= tier.floor && pct <= tier.ceiling;
    }).length;
    return acc;
  }, {});

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">User Directory</h1>
          <p className="text-secondary">Monitor all organization users and their risk profiles. ({total} users)</p>
        </div>
      </div>

      {/* Severity tier summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {Object.entries(SEVERITY_TIERS).map(([key, tier]) => (
          <div
            key={key}
            className="card"
            style={{
              padding: '1rem 1.25rem',
              cursor: 'pointer',
              borderLeft: `4px solid ${tier.color}`,
              opacity: riskLevel && riskLevel !== key ? 0.5 : 1,
              transition: 'opacity 0.2s',
            }}
            onClick={() => setRiskLevel(riskLevel === key ? '' : key)}
          >
            <div className="text-muted text-xs" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tier.label}
            </div>
            <div className="flex justify-between items-end mt-1">
              <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: tier.color }}>
                {tierCounts[key] || 0}
              </span>
              <span className="text-muted text-xs">
                {tier.floor}% – {tier.ceiling}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-6 flex gap-4 items-center" style={{ padding: '1rem 1.5rem' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <input
            type="text"
            className="input"
            placeholder="Search users..."
            value={search}
            onChange={e => { setSearch(e.target.value); setLoading(true); }}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
          <span style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>&#128269;</span>
        </div>
        <select className="select" style={{ maxWidth: '200px' }} value={department} onChange={e => { setDepartment(e.target.value); setLoading(true); }}>
          <option value="">All Departments</option>
          <option value="Engineering">Engineering</option>
          <option value="Finance">Finance</option>
          <option value="HR">HR</option>
          <option value="IT-Admin">IT-Admin</option>
          <option value="Sales">Sales</option>
        </select>
        <select className="select" style={{ maxWidth: '220px' }} value={riskLevel} onChange={e => setRiskLevel(e.target.value)}>
          <option value="">All Risk Levels</option>
          <option value="critical">Critical (&ge;80%)</option>
          <option value="high">High (60%–79%)</option>
          <option value="medium">Medium (40%–59%)</option>
          <option value="low">Low (&lt;40%)</option>
        </select>
        <select className="select" style={{ maxWidth: '220px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="risk-desc">Sort: Highest Risk First</option>
          <option value="risk-asc">Sort: Lowest Risk First</option>
          <option value="alerts">Sort: Most Alerts</option>
          <option value="name">Sort: Name (A-Z)</option>
        </select>
      </div>

      {loading ? (
        <div className="card"><p className="text-secondary">Loading users...</p></div>
      ) : users.length === 0 ? (
        <div className="card"><p className="text-secondary">No users found matching your criteria.</p></div>
      ) : (
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
                {sortedUsers.map(user => {
                  const initials = user.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : '?';
                  return (
                    <tr
                      key={user.user_id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/users/${user.user_id}`)}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: `linear-gradient(135deg, ${getRiskColor(user.max_risk_score)}33, rgba(255,255,255,0.05))`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8rem', fontWeight: 'bold',
                            color: getRiskColor(user.max_risk_score),
                            border: `1px solid ${getRiskColor(user.max_risk_score)}44`
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-medium">{user.full_name}</div>
                            <div className="text-muted text-xs">{user.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="text-secondary">{user.department}</span>
                      </td>
                      <td>
                        <span className={`badge ${getRiskBadge(user.max_risk_score)}`}>
                          {getRiskLabel(user.max_risk_score)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span style={{ color: getRiskColor(user.max_risk_score), fontWeight: '600', width: '35px' }}>
                            {Math.round(user.max_risk_score * 100)}
                          </span>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${user.max_risk_score * 100}%`,
                              height: '100%',
                              background: getRiskColor(user.max_risk_score),
                              boxShadow: `0 0 6px ${getRiskColor(user.max_risk_score)}`,
                              borderRadius: '3px'
                            }}></div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user.alert_count > 0 ? (
                          <span className={`badge ${user.alert_count > 5 ? 'badge-critical' : user.alert_count > 2 ? 'badge-warning' : 'badge-low'}`}>
                            {user.alert_count}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className="text-muted text-sm">
                          {user.latest_alert_at ? new Date(user.latest_alert_at).toLocaleString() : '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          color: user.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                          fontSize: '0.85rem'
                        }}>
                          <span style={{
                            width: '8px', height: '8px', borderRadius: '50%',
                            background: user.is_active ? 'var(--accent-green)' : 'var(--text-muted)',
                            boxShadow: user.is_active ? '0 0 6px var(--accent-green)' : 'none'
                          }}></span>
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
      )}
    </div>
  );
};

export default UsersPage;
