import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';

const LiveActivityFeed = () => {
  const { alerts: wsAlerts, connected } = useWebSocket();
  const { get } = useApi();
  const [recentEvents, setRecentEvents] = useState([]);

  useEffect(() => {
    const fetchRecent = () => {
      get('/alerts/?limit=20')
        .then(data => {
          if (data.alerts && data.alerts.length > 0) {
            setRecentEvents(data.alerts.map(a => ({
              id: a.id,
              user_name: a.user_name,
              action_type: a.event_details?.action_type || 'activity',
              risk_score: a.risk_score,
              time: new Date(a.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            })));
          }
        })
        .catch(() => {});
    };
    fetchRecent();
    const interval = setInterval(fetchRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  // Merge WebSocket alerts with API alerts, WS alerts take priority
  const wsFormatted = wsAlerts.map(a => ({
    id: a.id,
    user_name: a.user_name || a.user,
    action_type: a.action_type || a.action || 'alert',
    risk_score: a.risk_score || a.risk,
    time: a.time || new Date(a.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
  }));

  const displayAlerts = wsFormatted.length > 0 ? wsFormatted : recentEvents;

  const getRiskColor = (risk) => {
    const score = typeof risk === 'number' ? risk : 0;
    if (score >= 0.8) return 'var(--accent-red)';
    if (score >= 0.5) return 'var(--accent-amber)';
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
        {displayAlerts.length === 0 ? (
          <p className="text-secondary text-sm">Monitoring for activity... Events will appear here as anomalies are detected.</p>
        ) : (
          displayAlerts.map((item, idx) => (
            <div 
              key={item.id || idx} 
              className="animate-slide-down flex items-start gap-4 p-3 rounded-lg"
              style={{ 
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `2px solid ${getRiskColor(item.risk_score)}`,
                marginBottom: '0.5rem'
              }}
            >
              <div className="text-xs text-muted mt-1 whitespace-nowrap" style={{ width: '60px' }}>
                {item.time}
              </div>
              <div>
                <div className="font-medium text-sm">{item.user_name}</div>
                <div className="text-secondary text-sm">{item.action_type?.replace('_', ' ')}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
