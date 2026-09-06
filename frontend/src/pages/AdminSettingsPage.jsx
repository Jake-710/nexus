import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';
import { formatDateTime } from '../theme';

const FIELDS = [
  { key: 'alert_threshold', label: 'Alert Threshold', hint: 'Minimum blended score to raise an alert' },
  { key: 'ml_weight', label: 'ML Weight', hint: 'Weight of the Isolation Forest score' },
  { key: 'rule_weight', label: 'Rule Weight', hint: 'Weight of the deterministic rule score' },
  { key: 'severity_low', label: 'Low → Medium boundary', hint: 'Score at which severity becomes Medium' },
  { key: 'severity_medium', label: 'Medium → High boundary', hint: 'Score at which severity becomes High' },
  { key: 'severity_high', label: 'High → Critical boundary', hint: 'Score at which severity becomes Critical' },
];

const AdminSettingsPage = () => {
  const { get, put, post } = useApi();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [retraining, setRetraining] = useState(false);
  const [retrainMsg, setRetrainMsg] = useState('');
  const [logs, setLogs] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);

  const loadAll = () => {
    Promise.all([
      get('/admin/config').then(setConfig).catch(() => {}),
      get('/admin/training-logs').then((d) => setLogs(Array.isArray(d) ? d : [])).catch(() => {}),
      get('/admin/feedback-stats').then(setFeedbackStats).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    document.title = 'Admin Settings — UEBA';
    loadAll();
  }, []);

  const handleField = (key, value) => {
    setConfig((c) => ({ ...c, [key]: value }));
  };

  const saveConfig = () => {
    setSaving(true);
    setSaveMsg('');
    const payload = {};
    FIELDS.forEach((f) => { payload[f.key] = parseFloat(config[f.key]); });
    put('/admin/config', payload)
      .then((data) => { setConfig(data); setSaveMsg('Configuration saved and applied.'); })
      .catch((err) => setSaveMsg('Failed to save: ' + (err.message || 'error')))
      .finally(() => setSaving(false));
  };

  const retrain = () => {
    setRetraining(true);
    setRetrainMsg('');
    post('/admin/retrain', { triggered_by: 'manual' })
      .then((res) => {
        setRetrainMsg(res.message || 'Retraining complete.');
        get('/admin/training-logs').then((d) => setLogs(Array.isArray(d) ? d : [])).catch(() => {});
      })
      .catch((err) => setRetrainMsg('Retraining failed: ' + (err.message || 'error')))
      .finally(() => setRetraining(false));
  };

  if (loading) return <div className="animate-fade-in p-8"><div className="card"><p className="text-secondary">Loading admin settings…</p></div></div>;

  const lastLog = logs[0];

  return (
    <div className="animate-fade-in pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Admin Settings</h1>
        <p className="text-secondary text-sm">Configure detection thresholds and manage the anomaly detection model.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
        {/* Threshold Configuration */}
        <div className="card">
          <h3 className="font-semibold text-lg mb-1">Threshold Configuration</h3>
          <p className="text-secondary text-sm mb-4">Values between 0 and 1. Changes apply immediately to new scoring.</p>
          <div className="flex flex-col gap-3">
            {config && FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium" style={{ display: 'block', marginBottom: '0.25rem' }}>{f.label}</label>
                <input
                  type="number" min="0" max="1" step="0.01"
                  className="input"
                  style={{ width: '100%' }}
                  value={config[f.key] ?? ''}
                  onChange={(e) => handleField(f.key, e.target.value)}
                />
                <div className="text-muted text-xs" style={{ marginTop: '0.2rem' }}>{f.hint}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
              {saving ? 'Saving…' : 'Save Configuration'}
            </button>
            {saveMsg && <span className="text-sm" style={{ color: 'var(--accent)' }}>{saveMsg}</span>}
          </div>
          {config?.updated_at && (
            <div className="text-muted text-xs" style={{ marginTop: '0.75rem' }}>
              Last updated {formatDateTime(config.updated_at)}{config.updated_by ? ` by ${config.updated_by}` : ''}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Model Retraining */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-1">Model Retraining</h3>
            <p className="text-secondary text-sm mb-4">Rebuild the Isolation Forest models from recent event history.</p>
            <div className="flex items-center gap-3 mb-3">
              <button className="btn btn-primary" onClick={retrain} disabled={retraining}>
                {retraining ? 'Retraining…' : 'Retrain Model'}
              </button>
              {retrainMsg && <span className="text-sm" style={{ color: 'var(--accent)' }}>{retrainMsg}</span>}
            </div>
            {lastLog ? (
              <div className="text-sm text-secondary">
                Last trained {formatDateTime(lastLog.trained_at)} · {lastLog.samples_used} samples
                {lastLog.avg_score_before != null && lastLog.avg_score_after != null && (
                  <> · avg score {(lastLog.avg_score_before * 100).toFixed(0)}% → {(lastLog.avg_score_after * 100).toFixed(0)}%</>
                )}
              </div>
            ) : (
              <div className="text-muted text-sm">No training runs recorded yet.</div>
            )}
          </div>

          {/* Feedback Stats */}
          <div className="card">
            <h3 className="font-semibold text-lg mb-4">Analyst Feedback</h3>
            <div className="flex gap-4">
              <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--severity-critical)' }}>{feedbackStats?.confirmed_threats ?? 0}</div>
                <div className="text-muted text-xs">Confirmed Threats</div>
              </div>
              <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>{feedbackStats?.false_positives ?? 0}</div>
                <div className="text-muted text-xs">False Positives</div>
              </div>
              <div className="stat-card" style={{ flex: 1, textAlign: 'center' }}>
                <div className="text-2xl font-bold">{feedbackStats?.total ?? 0}</div>
                <div className="text-muted text-xs">Total Reviewed</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Training history table */}
      <div className="card" style={{ marginTop: '1rem', padding: 0, overflow: 'hidden' }}>
        <h3 className="font-semibold text-lg" style={{ padding: '1.5rem 1.5rem 1rem' }}>Training History</h3>
        {logs.length > 0 ? (
          <table className="table w-full">
            <thead>
              <tr>
                <th>Trained At</th>
                <th>Peer Group</th>
                <th>Samples</th>
                <th>Avg Before</th>
                <th>Avg After</th>
                <th>Trigger</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="text-muted font-mono text-sm">{formatDateTime(l.trained_at)}</td>
                  <td>{l.peer_group_id ?? '—'}</td>
                  <td>{l.samples_used}</td>
                  <td className="font-mono">{l.avg_score_before != null ? `${(l.avg_score_before * 100).toFixed(0)}%` : '—'}</td>
                  <td className="font-mono">{l.avg_score_after != null ? `${(l.avg_score_after * 100).toFixed(0)}%` : '—'}</td>
                  <td>{l.triggered_by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <div className="empty-icon">🧠</div>
            <div className="empty-text">No training runs yet. Click “Retrain Model” once the simulator has produced enough events.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSettingsPage;
