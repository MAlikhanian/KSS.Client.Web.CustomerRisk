/**
 * Browser-side calls to this zone's own CRS routes (app/api/customer-risk/**).
 *
 * The paths MUST carry the basePath. The Shell's middleware routes on the first
 * path segment, so a root-relative '/api/customer-risk/...' has segment "api",
 * is never a zone key, and is answered by the Shell, which has no such routes.
 * With the prefix the segment is "customer-risk" and the request reaches here.
 *
 * Every failure is thrown as a CrsApiError carrying the HTTP status and the
 * service's code (CRS_FOREIGN_CASE, CRS_PERSON_FIELDS_REQUIRED, ...), so a
 * page can tell "not yours" from "not there" from "cannot answer now".
 */
import type {
  CaseCreatedDto,
  CaseDetailDto,
  CaseListRequest,
  CaseSummaryDto,
  CreateCaseRequestDto,
  CustomerLookupDto,
  ExternalLookupDto,
  LookupsDto,
  MeDto,
  PagedResultDto,
} from './types';

const RAW_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const ZONE_PREFIX =
  RAW_BASE_PATH.startsWith('/') && RAW_BASE_PATH !== '/' ? RAW_BASE_PATH.replace(/\/+$/, '') : '';
const BASE = `${ZONE_PREFIX}/api/customer-risk`;

/** Longer than the zone route's own upstream timeout, so the route answers first. */
const REQUEST_TIMEOUT_MS = 50_000;

/** Codes this client issues itself, for failures that never produced an HTTP answer. */
export const ClientFailure = {
  Network: 'CRS_NETWORK_ERROR',
  Timeout: 'CRS_TIMEOUT',
} as const;

export class CrsApiError extends Error {
  /** HTTP status, or 0 when no answer arrived. */
  readonly status: number;
  /** The service's `message` code, or a zone/client code. */
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'CrsApiError';
    this.status = status;
    this.code = code;
  }
}

async function http<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    throw new CrsApiError(0, timedOut ? ClientFailure.Timeout : ClientFailure.Network);
  }

  if (res.status === 401 && typeof window !== 'undefined') {
    const { signOutToTenant } = await import('@/lib/auth-signout');
    signOutToTenant();
  }

  if (!res.ok) {
    let code = `CRS_HTTP_${res.status}`;
    try {
      const parsed = await res.json();
      if (parsed && typeof parsed.message === 'string' && parsed.message) code = parsed.message;
    } catch {
      /* keep the status-derived code */
    }
    throw new CrsApiError(res.status, code);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const getMe = () => http<MeDto>('GET', '/me');

export const getLookups = () => http<LookupsDto>('GET', '/lookups');

export const getSexes = () => http<ExternalLookupDto[]>('GET', '/lookups/sexes');

/** Search-first. The national id travels in the body, never the URL. */
export const lookupPerson = (nationalId: string) =>
  http<CustomerLookupDto>('POST', '/customer/person', { nationalId });

/** The filing brokerage's own cases. A POST because `q` may be a national id. */
export const listCases = (request: CaseListRequest) =>
  http<PagedResultDto<CaseSummaryDto>>('POST', '/cases/list', request);

export const getCase = (id: string) => http<CaseDetailDto>('GET', `/cases/${encodeURIComponent(id)}`);

export const createCase = (request: CreateCaseRequestDto) =>
  http<CaseCreatedDto>('POST', '/cases', request);

export const archiveCase = (id: string) =>
  http<void>('POST', `/cases/${encodeURIComponent(id)}/archive`);

export const unarchiveCase = (id: string) =>
  http<void>('POST', `/cases/${encodeURIComponent(id)}/unarchive`);
