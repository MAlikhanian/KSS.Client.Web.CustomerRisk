/**
 * KSS SEBA ERP Customer Risk service (KSS.Service.SEBA_ERP_CustomerRisk).
 *
 * Server-side only. Every route under app/api/customer-risk/ calls the service
 * through forwardToCrs() below, and nothing else in this zone calls it.
 *
 * Base URL from CUSTOMER_RISK_API_BASE_URL (deployment ConfigMap). The service
 * runs in its own namespace, so the value is the FULL cluster name
 * (…-service.<namespace>.svc.cluster.local); the bare service name only
 * resolves inside the service's own namespace.
 *
 * Every call carries two things, and neither is optional:
 *   - Authorization: the caller's own token from the session. The service
 *     resolves the filing brokerage from it; nothing in a request body or URL
 *     names a brokerage.
 *   - X-Company-Id: the active company, read from the `x-company-id` cookie
 *     exactly as the Shell forwards it. The service passes it on to the Person
 *     service, which refuses to create a person without it. A request with no
 *     active company is refused HERE rather than sent without the header.
 *
 * Errors are passed through with the upstream status and its `message` code
 * (CRS_FOREIGN_CASE, CRS_PERSON_FIELDS_REQUIRED, ...), except a 401, which
 * is turned into a service fault (see forwardToCrs). Do not route them
 * through lib/api-error.ts: that helper needs a numeric `statusCode` in the
 * body, and the service's own refusals carry only `message`, so every 403 and
 * 404 would reach the page as a 500.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth/next';
import authOptions from '@/app/api/auth/[...nextauth]/auth-options';

/** Longer than any single upstream call the service makes, so its own timeout answers first. */
const UPSTREAM_TIMEOUT_MS = 45_000;

const COMPANY_COOKIE = 'x-company-id';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Refusal codes this zone issues itself, before or instead of calling the service. */
export const ZoneRefusal = {
  /**
   * No `x-company-id` cookie: nothing to send as X-Company-Id. The same code the
   * service answers when Person refuses a create for the same reason, so the
   * page explains both with one message.
   */
  NoActiveCompany: 'CRS_NO_ACTIVE_COMPANY',
  /** CUSTOMER_RISK_API_BASE_URL is not set in this deployment. */
  ServiceNotConfigured: 'CRS_SERVICE_NOT_CONFIGURED',
  /** The service did not answer (DNS, connection, or timeout). */
  ServiceUnreachable: 'CRS_SERVICE_UNREACHABLE',
  /** The request body was not the JSON object the route expects. */
  InvalidRequest: 'CRS_INVALID_REQUEST',
  /** The service answered 401 to a session the zone holds as valid. */
  TokenRefused: 'CRS_TOKEN_REFUSED',
} as const;

function refuse(status: number, code: string): NextResponse {
  return NextResponse.json({ message: code }, { status });
}

/**
 * Call the CRS service as the signed-in user and answer with what it said.
 *
 * `route` is a label for the server log only. The path is never logged: a
 * body is never logged either, because both can carry a national id.
 */
export async function forwardToCrs(
  route: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return refuse(401, 'Unauthorized');

  // The cookie is written client-side, so it is checked for shape before it
  // becomes a header. Anything but a GUID is treated as no company at all.
  const companyId = (await cookies()).get(COMPANY_COOKIE)?.value;
  if (!companyId || !GUID.test(companyId)) return refuse(400, ZoneRefusal.NoActiveCompany);

  const baseUrl = process.env.CUSTOMER_RISK_API_BASE_URL;
  if (!baseUrl) {
    console.error('[CRS API] CUSTOMER_RISK_API_BASE_URL is not set');
    return refuse(503, ZoneRefusal.ServiceNotConfigured);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Authorization: `Bearer ${session.accessToken}`,
        'X-Company-Id': companyId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    console.error(`[CRS API] ${route}: the service did not answer`, error instanceof Error ? error.name : error);
    return refuse(502, ZoneRefusal.ServiceUnreachable);
  }

  if (upstream.status === 204) return new NextResponse(null, { status: 204 });

  const text = await upstream.text().catch(() => '');

  if (upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Pass the refusal through as { message } with the upstream status. Only the
  // code travels: `details` (development-only raw exception text) and any other
  // field stay on the server.
  let code = `CRS_HTTP_${upstream.status}`;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.message === 'string' && parsed.message) code = parsed.message;
  } catch {
    /* not JSON; keep the status-derived code */
  }
  if (upstream.status >= 500) {
    console.error(`[CRS API] ${route}: upstream ${upstream.status} ${code}`);
  }

  // The session was valid a moment ago (checked above), so a 401 here means
  // the SERVICE refused the token: a configuration fault between the two, not
  // an expired sign-in. Passed on as a 401 it would sign the user out, and
  // every page would do it again. It goes back as a service fault instead;
  // an expired session is caught by the session check and the expiry guard.
  if (upstream.status === 401) {
    console.error(`[CRS API] ${route}: the service refused the session token`);
    return refuse(502, ZoneRefusal.TokenRefused);
  }
  return refuse(upstream.status, code);
}

/**
 * Read a JSON object body, or answer 400. Arrays, strings and malformed JSON
 * are refused here so the service is never sent something that is not an object.
 */
export async function readJsonObject(
  request: Request,
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; response: NextResponse }> {
  try {
    const value = await request.json();
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ok: true, value: value as Record<string, unknown> };
    }
  } catch {
    /* fall through */
  }
  return { ok: false, response: refuse(400, ZoneRefusal.InvalidRequest) };
}

/**
 * A case id from a route segment, or null. The service's routes are
 * `{id:guid}`, so anything else would 404 there anyway; checking here keeps
 * arbitrary text out of the upstream path.
 */
export function caseIdOrNull(id: string): string | null {
  return GUID.test(id) ? id : null;
}

/** The answer for a case id that is not a GUID: the same code the service uses for a missing case. */
export function caseNotFound(): NextResponse {
  return refuse(404, 'CRS_CASE_NOT_FOUND');
}
