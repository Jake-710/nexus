import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import RiskGauge from '../components/RiskGauge';

const UserHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get } = useApi();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'User Risk History — UEBA';
    get(`/users/${id}/risk-history`)
      .then(data => setUserData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="animate-fade-in p-8"><div className="card"><p className="text-secondary">Loading user history...</p></div></div>;
  if (!userData) return <div className="animate-fade-in p-8"><div className="card"><p className="text-red">User not found.</p></div></div>;

  const latestScore = userData.history?.length > 0 ? userData.history[userData.history.length - 1].risk_score : 0;
  const initials = userData.user_name ? userData.user_name.split(' ').map(n => n[0]).join('') : '?';

  return (
    <div className="animate-fade-in pb-8">
      <button className="btn btn-ghost mb-6" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card text-center">
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'var(--accent-purple)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
            fontWeight: 'bold', margin: '0 auto 1rem'
          }}>
            {initials}
          </div>
          <h1 className="text-2xl font-bold mb-1">{userData.user_name}</h1>
          <p className="text-secondary mb-4">{userData.department}</p>
          <RiskGauge value={latestScore} />
        </div>

        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Risk Score Timeline</h3>
          {userData.history && userData.history.length > 0 ? (
            <div style={{ height: '250px', display: 'flex', alignItems: 'flex-end', gap: '2px', padding: '1rem 0' }}>
              {userData.history.slice(-50).map((point, i) => {
                const height = Math.max(5, point.risk_score * 100);
                const color = point.risk_score >= 0.8 ? 'var(--accent-red)' : point.risk_score >= 0.5 ? 'var(--accent-amber)' : 'var(--accent-green)';
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${new Date(point.timestamp).toLocaleString()}: ${(point.risk_score * 100).toFixed(0)}%`}>
                    <div style={{ width: '100%', height: `${height}%`, background: color, borderRadius: '2px 2px 0 0', minHeight: '4px', opacity: 0.8 }}></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-secondary">No risk history data yet. Alerts will appear here as they are generated.</p>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Recent Alert History</h3>
        {userData.history && userData.history.length > 0 ? (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Time</th>
                <th>Risk Score</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {userData.history.slice(-20).reverse().map((point, i) => {
                const severity = point.risk_score >= 0.8 ? 'Critical' : point.risk_score >= 0.5 ? 'High' : 'Medium';
                const badgeClass = point.risk_score >= 0.8 ? 'badge-critical' : 'badge-warning';
                return (
                  <tr key={i}>
                    <td className="text-muted">{new Date(point.timestamp).toLocaleString()}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <span style={{ color: point.risk_score >= 0.8 ? 'var(--accent-red)' : 'var(--accent-amber)', fontWeight: '600' }}>
                          {(point.risk_score * 100).toFixed(0)}%
                        </span>
                        <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${point.risk_score * 100}%`, height: '100%', background: point.risk_score >= 0.8 ? 'var(--accent-red)' : 'var(--accent-amber)', borderRadius: '3px' }}></div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`badge ${badgeClass}`}>{severity}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-secondary">No alerts recorded for this user yet.</p>
        )}
      </div>
    </div>
  );
};

export default UserHistoryPage;
