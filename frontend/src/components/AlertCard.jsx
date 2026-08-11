import React from 'react';
import { useNavigate } from 'react-router-dom';

const AlertCard = ({ alert }) => {
  const navigate = useNavigate();
  
  const getSeverityStyle = (score) => {
    if (score >= 0.8) return { color: 'var(--accent-red)', badge: 'badge-critical' };
    if (score >= 0.5) return { color: 'var(--accent-amber)', badge: 'badge-warning' };
    return { color: 'var(--accent-green)', badge: 'badge-low' };
  };

  const severity = getSeverityStyle(alert.risk_score);

  return (
    <div 
      className="card animate-slide-in"
      style={{
        borderLeft: `4px solid ${severity.color}`,
        cursor: 'pointer',
        padding: '1.25rem',
        position: 'relative',
        overflow: 'hidden'
      }}
      onClick={() => navigate(`/alerts/${alert.id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            fontWeight: 'bold', color: severity.color,
            boxShadow: `inset 0 0 10px ${severity.color}33`
          }}>
            {alert.user_name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h4 className="font-semibold text-lg">{alert.user_name}</h4>
            <div className="text-muted text-sm">{alert.department}</div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <span className="text-muted text-xs">{alert.timestamp}</span>
          <span className={`badge ${severity.badge}`}>Score: {Math.round(alert.risk_score * 100)}</span>
        </div>
      </div>

      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        <div className="font-medium mb-1">{alert.action_type}</div>
        <p className="text-secondary text-sm line-clamp-2">{alert.description}</p>
      </div>
    </div>
  );
};

export default AlertCard;
