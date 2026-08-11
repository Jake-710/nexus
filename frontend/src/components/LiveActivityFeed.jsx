import React from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const LiveActivityFeed = () => {
  const { alerts, connected } = useWebSocket();
  
  const displayAlerts = alerts;

  const getRiskColor = (risk) => {
    if (risk === 'high' || risk >= 0.8) return 'var(--accent-red)';
    if (risk === 'medium' || risk >= 0.5) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Live Activity</h3>
          <span style={{ 
            width: '8px', height: '8px', borderRadius: '50%', 
            background: connected ? 'var(--accent-green)' : 'var(--accent-red)',
            boxShadow: `0 0 8px ${connected ? 'var(--accent-green)' : 'var(--accent-red)'}`
          }}></span>
        </div>
      </div>

      <div className="alert-feed pr-2">
        {displayAlerts.map((item, idx) => (
          <div 
            key={item.id || idx} 
            className="animate-slide-down flex items-start gap-4 p-3 rounded-lg"
            style={{ 
              background: 'rgba(255,255,255,0.02)',
              borderLeft: `2px solid ${getRiskColor(item.risk || item.risk_score)}`
            }}
          >
            <div className="text-xs text-muted mt-1 whitespace-nowrap" style={{ width: '60px' }}>
              {item.time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
            <div>
              <div className="font-medium text-sm">{item.user || item.user_name}</div>
              <div className="text-secondary text-sm">{item.action || item.action_type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
