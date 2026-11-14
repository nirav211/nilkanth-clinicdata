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

  const day = d.getDate();
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
}

export function DateText({ date, className = '' }) {
  return (
    <span className={`text-15 text-ink ${className}`}>
      {formatDate(date)}
    </span>
  );
}

export default DateText;

