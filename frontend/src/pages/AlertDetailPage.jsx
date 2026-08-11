import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
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
  if (!alert) return <div className="animate-fade-in p-8"><div className="card"><p className="text-red">Alert not found.</p></div></div>;

  const riskLevel = alert.risk_score >= 0.8 ? 'Critical' : alert.risk_score >= 0.5 ? 'High' : 'Medium';
  const badgeClass = alert.risk_score >= 0.8 ? 'badge-critical' : 'badge-warning';
  const initials = alert.user_name ? alert.user_name.split(' ').map(n => n[0]).join('') : '?';

  return (
    <div className="animate-fade-in pb-8">
      <button className="btn btn-ghost mb-6" onClick={() => navigate(-1)}>
        ← Back to Alerts
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-1">{alert.event_details?.action_type?.replace('_', ' ').toUpperCase() || 'Alert'} Anomaly</h1>
              <div className="flex gap-3 text-sm text-secondary">
                <span>Alert ID: {String(alert.id).slice(0, 8)}...</span> • <span>{new Date(alert.created_at).toLocaleString()}</span>
              </div>
            </div>
            <span className={`badge ${badgeClass} text-base px-4 py-2`}>{riskLevel} Risk</span>
          </div>

          <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-semibold text-muted mb-3 uppercase text-sm tracking-wider">Triggered Rules</h3>
            <ul className="flex flex-col gap-2">
              {alert.rule_details && Array.isArray(alert.rule_details) ? alert.rule_details.map((rule, i) => (
                <li key={i} className="flex gap-2 items-center"><span className="text-red">●</span> {rule}</li>
              )) : <li className="text-secondary">No rules triggered</li>}
            </ul>
          </div>

          <div className="mb-6 p-4 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-semibold text-muted mb-3 uppercase text-sm tracking-wider">Score Breakdown</h3>
            <div className="flex gap-6">
              <div><span className="text-muted text-sm">ML Score</span><div className="text-xl font-bold text-cyan">{(alert.ml_score * 100).toFixed(0)}%</div></div>
              <div><span className="text-muted text-sm">Rule Score</span><div className="text-xl font-bold text-amber">{(alert.rule_score * 100).toFixed(0)}%</div></div>
              <div><span className="text-muted text-sm">Blended</span><div className="text-xl font-bold text-red">{(alert.risk_score * 100).toFixed(0)}%</div></div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-muted mb-3 uppercase text-sm tracking-wider">Event Details</h3>
            <table className="table w-full text-sm">
              <tbody>
                <tr><td className="text-muted w-1/3">Action Type</td><td>{alert.event_details?.action_type}</td></tr>
                <tr><td className="text-muted">Source IP</td><td className="font-mono">{alert.event_details?.src_ip}</td></tr>
                <tr><td className="text-muted">Resource</td><td>{alert.event_details?.resource_id || 'N/A'}</td></tr>
                <tr><td className="text-muted">Volume</td><td>{alert.event_details?.volume_mb ? `${alert.event_details.volume_mb.toFixed(1)} MB` : 'N/A'}</td></tr>
                <tr><td className="text-muted">Location</td><td>{alert.event_details?.geo_location || 'N/A'}</td></tr>
                <tr><td className="text-muted">Timestamp</td><td>{new Date(alert.event_details?.timestamp).toLocaleString()}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: '1.5rem' }}>
          <div className="card text-center">
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--accent-purple)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: '2rem',
              fontWeight: 'bold', margin: '0 auto 1rem'
            }}>
              {initials}
            </div>
            <h2 className="text-xl font-bold">{alert.user_name}</h2>
            <p className="text-secondary mb-4">{alert.user_department}</p>
            <button className="btn btn-ghost w-full" onClick={() => navigate(`/users/${alert.user_id}`)}>View Full History</button>
          </div>
          
          <RiskGauge value={alert.risk_score} />
        </div>
      </div>

      {/* GenAI Section */}
      <div className="card" style={{ 
        background: 'linear-gradient(145deg, rgba(17,24,39,0.9), rgba(0,212,255,0.05))',
        border: '1px solid var(--border-glow)' 
      }}>
        <div className="flex items-center gap-3 mb-4">
          <span style={{ fontSize: '1.5rem' }}>✨</span>
          <h3 className="font-semibold text-lg text-cyan">AI Security Narrative</h3>
        </div>
        <p className="text-secondary leading-relaxed">
          {alert.genai_narrative || 'AI analysis will be available in the next release. The system is currently gathering baseline behavioral metrics to generate accurate natural language summaries.'}
        </p>
      </div>
    </div>
  );
};

export default AlertDetailPage;
