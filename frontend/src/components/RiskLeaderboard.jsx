import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const mockUsers = [
  { id: 'u1', name: 'Alice Chen', dept: 'Engineering', score: 0.92, alerts: 14 },
  { id: 'u2', name: 'Bob Smith', dept: 'Finance', score: 0.85, alerts: 8 },
  { id: 'u3', name: 'Charlie Davis', dept: 'HR', score: 0.76, alerts: 5 },
  { id: 'u4', name: 'Diana Prince', dept: 'Executive', score: 0.62, alerts: 3 },
  { id: 'u5', name: 'Evan Wright', dept: 'Sales', score: 0.55, alerts: 2 },
];

const RiskLeaderboard = () => {
  const { get } = useApi();
  const [users, setUsers] = useState(mockUsers);
  const navigate = useNavigate();

  useEffect(() => {
    get('/users/leaderboard')
      .then(data => {
        if (data && data.length > 0) {
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
  }, []);

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'var(--accent-red)';
    if (score >= 0.5) return 'var(--accent-amber)';
    return 'var(--accent-green)';
  };

  return (
    <div className="card h-full" id="leaderboard">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-semibold text-lg">Top Riskiest Users</h3>
        <button className="btn btn-ghost text-sm">View All</button>
      </div>

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
            {users.map((user) => (
              <tr 
                key={user.id} 
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/users/${user.id}`)}
              >
                <td>
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: 'rgba(255,255,255,0.1)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem',
                      fontWeight: 'bold', color: getScoreColor(user.score)
                    }}>
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium">{user.name}</span>
                  </div>
                </td>
                <td className="text-muted">{user.dept}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <span style={{ color: getScoreColor(user.score), fontWeight: '600', width: '30px' }}>
                      {Math.round(user.score * 100)}
                    </span>
                    <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${user.score * 100}%`, 
                        height: '100%', 
                        background: getScoreColor(user.score),
                        boxShadow: `0 0 8px ${getScoreColor(user.score)}`
                      }}></div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${user.alerts > 5 ? 'badge-critical' : 'badge-warning'}`}>
                    {user.alerts}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskLeaderboard;
