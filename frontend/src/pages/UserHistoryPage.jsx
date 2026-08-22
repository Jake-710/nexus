import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime, formatTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import RiskGauge from '../components/RiskGauge';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 15;

const UserHistoryPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get } = useApi();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    document.title = 'User Risk History — UEBA';
    get(`/users/${id}/risk-history`)
      .then(data => setUserData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="animate-fade-in p-8"><div className="card"><p className="text-secondary">Loading user history...</p></div></div>;
  if (!userData) return <div className="animate-fade-in p-8"><div className="card"><p style={{ color: 'var(--severity-critical)' }}>User not found.</p></div></div>;

  const latestScore = userData.history?.length > 0 ? userData.history[userData.history.length - 1].risk_score : 0;
  const initials = getInitials(userData.user_name);

  // Chart data
  const history = userData.history || [];
  const chartSlice = history.slice(-50);

  // Table data — reverse so most recent is first
  const tableData = [...history].reverse();
  const totalPages = Math.ceil(tableData.length / ITEMS_PER_PAGE);
  const paginatedData = tableData.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // SVG chart dimensions
  const svgW = 600, svgH = 200;
  const pad = { top: 15, right: 15, bottom: 35, left: 40 };
  const cw = svgW - pad.left - pad.right;
  const ch = svgH - pad.top - pad.bottom;
  const yTicks = [0, 25, 50, 75, 100];

  let chartSvg = null;
  if (chartSlice.length > 0) {
    const pts = chartSlice.map((p, i) => ({
      x: pad.left + (chartSlice.length === 1 ? cw / 2 : (i / (chartSlice.length - 1)) * cw),
      y: pad.top + ch - (Math.min(p.risk_score, 1) * ch),
      score: p.risk_score,
      time: formatTime(p.timestamp),
      fullTime: formatDateTime(p.timestamp),
    }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const labelInterval = Math.max(1, Math.floor(chartSlice.length / 8));

    chartSvg = (
      <svg viewBox={`0 0 ${svgW} ${svgH}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid */}
        {yTicks.map(v => {
          const y = pad.top + ch - (v / 100) * ch;
          return (
            <g key={`g-${v}`}>
              <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 3} textAnchor="end" fill="var(--chart-text)" fontSize="9" fontFamily="'JetBrains Mono', monospace">{v}</text>
            </g>
          );
        })}

        {/* Threshold at 40% (alert threshold) */}
        {(() => {
          const thY = pad.top + ch - 0.40 * ch;
          return (
            <>
              <line x1={pad.left} y1={thY} x2={svgW - pad.right} y2={thY}
                stroke="var(--severity-high)" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
              <text x={svgW - pad.right} y={thY - 5} textAnchor="end"
                fill="var(--severity-high)" fontSize="8" opacity="0.7">threshold</text>
            </>
          );
        })()}

        {/* Line */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Dots */}
        {pts.map((p, i) => {
          const sev = getSeverity(p.score);
          return (
            <g key={i}>
              <title>{`${p.fullTime}: ${(p.score * 100).toFixed(0)}%`}</title>
              <circle cx={p.x} cy={p.y} r="3.5" fill={sev.color} stroke="var(--bg-card)" strokeWidth="1.5" />
              {i % labelInterval === 0 && (
                <text x={p.x} y={pad.top + ch + 14} textAnchor="end" fill="var(--chart-text)" fontSize="8"
                  fontFamily="'JetBrains Mono', monospace" transform={`rotate(-40, ${p.x}, ${pad.top + ch + 14})`}>
                  {p.time}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top + ch} x2={svgW - pad.right} y2={pad.top + ch} stroke="var(--chart-grid)" strokeWidth="1" />
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={pad.top + ch} stroke="var(--chart-grid)" strokeWidth="1" />
      </svg>
    );
  }

  return (
    <div className="animate-fade-in pb-8">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>← Back</button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* User profile card */}
        <div className="card text-center">
          <div style={{
            ...getAvatarStyle(latestScore),
            width: '80px', height: '80px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem', fontWeight: '700', margin: '0 auto 1rem',
          }}>
            {initials}
          </div>
          <h1 className="text-xl font-bold mb-1">{userData.user_name}</h1>
          <p className="text-secondary mb-4">{userData.department}</p>
          <RiskGauge value={latestScore} />
        </div>

        {/* Timeline chart */}
        <div className="card">
          <h3 className="font-semibold text-lg mb-4">Risk Score Timeline</h3>
          {chartSlice.length > 0 ? chartSvg : (
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <div className="empty-text">No risk history data yet. Alerts will appear here as they are generated.</div>
            </div>
          )}
        </div>
      </div>

      {/* History table */}
      <div className="card">
        <h3 className="font-semibold text-lg mb-4">Recent Alert History</h3>
        {history.length > 0 ? (
          <>
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Risk Score</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((point, i) => {
                  const sev = getSeverity(point.risk_score);
                  const pct = Math.round(point.risk_score * 100);
                  return (
                    <tr key={i}>
                      <td className="text-muted font-mono text-sm">{formatDateTime(point.timestamp)}</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="font-mono" style={{ color: sev.color, fontWeight: '600', width: '30px' }}>{pct}%</span>
                          <div style={{ width: '80px', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: sev.color, borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      </td>
                      <td><SeverityBadge score={point.risk_score} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <div className="empty-text">No alerts recorded for this user yet.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHistoryPage;
