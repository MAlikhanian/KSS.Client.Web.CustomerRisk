import { NextResponse } from 'next/server';
import { caseIdOrNull, forwardToCrs, readJsonObject } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/search/view
 *   {"caseId": "...", "nationalId": "..."}
 * The read-only view of a case the national-id search found. A POST so the id
 * never sits in a URL or an access log, on either hop.
 *
 * Exactly these two fields are forwarded: the service refuses any other
 * property. A case id that is not a GUID is answered with the same refusal as
 * a case the service does not serve, so nothing distinguishes the two.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  const caseId = typeof read.value.caseId === 'string' ? caseIdOrNull(read.value.caseId) : null;
  if (!caseId) return NextResponse.json({ message: 'CRS_CASE_NOT_FOUND' }, { status: 404 });
  const nationalId = typeof read.value.nationalId === 'string' ? read.value.nationalId : '';
  return forwardToCrs('search/view', 'POST', '/Api/Case/ViewByNationalId', { caseId, nationalId });
}
