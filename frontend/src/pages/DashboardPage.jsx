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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">SOC Dashboard</h1>
          <p className="text-secondary">Overview of user and entity behavior analytics.</p>
        </div>
        <div className="text-sm text-muted bg-black/20 px-4 py-2 rounded-full border border-white/5">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      <StatsCards />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <RiskGauge value={avgRisk} />
        <RiskTrendChart />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
        <RiskLeaderboard />
        <LiveActivityFeed />
      </div>
    </div>
  );
};

export default DashboardPage;
