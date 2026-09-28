import { forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/me
 * The caller's standing in CRS: the filing brokerage, or which of the five
 * reasons there is none. The service reports instead of refusing here, so the
 * pages can explain each state.
 */
export async function GET() {
  return forwardToCrs('me', 'GET', '/Api/Me');
}
