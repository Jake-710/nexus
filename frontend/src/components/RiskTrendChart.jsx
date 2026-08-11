import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const RiskTrendChart = () => {
  const { get } = useApi();
  const [data, setData] = useState([]);

  useEffect(() => {
    get('/alerts/?limit=24')
      .then(res => {
        if (res.alerts && res.alerts.length > 0) {
          const points = res.alerts.reverse().map(a => ({
            time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            score: Math.round(a.risk_score * 100)
          }));
          setData(points);
        } else {
          // Default placeholder data
          setData(Array.from({ length: 12 }, (_, i) => ({ time: `${i + 8}:00`, score: Math.floor(Math.random() * 20 + 10) })));
        }
      })
      .catch(() => {
        setData(Array.from({ length: 12 }, (_, i) => ({ time: `${i + 8}:00`, score: Math.floor(Math.random() * 20 + 10) })));
      });
  }, []);

  const maxScore = Math.max(...data.map(d => d.score), 100);

  return (
    <div className="card h-full">
      <h3 className="font-semibold text-lg mb-4">Risk Score Trend</h3>
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', paddingBottom: '2rem', position: 'relative' }}>
        {data.map((point, i) => {
          const height = (point.score / maxScore) * 100;
          const color = point.score >= 80 ? 'var(--accent-red)' : point.score >= 50 ? 'var(--accent-amber)' : 'var(--accent-cyan)';
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${point.time}: ${point.score}%`}>
              <div style={{
                width: '100%', maxWidth: '40px',
                height: `${Math.max(height, 5)}%`,
                background: `linear-gradient(to top, ${color}, ${color}88)`,
                borderRadius: '4px 4px 0 0',
                transition: 'height 0.5s ease'
              }}></div>
              <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '4px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{point.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskTrendChart;
