import { redirect } from 'next/navigation';

// The landing lives at a sub-path (/customer-risk/overview) so no tab path is a
// prefix of another (mirrors the brokerages section). The bare section root just
// redirects to the overview.
export default function CustomerRiskRootPage() {
  redirect('/overview');
}
