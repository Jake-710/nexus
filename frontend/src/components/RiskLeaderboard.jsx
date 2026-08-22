import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle } from '../theme';
import SeverityBadge from './SeverityBadge';

const RiskLeaderboard = () => {
  const { get } = useApi();
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = () => {
      get('/users/leaderboard')
        .then(data => {
          if (data && Array.isArray(data)) {
            setUsers(data.map(u => ({
              id: u.user_id,
              name: u.user_name,
              dept: u.department,
              score: u.max_risk_score,
              alerts: u.alert_count
            })));
          }
        })
        .catch(err => console.error('Leaderboard fetch failed:', err));
    };
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-lg">Top Riskiest Users</h3>
        <button className="btn btn-ghost text-sm" onClick={() => navigate('/users')}>View All</button>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">Collecting user risk data… The leaderboard will populate as alerts are generated.</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>Dept</th>
                <th>Risk Score</th>
                <th>Alerts</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const sev = getSeverity(user.score);
                const pct = Math.round(user.score * 100);
                return (
                  <tr key={user.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/users/${user.id}`)}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div style={{
                          ...getAvatarStyle(user.score),
                          width: '32px', height: '32px', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: '700',
                        }}>
                          {getInitials(user.name)}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="text-secondary">{user.dept}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span className="font-mono" style={{ color: sev.color, fontWeight: '600', width: '30px' }}>
                          {pct}
                        </span>
                        <div style={{ width: '80px', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%',
                            background: sev.color, borderRadius: '4px',
                          }}></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <SeverityBadge score={user.alerts > 5 ? 0.9 : user.alerts > 2 ? 0.65 : 0.3} label={String(user.alerts)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RiskLeaderboard;
