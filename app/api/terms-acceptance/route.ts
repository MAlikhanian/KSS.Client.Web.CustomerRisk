import { acceptTerms, getMyTermsAcceptance } from '@/services/terms-acceptance-api';

/**
 * GET  /<zone>/api/terms-acceptance?applicationKey=<key>
 * POST /<zone>/api/terms-acceptance   { applicationKey, version }
 *
 * The signed-in person's acceptance of an application's terms, forwarded to
 * the Common service. See services/terms-acceptance-api.ts.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return getMyTermsAcceptance(request);
}

export async function POST(request: Request) {
  return acceptTerms(request);
}
