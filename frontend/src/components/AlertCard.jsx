import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from './SeverityBadge';

const AlertCard = ({ alert }) => {
  const navigate = useNavigate();
  const sev = getSeverity(alert.risk_score);
  const initials = getInitials(alert.user_name);

  return (
    <div
      className="card"
      style={{
        borderLeft: `3px solid ${sev.color}`,
        cursor: 'pointer',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
      }}
      onClick={() => navigate(`/alerts/${alert.id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div style={{
            ...getAvatarStyle(alert.risk_score),
            width: '38px', height: '38px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: '700',
          }}>
            {initials}
          </div>
          <div>
            <h4 className="font-semibold">{alert.user_name}</h4>
            <div className="text-muted text-xs">{alert.department || alert.user_department}</div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="text-muted text-xs font-mono">{formatDateTime(alert.created_at || alert.timestamp)}</span>
          <SeverityBadge score={alert.risk_score} showScore />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: 'auto' }}>
        <div className="font-medium text-sm mb-1">{alert.event_details?.action_type?.replace('_', ' ') || 'Anomaly'}</div>
        <div className="text-secondary text-xs line-clamp-2">
          {alert.rule_details && Array.isArray(alert.rule_details) ? alert.rule_details.join(' • ') : 'Behavioral anomaly detected'}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
