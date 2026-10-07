/**
 * Terms acceptance: the zone's forwarder to the Common service.
 *
 * Server-side only. It carries exactly two calls and nothing else, so it can
 * never be used to reach any other Common endpoint:
 *   GET  Api/Terms/MyAcceptance?applicationKey=<key>
 *   POST Api/Terms/Accept    { applicationKey, version }
 *
 * Base URL from COMMON_API_BASE_URL (deployment ConfigMap; the full cluster
 * name, since the service runs in its own namespace). Every call carries the
 * caller's own token from the session; the service identifies the person from
 * it. No company header is sent: acceptance is per person, not per company.
 *
 * Answers:
 *   - 200 is passed through as the service sent it.
 *   - A refusal is passed through with its status and only its `message` code
 *     (and `currentVersion` on a 409). Nothing else in the service's body is
 *     relayed.
 *   - A 401 from the service is NOT passed through. The session was valid a
 *     moment ago (checked below), so it means the service refused the token, a
 *     configuration fault rather than an expired sign-in. Relayed as a 401 it
 *     would sign the user out, again on every page; it becomes a retryable 502.
 *   - This zone's own refusals: no session token -> 401; COMMON_API_BASE_URL
 *     not set -> 503; the service did not answer in time -> 502; a request
 *     that is not the expected shape -> 400.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

/** Shorter than the browser's own wait (20 s), so this zone answers first. */
const UPSTREAM_TIMEOUT_MS = 15_000;

/** Longest application key or version passed on; anything longer is refused here. */
const MAX_FIELD_LENGTH = 64;

/** Refusal codes this zone issues itself, before or instead of calling the service. */
export const TermsZoneRefusal = {
  /** No session, or no token in it. */
  Unauthorized: 'TERMS_UNAUTHORIZED',
  /** The request is not the shape this route expects. Same code the service uses. */
  BadRequest: 'TERMS_BAD_REQUEST',
  /** COMMON_API_BASE_URL is not set in this deployment. */
  NotConfigured: 'TERMS_NOT_CONFIGURED',
  /** The service did not answer (DNS, connection, or timeout). */
  Unreachable: 'TERMS_UNREACHABLE',
  /** The service answered 401 to a session this zone holds as valid. */
  TokenRefused: 'TERMS_TOKEN_REFUSED',
} as const;

function refuse(status: number, code: string): NextResponse {
  return NextResponse.json({ message: code }, { status });
}

/** A non-blank string of bounded length, passed on exactly as given: the service decides what is valid. */
function field(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  return value.trim().length > 0 && value.length <= MAX_FIELD_LENGTH ? value : null;
}

async function forward(route: string, path: string, method: 'GET' | 'POST', body?: unknown): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return refuse(401, TermsZoneRefusal.Unauthorized);

  const baseUrl = process.env.COMMON_API_BASE_URL;
  if (!baseUrl) {
    console.error('[Terms API] COMMON_API_BASE_URL is not set');
    return refuse(503, TermsZoneRefusal.NotConfigured);
  }

  let upstream: Response;
  let text: string;
  try {
    upstream = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    text = await upstream.text();
  } catch (error) {
    console.error(`[Terms API] ${route}: the service did not answer`, error instanceof Error ? error.name : error);
    return refuse(502, TermsZoneRefusal.Unreachable);
  }

  if (upstream.status === 200) {
    return new NextResponse(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  }

  if (upstream.status === 401) {
    console.error(`[Terms API] ${route}: the service refused the session token`);
    return refuse(502, TermsZoneRefusal.TokenRefused);
  }

  let message = `TERMS_HTTP_${upstream.status}`;
  let currentVersion: string | undefined;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string' && parsed.message) message = parsed.message;
    if (upstream.status === 409 && parsed && typeof parsed.currentVersion === 'string') currentVersion = parsed.currentVersion;
  } catch {
    /* not JSON; keep the status-derived code */
  }
  if (upstream.status >= 500) console.error(`[Terms API] ${route}: upstream ${upstream.status} ${message}`);

  return NextResponse.json(currentVersion === undefined ? { message } : { message, currentVersion }, {
    status: upstream.status,
  });
}

/** GET ?applicationKey=<key>: this account's acceptance of that application's current terms. */
export async function getMyTermsAcceptance(request: Request): Promise<NextResponse> {
  const applicationKey = field(new URL(request.url).searchParams.get('applicationKey'));
  if (!applicationKey) return refuse(400, TermsZoneRefusal.BadRequest);
  return forward('my-acceptance', `/Api/Terms/MyAcceptance?applicationKey=${encodeURIComponent(applicationKey)}`, 'GET');
}

/** POST { applicationKey, version }: record this account's acceptance of that version. */
export async function acceptTerms(request: Request): Promise<NextResponse> {
  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return refuse(400, TermsZoneRefusal.BadRequest);
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return refuse(400, TermsZoneRefusal.BadRequest);
  const input = value as Record<string, unknown>;
  const applicationKey = field(input.applicationKey);
  const version = field(input.version);
  if (!applicationKey || !version) return refuse(400, TermsZoneRefusal.BadRequest);
  // Exactly these two properties go on; anything else in the request stays here.
  return forward('accept', '/Api/Terms/Accept', 'POST', { applicationKey, version });
}
