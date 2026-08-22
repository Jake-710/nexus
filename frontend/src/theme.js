// Severity tiers — SINGLE source of truth for the entire app
export const SEVERITY = {
  critical: { label: 'Critical', floor: 80, ceiling: 100, color: '#FF4747' },
  high:     { label: 'High',     floor: 60, ceiling: 79,  color: '#F2A654' },
  medium:   { label: 'Medium',   floor: 40, ceiling: 59,  color: '#FFC100' },
  low:      { label: 'Low',      floor: 0,  ceiling: 39,  color: '#248AFD' },
  none:     { label: 'None',     floor: -1, ceiling: -1,  color: '#A3A4A5' },
};

export const ACCENT = '#4B49AC';

// Score is 0-1 float → severity object
export function getSeverity(score) {
  if (score === undefined || score === null || isNaN(score)) return SEVERITY.none;
  const pct = Math.round(score * 100);
  if (pct >= 80) return SEVERITY.critical;
  if (pct >= 60) return SEVERITY.high;
  if (pct >= 40) return SEVERITY.medium;
  if (pct >= 0) return SEVERITY.low;
  return SEVERITY.none;
}

// CSS class name for badge
export function getBadgeClass(score) {
  if (score === undefined || score === null || isNaN(score)) return 'badge-none';
  const pct = Math.round(score * 100);
  if (pct >= 80) return 'badge-critical';
  if (pct >= 60) return 'badge-high';
  if (pct >= 40) return 'badge-medium';
  if (pct >= 0) return 'badge-low';
  return 'badge-none';
}

// Avatar inline style from score — tinted bg + colored text
export function getAvatarStyle(score) {
  const sev = getSeverity(score);
  return {
    backgroundColor: sev.color + '18',
    color: sev.color,
  };
}

// Initials from "First Last" → "FL"
export function getInitials(name) {
  if (!name || name === 'undefined' || name === 'NaN') return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Consistent date/time across the app
export function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

export function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
