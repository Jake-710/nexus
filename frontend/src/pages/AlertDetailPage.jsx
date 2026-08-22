import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import RiskGauge from '../components/RiskGauge';

const AlertDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get } = useApi();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `Alert Detail — UEBA`;
    get(`/alerts/${id}`)
      .then(data => setAlert(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="animate-fade-in p-8"><div className="card"><p className="text-secondary">Loading alert details...</p></div></div>;
  if (!alert) return <div className="animate-fade-in p-8"><div className="card"><p style={{ color: 'var(--severity-critical)' }}>Alert not found.</p></div></div>;

  const sev = getSeverity(alert.risk_score);
  const initials = getInitials(alert.user_name);

  // Score breakdown colors
  const mlColor = getSeverity(alert.ml_score).color;
  const ruleColor = getSeverity(alert.rule_score).color;
  const blendedColor = sev.color;

  return (
    <div className="animate-fade-in pb-8">
      <button className="btn btn-ghost mb-4" onClick={() => navigate(-1)}>← Back to Alerts</button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {/* Main detail card */}
        <div className="card">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold mb-1">{alert.event_details?.action_type?.replace('_', ' ').toUpperCase() || 'Alert'} Anomaly</h1>
              <div className="flex gap-3 text-sm text-secondary">
                <span className="font-mono">ID: {String(alert.id).slice(0, 8)}…</span>
                <span>•</span>
                <span className="font-mono">{formatDateTime(alert.created_at)}</span>
              </div>
            </div>
            <SeverityBadge score={alert.risk_score} />
          </div>

          {/* Triggered rules */}
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-muted mb-3 uppercase text-xs tracking-wider">Triggered Rules</h3>
            <ul className="flex flex-col gap-2">
              {alert.rule_details && Array.isArray(alert.rule_details) ? alert.rule_details.map((rule, i) => (
                <li key={i} className="flex gap-2 items-center text-sm">
                  <span style={{ color: 'var(--severity-critical)' }}>●</span> {rule}
                </li>
              )) : <li className="text-secondary text-sm">No rules triggered</li>}
            </ul>
          </div>

          {/* Score breakdown with color coding */}
          <div className="mb-4 p-4 rounded-lg" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <h3 className="font-semibold text-muted mb-3 uppercase text-xs tracking-wider">Score Breakdown</h3>
            <div className="flex gap-6">
              <div>
                <span className="text-muted text-xs">ML Score</span>
                <div className="font-mono text-xl font-bold" style={{ color: mlColor }}>{(alert.ml_score * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-muted text-xs">Rule Score</span>
                <div className="font-mono text-xl font-bold" style={{ color: ruleColor }}>{(alert.rule_score * 100).toFixed(0)}%</div>
              </div>
              <div>
                <span className="text-muted text-xs">Blended</span>
                <div className="font-mono text-xl font-bold" style={{ color: blendedColor }}>{(alert.risk_score * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* Event details table */}
          <div>
            <h3 className="font-semibold text-muted mb-3 uppercase text-xs tracking-wider">Event Details</h3>
            <table className="table w-full text-sm">
              <tbody>
                <tr><td className="text-muted" style={{ width: '35%' }}>Action Type</td><td>{alert.event_details?.action_type}</td></tr>
                <tr><td className="text-muted">Source IP</td><td className="font-mono">{alert.event_details?.src_ip}</td></tr>
                <tr><td className="text-muted">Resource</td><td>{alert.event_details?.resource_id || '—'}</td></tr>
                <tr><td className="text-muted">Volume</td><td>{alert.event_details?.volume_mb ? `${alert.event_details.volume_mb.toFixed(1)} MB` : '—'}</td></tr>
                <tr><td className="text-muted">Location</td><td>{alert.event_details?.geo_location || '—'}</td></tr>
                <tr><td className="text-muted">Timestamp</td><td className="font-mono">{formatDateTime(alert.event_details?.timestamp)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: user profile + gauge */}
        <div className="flex flex-col gap-4">
          <div className="card text-center">
            <div style={{
              ...getAvatarStyle(alert.risk_score),
              width: '72px', height: '72px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: '700', margin: '0 auto 1rem',
            }}>
              {initials}
            </div>
            <h2 className="text-xl font-bold">{alert.user_name}</h2>
            <p className="text-secondary mb-4">{alert.user_department}</p>
            <button className="btn btn-primary w-full" onClick={() => navigate(`/users/${alert.user_id}`)}>View Full History</button>
          </div>

          <RiskGauge value={alert.risk_score} />
        </div>
      </div>

      {/* AI Narrative section */}
      <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 mb-3">
          <span style={{ fontSize: '1.25rem' }}>✦</span>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--accent)' }}>AI Security Narrative</h3>
        </div>
        <p className="text-secondary leading-relaxed text-sm">
          {alert.genai_narrative || 'AI analysis will be available in the next release. The system is currently gathering baseline behavioral metrics to generate accurate natural language summaries.'}
        </p>
      </div>
    </div>
  );
};

export default AlertDetailPage;
