import { forwardToCrs, readJsonObject } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/customer/person  {"nationalId": "..."}
 * The search-first step: is this person already known? A POST so the national
 * id never sits in a URL or an access log, on either hop.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  const nationalId = typeof read.value.nationalId === 'string' ? read.value.nationalId : '';
  return forwardToCrs('customer/person', 'POST', '/Api/Customer/Person', { nationalId });
}
