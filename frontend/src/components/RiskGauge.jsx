import React, { useEffect, useState } from 'react';

const RiskGauge = ({ value = 0.45 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    setTimeout(() => setAnimatedValue(value), 300);
  }, [value]);

  const radius = 80;
  const circumference = radius * Math.PI; // Semicircle
  const strokeDashoffset = circumference - (animatedValue * circumference);
  
  let color = 'var(--accent-green)';
  let glow = 'rgba(46, 213, 115, 0.5)';
  if (value > 0.7) {
    color = 'var(--accent-red)';
    glow = 'rgba(255, 71, 87, 0.5)';
  } else if (value > 0.4) {
    color = 'var(--accent-amber)';
    glow = 'rgba(255, 165, 2, 0.5)';
  }

  const isCritical = value > 0.8;

  return (
    <div className="card flex-col items-center justify-center h-full">
      <h3 className="text-muted mb-4 font-semibold uppercase tracking-wider text-sm">System Risk Level</h3>
      
      <div className={`risk-gauge-container ${isCritical ? 'animate-pulse' : ''}`} style={{ height: '120px' }}>
        <svg width="200" height="120" viewBox="0 0 200 120">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--bg-secondary)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          {/* Foreground Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={color}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ 
              transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.5s',
              filter: `drop-shadow(0 0 8px ${glow})`
            }}
          />
        </svg>
        
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '2.5rem', fontWeight: '700', color, textShadow: `0 0 15px ${glow}` }}>
            {Math.round(animatedValue * 100)}
          </div>
        </div>
      </div>
      <div className="text-muted text-sm mt-2">Score out of 100</div>
    </div>
  );
};

export default RiskGauge;
