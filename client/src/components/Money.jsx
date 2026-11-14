import React from 'react';

/**
 * Format number into Indian comma grouping (e.g., ₹1,25,000)
 */
export function formatIndianCurrency(amount) {
  const num = Math.round(Number(amount) || 0);
  const isNegative = num < 0;
  const absVal = Math.abs(num).toString();

  if (absVal.length <= 3) {
    return (isNegative ? '-₹' : '₹') + absVal;
  }

  const last3 = absVal.slice(-3);
  const remaining = absVal.slice(0, -3);
  const formattedRemaining = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (isNegative ? '-₹' : '₹') + formattedRemaining + ',' + last3;
}

/**
 * Money component
 * Indian grouping like ₹1,25,000, IBM Plex Mono, right-aligned in tables
 */
export function Money({ amount, className = '', highlightZero = false }) {
  const num = Number(amount) || 0;
  const formatted = formatIndianCurrency(num);

  return (
    <span
      className={`font-mono text-15 tracking-tight tabular-nums ${
        num === 0 && highlightZero ? 'text-muted' : 'text-ink'
      } ${className}`}
    >
      {formatted}
    </span>
  );
}

export default Money;

