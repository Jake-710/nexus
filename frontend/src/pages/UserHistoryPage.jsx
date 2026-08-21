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
          {userData.history && userData.history.length > 0 ? (() => {
            const history = userData.history.slice(-50);
            const maxScore = 100;
            const svgW = 600, svgH = 220;
            const pad = { top: 15, right: 15, bottom: 35, left: 35 };
            const cw = svgW - pad.left - pad.right;
            const ch = svgH - pad.top - pad.bottom;

            const pts = history.map((p, i) => ({
              x: pad.left + (history.length === 1 ? cw / 2 : (i / (history.length - 1)) * cw),
              y: pad.top + ch - (Math.min(p.risk_score, 1) * ch),
              score: p.risk_score,
              time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              fullTime: new Date(p.timestamp).toLocaleString(),
            }));

            const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
            const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.top + ch} L${pts[0].x},${pad.top + ch} Z`;
            const labelInterval = Math.max(1, Math.floor(history.length / 8));
            const yTicks = [0, 25, 50, 75, 100];

            const getColor = (s) => s >= 0.8 ? '#ff4757' : s >= 0.5 ? '#ffa502' : '#2ed573';
            const mainColor = getColor(pts[pts.length - 1].score);

            return (
              <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="user-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={mainColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={mainColor} stopOpacity="0.02" />
                  </linearGradient>
                  <filter id="user-line-glow">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Grid lines */}
                {yTicks.map(v => {
                  const y = pad.top + ch - (v / maxScore) * ch;
                  return (
                    <g key={`g-${v}`}>
                      <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                      <text x={pad.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="8">{v}</text>
                    </g>
                  );
                })}

                {/* Threshold line at 65% (alert threshold) */}
                {(() => {
                  const thY = pad.top + ch - 0.65 * ch;
                  return (
                    <>
                      <line x1={pad.left} y1={thY} x2={svgW - pad.right} y2={thY} stroke="rgba(255,165,2,0.5)" strokeWidth="1" strokeDasharray="6 4" />
                      <text x={svgW - pad.right} y={thY - 5} textAnchor="end" fill="#ffa502" fontSize="8" opacity="0.7">threshold</text>
                    </>
                  );
                })()}

                {/* Area fill */}
                <path d={areaPath} fill="url(#user-area-fill)" />

                {/* Line */}
                <path d={linePath} fill="none" stroke={mainColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" filter="url(#user-line-glow)" />

                {/* Data dots */}
                {pts.map((p, i) => {
                  const dotColor = getColor(p.score);
                  return (
                    <g key={i}>
                      <title>{`${p.fullTime}: ${(p.score * 100).toFixed(0)}%`}</title>
                      <circle cx={p.x} cy={p.y} r="4" fill={dotColor} stroke="#0a0e1a" strokeWidth="1.5" />
                      {i % labelInterval === 0 && (
                        <text x={p.x} y={pad.top + ch + 14} textAnchor="end" fill="#6b7280" fontSize="8"
                          transform={`rotate(-40, ${p.x}, ${pad.top + ch + 14})`}>
                          {p.time}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Axes */}
                <line x1={pad.left} y1={pad.top + ch} x2={svgW - pad.right} y2={pad.top + ch} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ch} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </svg>
            );
          })() : (
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
