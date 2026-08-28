/** Format a number as Persian-locale rials with " ریال" suffix. */
export function formatRial(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${new Intl.NumberFormat('fa-IR').format(value)} ریال`;
}

/** Format an ISO date string as a short Persian-style date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/** Format an ISO date + time string. */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/** Compose the case number for a year-month + brokerage code + sequence. */
export function makeCaseNumber(yearMonth: string, brokerageCode: string, seq: number): string {
  return `${yearMonth}-${brokerageCode}-${seq}`;
}

/** ISO 'YYYY-MM' for a given date (defaults to now). */
export function isoYearMonth(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
