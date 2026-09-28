import { forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/lookups
 * Risk, customer and relation types, with their names in both languages.
 */
export async function GET() {
  return forwardToCrs('lookups', 'GET', '/Api/Lookup/List');
}
