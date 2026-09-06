import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { getSeverity, getInitials, getAvatarStyle, formatDateTime } from '../theme';
import SeverityBadge from '../components/SeverityBadge';
import RiskGauge from '../components/RiskGauge';

const STATUS_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'false_positive', label: 'False Positive' },
];

const AlertDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, patch, post } = useApi();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('new');
  const [savingStatus, setSavingStatus] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    document.title = `Alert Detail — UEBA`;
    get(`/alerts/${id}`)
      .then(data => { setAlert(data); setStatus(data.status || 'new'); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setSavingStatus(true);
    patch(`/alerts/${id}/status`, { status: newStatus })
      .then(data => setAlert(data))
      .catch(err => console.error('Failed to update status:', err))
      .finally(() => setSavingStatus(false));
  };

  const submitFeedback = (verdict) => {
    setSubmittingFeedback(true);
    setFeedbackMsg('');
    post(`/alerts/${id}/feedback`, { verdict, notes: notes.trim() || null })
      .then(res => {
        setFeedbackMsg(verdict === 'confirmed_threat' ? 'Recorded as confirmed threat.' : 'Recorded as false positive.');
        setStatus(res.alert_status || status);
        setNotes('');
      })
      .catch(err => setFeedbackMsg('Failed to submit feedback: ' + (err.message || 'error')))
      .finally(() => setSubmittingFeedback(false));
  };

  // Parse cached MITRE tags (stored as a JSON string on the alert)
  let mitreTags = [];
  if (alert && alert.mitre_tags) {
    try { mitreTags = JSON.parse(alert.mitre_tags) || []; } catch (e) { mitreTags = []; }
  }

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
            <div className="flex flex-col items-end gap-2">
              <SeverityBadge score={alert.risk_score} />
              <select
                className="select"
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={savingStatus}
                style={{ fontSize: '0.8rem', padding: '0.3rem 0.5rem' }}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {savingStatus && <span className="text-muted text-xs">Saving…</span>}
            </div>
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

            {/* MITRE ATT&CK mapping */}
            {mitreTags.length > 0 && (
              <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid var(--border)' }}>
                <div className="text-muted uppercase text-xs tracking-wider mb-2" style={{ fontWeight: 600 }}>
                  MITRE ATT&CK
                </div>
                <div className="flex flex-wrap gap-2">
                  {mitreTags.map((t) => (
                    <span
                      key={t.id}
                      title={`${t.tactic} — ${t.name}`}
                      className="badge"
                      style={{
                        background: 'var(--accent)18', color: 'var(--accent)',
                        border: '1px solid var(--accent)', fontSize: '0.72rem', fontWeight: 600,
                      }}
                    >
                      {t.id} · {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
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

      {/* AI Analysis — Problem & Solution */}
      {(() => {
        let analysis = null;
        if (alert.genai_narrative) {
          try { analysis = JSON.parse(alert.genai_narrative); } catch { /* legacy plain text */ }
        }
        return (
          <div className="card" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3 mb-4">
              <span style={{ fontSize: '1.25rem' }}>✦</span>
              <h3 className="font-semibold text-lg" style={{ color: 'var(--accent)' }}>AI Security Analysis</h3>
            </div>

            {analysis && analysis.problem ? (
              <div className="flex flex-col gap-4">
                {/* Problem */}
                <div className="p-4 rounded-lg" style={{ background: 'rgba(255, 71, 71, 0.06)', border: '1px solid rgba(255, 71, 71, 0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: 'var(--severity-critical)', fontSize: '0.85rem', fontWeight: '700' }}>⚠</span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--severity-critical)' }}>Problem</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {analysis.problem}
                  </p>
                </div>

                {/* Solution */}
                <div className="p-4 rounded-lg" style={{ background: 'rgba(36, 138, 253, 0.06)', border: '1px solid rgba(36, 138, 253, 0.15)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color: 'var(--severity-low)', fontSize: '0.85rem', fontWeight: '700' }}>✓</span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--severity-low)' }}>Recommended Action</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                    {analysis.solution}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-secondary leading-relaxed text-sm">
                {alert.genai_narrative || 'AI analysis is being generated. Refresh in a moment.'}
              </p>
            )}
          </div>
        );
      })()}

      {/* Analyst Decision Center */}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h3 className="font-semibold text-lg mb-3">Analyst Decision</h3>
        <p className="text-secondary text-sm mb-3">
          Record your verdict on this alert. Confirmed threats and false positives feed the model retraining pipeline.
        </p>
        <textarea
          className="input"
          placeholder="Optional investigation notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', marginBottom: '0.85rem', fontFamily: 'inherit' }}
        />
        <div className="flex gap-3 items-center flex-wrap">
          <button
            className="btn btn-primary"
            onClick={() => submitFeedback('confirmed_threat')}
            disabled={submittingFeedback}
            style={{ background: 'var(--severity-critical)', borderColor: 'var(--severity-critical)' }}
          >
            Confirm Threat
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => submitFeedback('false_positive')}
            disabled={submittingFeedback}
          >
            Mark False Positive
          </button>
          {feedbackMsg && <span className="text-sm" style={{ color: 'var(--accent)' }}>{feedbackMsg}</span>}
        </div>
      </div>
    </div>
  );
};

export default AlertDetailPage;
