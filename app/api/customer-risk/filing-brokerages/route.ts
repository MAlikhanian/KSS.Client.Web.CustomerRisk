import { forwardToCrs } from '@/services/customer-risk-api';

/**
 * GET /customer-risk/api/customer-risk/filing-brokerages
 * The brokerages a caller whose access covers every company may file for.
 * Refused for any other caller. The service checks the chosen one again on
 * every lookup and every create, so this list is the choice, not the control.
 */
export async function GET() {
  return forwardToCrs('filing-brokerages', 'GET', '/Api/FilingBrokerage/List');
}
