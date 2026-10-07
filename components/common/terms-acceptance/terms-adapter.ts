/**
 * Terms acceptance: the transport between the card and the service.
 *
 * An adapter only maps answers; it never decides what the card shows. Both
 * methods THROW unless the service confirmed the answer, so a card built on an
 * adapter can show "accepted" only for a recorded acceptance. The rule that
 * the record must be for the same version as the text on screen is applied in
 * the hook (use-terms-acceptance.ts), not here, so a custom adapter cannot
 * bypass it.
 *
 * Nothing here writes to browser storage. An acceptance lives on the server
 * only; the browser holds the last answer in memory for as long as the card
 * is on screen.
 */
import { apiClientFetch } from '@/lib/api-client';

/** One account's acceptance of one application's terms, as the service reports it. */
export interface TermsRecord {
  /** The application key, echoed by the service in its canonical lowercase form. */
  applicationKey: string;
  /** The version the service considers CURRENT for this application. */
  version: string;
  /** Whether this account has accepted that version. */
  accepted: boolean;
  /** When it was accepted (UTC, ISO 8601), or null. */
  acceptedAt: string | null;
}

/**
 * Why an adapter call did not produce a confirmed record.
 * - stale: the version posted is not the current one; nothing was recorded.
 * - unidentified: the account has no person behind it, so nothing can be recorded.
 * - unavailable: terms acceptance is not enabled for this application key.
 * - failed: anything else (bad request, server error, network, timeout, a
 *   malformed answer). Always safe to retry.
 */
export type TermsErrorCode = 'stale' | 'unidentified' | 'unavailable' | 'failed';

export class TermsAcceptanceError extends Error {
  readonly code: TermsErrorCode;
  /** For `stale` only: the version the service holds now. */
  readonly currentVersion?: string;

  constructor(code: TermsErrorCode, currentVersion?: string) {
    // The message is the code alone. It must never contain "401" or
    // "Unauthorized": the zone's global query handlers sign the user out on
    // those words.
    super(`TERMS_${code.toUpperCase()}`);
    this.name = 'TermsAcceptanceError';
    this.code = code;
    this.currentVersion = currentVersion;
    Object.setPrototypeOf(this, TermsAcceptanceError.prototype);
  }
}

/** The code of any thrown value: a TermsAcceptanceError's own code, `failed` for anything else. */
export function termsErrorCode(error: unknown): TermsErrorCode {
  if (error instanceof TermsAcceptanceError) return error.code;
  return 'failed';
}

export interface TermsAcceptanceAdapter {
  /** Read this account's acceptance of the current version. Throws unless confirmed. */
  load(signal?: AbortSignal): Promise<TermsRecord>;
  /** Record acceptance of `version`, the version of the text on screen. Throws unless recorded. */
  accept(version: string): Promise<TermsRecord>;
}

export interface HttpTermsAdapterOptions {
  /** The application whose terms these are, e.g. the zone's module code. Sent as is. */
  applicationKey: string;
  /**
   * The zone's own route that forwards to the service. Defaults to
   * `<basePath>/api/terms-acceptance`. The browser never calls the service directly.
   */
  endpoint?: string;
  /** Give up on a request after this long and report `failed` (default 20 s). */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 20_000;

/** The zone's terms route, under the zone's base path. */
export function defaultTermsEndpoint(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  const base = raw.startsWith('/') && raw !== '/' ? raw.replace(/\/+$/, '') : '';
  return `${base}/api/terms-acceptance`;
}

function sameKey(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** A record only from a body of exactly the expected shape, for the key that was asked about. */
function toRecord(body: unknown, applicationKey: string): TermsRecord {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new TermsAcceptanceError('failed');
  const b = body as Record<string, unknown>;
  const ok =
    typeof b.applicationKey === 'string' &&
    typeof b.version === 'string' &&
    b.version.length > 0 &&
    typeof b.accepted === 'boolean' &&
    (b.acceptedAt === null || typeof b.acceptedAt === 'string') &&
    sameKey(b.applicationKey, applicationKey);
  if (!ok) throw new TermsAcceptanceError('failed');
  return {
    applicationKey: b.applicationKey as string,
    version: b.version as string,
    accepted: b.accepted as boolean,
    acceptedAt: b.acceptedAt as string | null,
  };
}

/** A signal that aborts on the caller's signal or after `ms`, whichever comes first. */
function withTimeout(ms: number, outer?: AbortSignal): { signal: AbortSignal; done: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onAbort = () => controller.abort();
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: controller.signal,
    done: () => {
      clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    },
  };
}

/**
 * The default adapter: the zone's terms route, which forwards to the service.
 *
 *   200 with a well-formed record for this key  -> the record
 *   403 TERMS_NO_PERSON                         -> unidentified
 *   404 TERMS_UNKNOWN_APPLICATION               -> unavailable
 *   409 TERMS_STALE (+ currentVersion)          -> stale
 *   anything else, a network error, a timeout   -> failed
 *
 * A 401 goes through the estate's sign-out path (apiClientFetch) and then
 * reports `failed`. Error codes are matched exactly: a 404 from a wrong route
 * is `failed` (retryable), never `unavailable`.
 */
export function createHttpTermsAdapter(opts: HttpTermsAdapterOptions): TermsAcceptanceAdapter {
  const applicationKey = opts.applicationKey;
  const endpoint = opts.endpoint ?? defaultTermsEndpoint();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(url: string, init: RequestInit, outer?: AbortSignal): Promise<TermsRecord> {
    const t = withTimeout(timeoutMs, outer);
    let response: Response;
    let body: unknown = undefined;
    try {
      response = await apiClientFetch(url, { ...init, cache: 'no-store', signal: t.signal });
      try {
        body = await response.json();
      } catch {
        body = undefined;
      }
    } catch {
      throw new TermsAcceptanceError('failed');
    } finally {
      t.done();
    }

    if (response.status === 200) return toRecord(body, applicationKey);

    const b = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const message = typeof b.message === 'string' ? b.message : '';
    if (response.status === 403 && message === 'TERMS_NO_PERSON') throw new TermsAcceptanceError('unidentified');
    if (response.status === 404 && message === 'TERMS_UNKNOWN_APPLICATION') throw new TermsAcceptanceError('unavailable');
    if (response.status === 409 && message === 'TERMS_STALE') {
      const current = typeof b.currentVersion === 'string' && b.currentVersion ? b.currentVersion : undefined;
      throw new TermsAcceptanceError('stale', current);
    }
    throw new TermsAcceptanceError('failed');
  }

  return {
    load(signal) {
      const url = `${endpoint}?applicationKey=${encodeURIComponent(applicationKey)}`;
      return call(url, { method: 'GET', headers: { Accept: 'application/json' } }, signal);
    },
    accept(version) {
      return call(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationKey, version }),
      });
    },
  };
}
