import { caseIdOrNull, caseNotFound, forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/cases/{id}
 * 200 with the case when it belongs to the caller's filing brokerage;
 * 403 CRS_FOREIGN_CASE when it belongs to another; 404 when there is none.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = caseIdOrNull((await params).id);
  if (!id) return caseNotFound();

  return forwardToCrs('cases/{id}', 'GET', `/Api/Case/${id}`);
}
