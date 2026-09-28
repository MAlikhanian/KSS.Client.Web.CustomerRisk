/**
 * Browser-side calls to this zone's own CRS routes (app/api/customer-risk/**),
 * plus one call to the estate's shared location endpoint (see getLocations).
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
  FilingBrokerageDto,
  LocationOptionDto,
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
  return send<T>(method, `${BASE}${path}`, body);
}

async function send<T>(
  method: 'GET' | 'POST',
  url: string,
  body?: unknown,
  signOutOnUnauthorized = true,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
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

  if (res.status === 401 && signOutOnUnauthorized && typeof window !== 'undefined') {
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

/**
 * Search-first. The national id travels in the body, never the URL. The
 * brokerage is passed only by a caller who chose it on the form.
 */
export const lookupPerson = (nationalId: string, filingBrokerageId?: string) =>
  http<CustomerLookupDto>(
    'POST',
    '/customer/person',
    filingBrokerageId ? { nationalId, filingBrokerageId } : { nationalId },
  );

/**
 * Search-first for a company, by its 11-digit national id. Same rules as for a
 * person: the id travels in the body, and the brokerage only when chosen.
 */
export const lookupCompany = (nationalId: string, filingBrokerageId?: string) =>
  http<CustomerLookupDto>(
    'POST',
    '/customer/company',
    filingBrokerageId ? { nationalId, filingBrokerageId } : { nationalId },
  );

/** The legal forms a new company is filed with, from the Company service through CRS. */
export const getLegalForms = () => http<ExternalLookupDto[]>('GET', '/lookups/legal-forms');

/** Code for a location list that could not be loaded, whatever the reason. */
export const LOCATIONS_UNAVAILABLE = 'CRS_LOCATIONS_UNAVAILABLE';

/**
 * A location list (countries, the provinces of a country, the cities of a
 * province). Deliberately ROOT-relative, unlike every other call here: it is the
 * estate's shared, session-gated location endpoint on the same origin, used by
 * the other zones' registration forms too. It carries no customer data.
 *
 * A refusal here never signs the user out: the endpoint belongs to another app,
 * so its 401 is not this zone's answer about the session. A session that has
 * really ended is caught by this zone's own next call.
 */
export async function getLocations(
  type: 'countries' | 'provinces' | 'cities',
  parentId?: string,
): Promise<LocationOptionDto[]> {
  const params = new URLSearchParams({ type });
  if (type === 'provinces' && parentId) params.set('countryId', parentId);
  if (type === 'cities' && parentId) params.set('provinceId', parentId);
  try {
    return await send<LocationOptionDto[]>('GET', `/api/locations?${params.toString()}`, undefined, false);
  } catch (error) {
    const status = error instanceof CrsApiError ? error.status : 0;
    throw new CrsApiError(status, LOCATIONS_UNAVAILABLE);
  }
}

/** The brokerages a caller who covers every company may file for. Refused for anyone else. */
export const listFilingBrokerages = () => http<FilingBrokerageDto[]>('GET', '/filing-brokerages');

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
