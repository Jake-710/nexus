import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { getSeverity, formatTime } from '../theme';

const SVG_WIDTH = 600;
const SVG_HEIGHT = 200;
const PAD = { top: 15, right: 15, bottom: 35, left: 40 };
const CW = SVG_WIDTH - PAD.left - PAD.right;
const CH = SVG_HEIGHT - PAD.top - PAD.bottom;

const RiskTrendChart = () => {
  const { get } = useApi();
  const [data, setData] = useState([]);

  const getRef = useRef(get);
  useEffect(() => { getRef.current = get; }, [get]);

  const fetchData = useCallback(() => {
    getRef.current('/alerts/?limit=30')
      .then(res => {
        if (res.alerts && res.alerts.length > 0) {
          const points = [...res.alerts].reverse().map(a => ({
            time: formatTime(a.created_at),
            score: Math.round((Number(a.risk_score) || 0) * 100),
            user: a.user_name || 'Unknown'
          }));
          setData(points);
        }
      })
      .catch(err => console.error('RiskTrendChart fetch failed:', err));
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (data.length === 0) {
    return (
      <div className="card h-full">
        <h3 className="font-semibold text-lg mb-4">Risk Score Trend</h3>
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <div className="empty-text">Collecting risk data… Chart will populate as alerts are generated.</div>
        </div>
      </div>
    );
  }

  const maxScore = 100;
  const thresholdY = PAD.top + CH - (40 / maxScore) * CH;

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length === 1 ? CW / 2 : (i / (data.length - 1)) * CW),
    y: PAD.top + CH - (d.score / maxScore) * CH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const yTicks = [0, 25, 50, 75, 100];
  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="card h-full">
      <h3 className="font-semibold text-lg mb-4">Risk Score Trend</h3>
      <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} width="100%" style={{ display: 'block' }} preserveAspectRatio="xMidYMid meet">
        {/* Grid lines — use theme tokens */}
        {yTicks.map(v => {
          const y = PAD.top + CH - (v / maxScore) * CH;
          return (
            <g key={`grid-${v}`}>
              <line x1={PAD.left} y1={y} x2={SVG_WIDTH - PAD.right} y2={y}
                stroke="var(--chart-grid)" strokeWidth="1" />
              <text x={PAD.left - 8} y={y + 3} textAnchor="end"
                fill="var(--chart-text)" fontSize="9" fontFamily="'JetBrains Mono', monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* Threshold dashed line */}
        <line x1={PAD.left} y1={thresholdY} x2={SVG_WIDTH - PAD.right} y2={thresholdY}
          stroke="var(--severity-high)" strokeWidth="1" strokeDasharray="6 4" opacity="0.6" />
        <text x={SVG_WIDTH - PAD.right} y={thresholdY - 5} textAnchor="end"
          fill="var(--severity-high)" fontSize="8" opacity="0.7">
          threshold
        </text>

        {/* Line — accent color */}
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {/* Data dots */}
        {pts.map((p, i) => {
          const sev = getSeverity(p.score / 100);
          return (
            <g key={i}>
              <title>{`${p.time} – ${p.user}: ${p.score}%`}</title>
              <circle cx={p.x} cy={p.y} r="3.5" fill={sev.color} stroke="var(--bg-card)" strokeWidth="1.5" />
              {i % labelInterval === 0 && (
                <text x={p.x} y={PAD.top + CH + 14} textAnchor="end"
                  fill="var(--chart-text)" fontSize="8" fontFamily="'JetBrains Mono', monospace"
                  transform={`rotate(-40, ${p.x}, ${PAD.top + CH + 14})`}>
                  {p.time}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top + CH} x2={SVG_WIDTH - PAD.right} y2={PAD.top + CH}
          stroke="var(--chart-grid)" strokeWidth="1" />
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + CH}
          stroke="var(--chart-grid)" strokeWidth="1" />
      </svg>
    </div>
  );
};

export default RiskTrendChart;
