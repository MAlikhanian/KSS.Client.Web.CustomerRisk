import { forwardToCrs, readJsonObject } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/cases
 * File a case for the caller's filing brokerage. The body is the service's
 * CreateCaseRequestDto and is forwarded unchanged: the service refuses any
 * field it does not declare, so a stray brokerage id or case number fails
 * loudly there instead of being dropped here. The case number comes back in
 * the answer; the page never composes one.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  return forwardToCrs('cases (create)', 'POST', '/Api/Case', read.value);
}
