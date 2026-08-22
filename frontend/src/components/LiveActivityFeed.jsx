import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useApi } from '../hooks/useApi';
import { getSeverity, formatTime } from '../theme';

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
              time: formatTime(a.created_at),
            })));
          }
        })
        .catch(() => {});
    };
    fetchRecent();
    const interval = setInterval(fetchRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  const wsFormatted = wsAlerts.map(a => ({
    id: a.id,
    user_name: a.user_name || a.user,
    action_type: a.action_type || a.action || 'alert',
    risk_score: a.risk_score || a.risk,
    time: formatTime(a.created_at || a.time),
  }));

  const displayAlerts = wsFormatted.length > 0 ? wsFormatted : recentEvents;

  return (
    <div className="card h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg">Live Activity</h3>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: connected ? '#22C55E' : 'var(--severity-critical)',
          }}></span>
        </div>
      </div>

      <div className="alert-feed">
        {displayAlerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📡</div>
            <div className="empty-text">Monitoring for activity… Events will appear here as anomalies are detected.</div>
          </div>
        ) : (
          displayAlerts.map((item, idx) => {
            const sev = getSeverity(item.risk_score || 0);
            return (
              <div
                key={item.id || idx}
                className="flex items-start gap-3"
                style={{
                  borderLeft: `3px solid ${sev.color}`,
                  padding: '0.6rem 0.75rem',
                  background: 'var(--hover-bg)',
                  borderRadius: '0 6px 6px 0',
                }}
              >
                <div className="font-mono text-xs text-muted" style={{ whiteSpace: 'nowrap', marginTop: '2px' }}>
                  {item.time}
                </div>
                <div>
                  <div className="font-medium text-sm">{item.user_name}</div>
                  <div className="text-secondary text-xs">{item.action_type?.replace('_', ' ')}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
