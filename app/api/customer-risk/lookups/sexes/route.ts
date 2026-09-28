import { forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/lookups/sexes
 * The sex list for creating a new person, read by the service from the Person
 * service. Needs a signed-in user only, not a filing brokerage.
 */
export async function GET() {
  return forwardToCrs('lookups/sexes', 'GET', '/Api/Lookup/Sexes');
}
