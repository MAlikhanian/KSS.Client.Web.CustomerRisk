/**
 * National identifiers, checked before anything is sent. The service applies
 * the same rules on its own; checking here means an incomplete or mistyped id
 * never leaves the browser.
 *
 * Every function takes ASCII digits only: fold Persian and Arabic-Indic digits
 * first (toEnglishDigits), then strip anything that is not a digit.
 */

/** A person's national code (کد ملی): 10 digits. */
export const PERSON_NATIONAL_ID_LENGTH = 10;
/** A company's national identifier (شناسه ملی): 11 digits. */
export const COMPANY_NATIONAL_ID_LENGTH = 11;

const COMPANY_WEIGHTS = [29, 27, 23, 19, 17, 29, 27, 23, 19, 17] as const;

function digits(value: string): number[] {
  return Array.from(value, (c) => c.charCodeAt(0) - 48);
}

/**
 * The Iranian national-code checksum. For the first nine digits d[0..8]:
 * s = sum of d[i] * (10 - i); r = s mod 11; the check digit is r when r < 2,
 * else 11 - r, and must equal d[9]. A code of one repeated digit is refused.
 */
export function isValidPersonNationalId(value: string): boolean {
  if (!/^[0-9]{10}$/.test(value)) return false;
  if (/^(\d)\1{9}$/.test(value)) return false;
  const d = digits(value);
  let s = 0;
  for (let i = 0; i < 9; i++) s += d[i] * (10 - i);
  const r = s % 11;
  return d[9] === (r < 2 ? r : 11 - r);
}

/**
 * The Iranian company national-identifier checksum. With x = d[9] + 2 and the
 * weights 29, 27, 23, 19, 17, 29, 27, 23, 19, 17: s = sum over i = 0..9 of
 * (d[i] + x) * w[i]; r = s mod 11, and 10 counts as 0. Valid when r = d[10].
 *
 * Two further refusals match the reference implementation, persian-tools
 * verifyIranianLegalId, which the service also applies: an id of all zeros,
 * and an id whose six digits at positions 3 to 8 (counting from 0) are all
 * zero.
 */
export function isValidCompanyNationalId(value: string): boolean {
  if (!/^[0-9]{11}$/.test(value)) return false;
  if (/^0+$/.test(value)) return false;
  if (value.slice(3, 9) === '000000') return false;
  const d = digits(value);
  const x = d[9] + 2;
  let s = 0;
  for (let i = 0; i < 10; i++) s += (d[i] + x) * COMPANY_WEIGHTS[i];
  let r = s % 11;
  if (r === 10) r = 0;
  return r === d[10];
}

/**
 * What a complete id is, or null when it is incomplete or fails its checksum.
 * Only a non-null answer may be sent to the service.
 */
export function nationalIdKind(value: string): 'person' | 'company' | null {
  if (value.length === PERSON_NATIONAL_ID_LENGTH) return isValidPersonNationalId(value) ? 'person' : null;
  if (value.length === COMPANY_NATIONAL_ID_LENGTH) return isValidCompanyNationalId(value) ? 'company' : null;
  return null;
}
