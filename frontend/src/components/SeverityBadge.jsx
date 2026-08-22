import React from 'react';
import { getSeverity, getBadgeClass } from '../theme';

/**
 * Shared severity badge — use this component everywhere:
 * AlertCard, AlertDetailPage, UsersPage, UserHistoryPage, RiskLeaderboard, etc.
 *
 * Props:
 *   score  — 0-1 float (risk_score from API)
 *   label  — optional override text (defaults to severity label)
 *   showScore — if true, prepend the numeric score
 */
const SeverityBadge = ({ score, label, showScore = false }) => {
  const sev = getSeverity(score);
  const cls = getBadgeClass(score);
  const pct = Math.round((score || 0) * 100);
  const text = label || sev.label;

  return (
    <span className={`badge ${cls}`}>
      {showScore ? `${pct} — ${text}` : text}
    </span>
  );
};

export default SeverityBadge;
