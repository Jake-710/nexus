import React, { useEffect, useState } from 'react';
import { getSeverity } from '../theme';

const RiskGauge = ({ value = 0 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const severity = getSeverity(animatedValue);
  const color = severity.color;

  // Semicircular arc math
  const radius = 72;
  const circumference = radius * Math.PI;
  const offset = circumference - (animatedValue * circumference);
  const pct = Math.round(animatedValue * 100);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h3 className="text-muted text-xs font-semibold uppercase tracking-wider mb-3">Current Risk Level</h3>

      <div className="risk-gauge-container">
        <svg width="180" height="100" viewBox="0 0 180 100">
          {/* Background arc */}
          <path
            d="M 18 90 A 72 72 0 0 1 162 90"
            fill="none"
            stroke="var(--border)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 18 90 A 72 72 0 0 1 162 90"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s' }}
          />
        </svg>
        {/* Center score */}
        <div style={{
          position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)',
          textAlign: 'center',
        }}>
          <div className="font-mono" style={{ fontSize: '2rem', fontWeight: '700', color, lineHeight: 1 }}>
            {pct}
          </div>
        </div>
      </div>
      <div className="text-muted text-xs mt-1">Score out of 100</div>
    </div>
  );
};

export default RiskGauge;
