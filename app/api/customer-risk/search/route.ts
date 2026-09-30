import { forwardToCrs, readJsonObject } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/search
 *   {"nationalId": "..."}
 * The national-id search: the cases whose customer holds this exact id. A POST
 * so the id never sits in a URL or an access log, on either hop.
 *
 * Only `nationalId` is forwarded: the service refuses any other property, and
 * the search takes nothing else. The service validates the id itself.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  const nationalId = typeof read.value.nationalId === 'string' ? read.value.nationalId : '';
  return forwardToCrs('search', 'POST', '/Api/Case/SearchByNationalId', { nationalId });
}
