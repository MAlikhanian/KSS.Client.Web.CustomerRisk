import { caseIdOrNull, caseNotFound, forwardToCrs } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/cases/{id}/archive
 * 204 when archived. Own cases only: another brokerage's case answers 404.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = caseIdOrNull((await params).id);
  if (!id) return caseNotFound();

  return forwardToCrs('cases/{id}/archive', 'POST', `/Api/Case/${id}/Archive`);
}
