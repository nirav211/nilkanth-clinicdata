import React from 'react';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format date to format: "12 Nov 2026"
 */
export function formatDate(input) {
  if (!input) return '—';

  // If string formatted as 'YYYY-MM-DD'
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}/.test(input)) {
    const parts = input.slice(0, 10).split('-');
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return `${day} ${MONTH_NAMES[monthIdx]} ${year}`;
  }

  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
}

/**
 * Format date and time in Asia/Kolkata: "14 Nov 2026, 5:08 pm"
 */
export function formatDateTime(input) {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return '—';

  const dateStr = d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).toLowerCase();

  return `${dateStr}, ${timeStr}`;
}

export function DateText({ date, className = '' }) {
  return (
    <span className={`text-15 text-ink ${className}`}>
      {formatDate(date)}
    </span>
  );
}

export function DateTimeText({ date, className = '' }) {
  return (
    <span className={`text-13 text-ink ${className}`}>
      {formatDateTime(date)}
    </span>
  );
}

export default DateText;
