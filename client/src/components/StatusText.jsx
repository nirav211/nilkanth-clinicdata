import React from 'react';

/**
 * StatusText component
 * Plain text with a small coloured dot, not a pill.
 * Dot colors:
 * - Settled / Paid / Completed -> green (#0B6E4F)
 * - Pending / Unpaid / Due -> red (#B42318)
 * - Partial / Advance -> amber (#B7791F)
 */
export function StatusText({ status, className = '' }) {
  const norm = (status || '').toLowerCase().trim();

  let dotColor = '#5F6B66'; // default muted

  if (norm === 'settled' || norm === 'paid' || norm === 'completed') {
    dotColor = '#0B6E4F'; // brand green
  } else if (norm === 'pending' || norm === 'unpaid' || norm === 'due') {
    dotColor = '#B42318'; // error red
  } else if (norm === 'partial' || norm === 'advance') {
    dotColor = '#B7791F'; // pending amber
  }

  return (
    <span className={`inline-flex items-center gap-2 text-13 font-medium text-ink ${className}`}>
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: dotColor }}
        aria-hidden="true"
      />
      <span>{status || '—'}</span>
    </span>
  );
}

export default StatusText;

