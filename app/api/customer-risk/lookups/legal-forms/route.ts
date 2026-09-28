import { forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/lookups/legal-forms
 * The legal-form list for creating a new company, read by the service from the
 * Company service. Needs a signed-in user only, not a filing brokerage; the
 * service refuses it while company customers are switched off.
 */
export async function GET() {
  return forwardToCrs('lookups/legal-forms', 'GET', '/Api/Lookup/LegalForms');
}
