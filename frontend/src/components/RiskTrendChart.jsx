import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

const SVG_WIDTH = 600;
const SVG_HEIGHT = 200;
const PAD = { top: 15, right: 15, bottom: 35, left: 35 };
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
            time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p className="text-secondary">Collecting risk data... Chart will populate as alerts are generated.</p>
        </div>
      </div>
    );
  }

  const maxScore = Math.max(...data.map(d => d.score), 100);
  const thresholdY = PAD.top + CH - (40 / maxScore) * CH;

  // Build points
  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length === 1 ? CW / 2 : (i / (data.length - 1)) * CW),
    y: PAD.top + CH - (d.score / maxScore) * CH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${PAD.top + CH} L${pts[0].x},${PAD.top + CH} Z`;

  // Y-axis labels
  const yTicks = [0, 25, 50, 75, 100].filter(v => v <= maxScore);
  const labelInterval = Math.max(1, Math.floor(data.length / 8));

  return (
    <div className="card h-full">
      <h3 className="font-semibold text-lg mb-4">Risk Score Trend</h3>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        width="100%"
        style={{ display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="trend-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff4757" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#ff4757" stopOpacity="0.02" />
          </linearGradient>
          <filter id="trend-line-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {yTicks.map(v => {
          const y = PAD.top + CH - (v / maxScore) * CH;
          return (
            <g key={`grid-${v}`}>
              <line x1={PAD.left} y1={y} x2={SVG_WIDTH - PAD.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
              <text x={PAD.left - 6} y={y + 3} textAnchor="end" fill="#6b7280" fontSize="8">{v}</text>
            </g>
          );
        })}

        {/* Threshold line */}
        <line
          x1={PAD.left} y1={thresholdY}
          x2={SVG_WIDTH - PAD.right} y2={thresholdY}
          stroke="rgba(255,165,2,0.5)" strokeWidth="1" strokeDasharray="6 4"
        />
        <text x={SVG_WIDTH - PAD.right} y={thresholdY - 5} textAnchor="end" fill="#ffa502" fontSize="8" opacity="0.7">
          threshold
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#trend-area-fill)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#ff4757"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#trend-line-glow)"
        />

        {/* Data dots */}
        {pts.map((p, i) => {
          const dotColor = p.score >= 70 ? '#ff4757' : p.score >= 40 ? '#ffa502' : '#2ed573';
          return (
            <g key={i}>
              <title>{`${p.time} – ${p.user}: ${p.score}%`}</title>
              <circle cx={p.x} cy={p.y} r="4" fill={dotColor} stroke="#0a0e1a" strokeWidth="1.5" />
              {/* X-axis labels */}
              {i % labelInterval === 0 && (
                <text
                  x={p.x} y={PAD.top + CH + 14}
                  textAnchor="end" fill="#6b7280" fontSize="8"
                  transform={`rotate(-40, ${p.x}, ${PAD.top + CH + 14})`}
                >
                  {p.time}
                </text>
              )}
            </g>
          );
        })}

        {/* Bottom axis */}
        <line
          x1={PAD.left} y1={PAD.top + CH}
          x2={SVG_WIDTH - PAD.right} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1"
        />
        {/* Left axis */}
        <line
          x1={PAD.left} y1={PAD.top}
          x2={PAD.left} y2={PAD.top + CH}
          stroke="rgba(255,255,255,0.1)" strokeWidth="1"
        />
      </svg>
    </div>
  );
};

export default RiskTrendChart;
