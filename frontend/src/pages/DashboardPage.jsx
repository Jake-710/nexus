import React, { useEffect, useState } from 'react';
import StatsCards from '../components/StatsCards';
import RiskGauge from '../components/RiskGauge';
import RiskTrendChart from '../components/RiskTrendChart';
import RiskLeaderboard from '../components/RiskLeaderboard';
import LiveActivityFeed from '../components/LiveActivityFeed';
import { useApi } from '../hooks/useApi';

const DashboardPage = () => {
  const { get } = useApi();
  const [avgRisk, setAvgRisk] = useState(0);

  useEffect(() => {
    document.title = 'Dashboard — UEBA';
    const fetchAvgRisk = () => {
      get('/alerts/stats')
        .then(data => setAvgRisk(data.avg_risk_score || 0))
        .catch(() => {});
    };
    fetchAvgRisk();
    const interval = setInterval(fetchAvgRisk, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in pb-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">SOC Dashboard</h1>
          <p className="text-secondary text-sm">Overview of user and entity behavior analytics.</p>
        </div>
        <div className="text-xs text-muted font-mono" style={{
          padding: '0.4rem 0.75rem', borderRadius: '6px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        }}>
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <StatsCards />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
        <RiskGauge value={avgRisk} />
        <RiskTrendChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
        <RiskLeaderboard />
        <LiveActivityFeed />
      </div>
    </div>
  );
};

export default DashboardPage;
