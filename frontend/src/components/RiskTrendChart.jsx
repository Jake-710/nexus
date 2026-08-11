import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const RiskTrendChart = () => {
  const { get } = useApi();
  const [data, setData] = useState([]);

  const fetchData = () => {
    get('/alerts/?limit=30')
      .then(res => {
        if (res.alerts && res.alerts.length > 0) {
          const points = [...res.alerts].reverse().map(a => ({
            time: new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            score: Math.round(a.risk_score * 100),
            user: a.user_name
          }));
          setData(points);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="card h-full">
      <h3 className="font-semibold text-lg mb-4">Risk Score Trend</h3>
      <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '3px', paddingBottom: '2rem', position: 'relative' }}>
        {/* Threshold line */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          bottom: `calc(${(40 / maxScore) * 100}% + 2rem)`,
          borderTop: '1px dashed rgba(255, 165, 2, 0.4)',
          zIndex: 1
        }}>
          <span style={{ position: 'absolute', right: 0, top: '-16px', fontSize: '0.6rem', color: 'var(--accent-amber)' }}>threshold</span>
        </div>
        
        {data.map((point, i) => {
          const height = (point.score / maxScore) * 100;
          const color = point.score >= 70 ? 'var(--accent-red)' : point.score >= 40 ? 'var(--accent-amber)' : 'var(--accent-green)';
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }} title={`${point.time} - ${point.user}: ${point.score}%`}>
              <div style={{
                width: '100%', maxWidth: '30px',
                height: `${Math.max(height, 4)}%`,
                background: `linear-gradient(to top, ${color}, ${color}88)`,
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.5s ease',
                boxShadow: `0 0 4px ${color}44`
              }}></div>
              {i % Math.max(1, Math.floor(data.length / 8)) === 0 && (
                <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '4px', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>{point.time}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RiskTrendChart;
