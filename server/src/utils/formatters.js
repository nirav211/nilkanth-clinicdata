/**
 * Formats a Date into Asia/Kolkata timezone: "14 Nov 2026, 5:08 pm"
 */
export function formatKolkataDateTime(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

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

/**
 * Calculates calendar days pending since visitDate in Asia/Kolkata
 */
export function calculateDaysPending(visitDate, asOfDate = new Date()) {
  if (!visitDate) return 0;
  const visit = new Date(visitDate);
  const asOf = new Date(asOfDate);

  // Compare in Asia/Kolkata dates
  const visitStr = visit.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const asOfStr = asOf.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

  const d1 = new Date(visitStr);
  const d2 = new Date(asOfStr);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}
