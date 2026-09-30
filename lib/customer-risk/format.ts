import {
  ENGLISH_LANGUAGE_ID,
  PERSIAN_LANGUAGE_ID,
  type CompanyNameDto,
  type LookupNameDto,
  type PersonNameDto,
} from './types';

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

/**
 * Format a date that has no time of day (a date of birth). The service sends
 * it as midnight UTC, so it is formatted IN UTC: formatted in a zone west of
 * Greenwich it would show the day before.
 */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC',
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

/** The LanguageId for the UI language: English when the UI is English, Persian otherwise. */
export function languageIdFor(uiLanguage: string | undefined): number {
  return uiLanguage === 'en' ? ENGLISH_LANGUAGE_ID : PERSIAN_LANGUAGE_ID;
}

/**
 * Choose one entry from a per-language list: the UI language first, then
 * language 0, then whatever there is.
 *
 * Language 0 means the service could not tell the language (the Person service
 * held one translation, so the Persian and English answers were identical).
 * Such a name is shown as-is in either UI language; it is not a missing name.
 */
export function pickByLanguage<T extends { languageId: number }>(
  rows: readonly T[] | null | undefined,
  languageId: number,
): T | undefined {
  if (!rows || rows.length === 0) return undefined;
  return (
    rows.find((r) => r.languageId === languageId) ??
    rows.find((r) => r.languageId === 0) ??
    rows[0]
  );
}

export function lookupName(names: readonly LookupNameDto[] | null | undefined, languageId: number): string {
  return pickByLanguage(names, languageId)?.name?.trim() ?? '';
}

/**
 * A company's name in the chosen language, or '' when it has none. An entry
 * with no text is not a name, so it never wins over one that has text: an
 * empty English entry falls through to the Persian name.
 */
export function companyName(names: readonly CompanyNameDto[] | null | undefined, languageId: number): string {
  return pickCompanyName(names, languageId)?.name ?? '';
}

/**
 * A company customer's name for the screen: the one in the screen's language,
 * else the one it has. A company may hold a single name, in either language;
 * an entry with no text is not a name. Undefined when there is none at all.
 */
export function pickCompanyName(
  names: readonly CompanyNameDto[] | null | undefined,
  languageId: number,
): { name: string; languageId: number } | undefined {
  const named = (names ?? []).filter((n) => n.name?.trim());
  const picked = pickByLanguage(named, languageId);
  return picked ? { name: picked.name.trim(), languageId: picked.languageId } : undefined;
}

/** "First Last" in the chosen language, or '' when no name is held. */
export function personName(names: readonly PersonNameDto[] | null | undefined, languageId: number): string {
  const n = pickByLanguage(names, languageId);
  if (!n) return '';
  return `${n.firstName?.trim() ?? ''} ${n.lastName?.trim() ?? ''}`.trim();
}

export function fatherName(names: readonly PersonNameDto[] | null | undefined, languageId: number): string {
  return pickByLanguage(names, languageId)?.fatherName?.trim() ?? '';
}
