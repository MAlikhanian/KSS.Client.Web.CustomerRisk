import { NextResponse } from 'next/server';
import { caseIdOrNull, forwardToCrs, readJsonObject, ZoneRefusal } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/customer/person
 *   {"nationalId": "...", "filingBrokerageId": "..."?}
 * The search-first step: is this person already known? A POST so the national
 * id never sits in a URL or an access log, on either hop.
 *
 * `filingBrokerageId` is sent only by a caller who chooses the brokerage on the
 * form; the service checks it on every call. Only these two fields are
 * forwarded, because the service refuses any field it does not declare.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  const nationalId = typeof read.value.nationalId === 'string' ? read.value.nationalId : '';
  const body: Record<string, unknown> = { nationalId };

  const chosen = read.value.filingBrokerageId;
  if (chosen !== undefined && chosen !== null) {
    // Same shape check as a case id: a GUID or nothing.
    const id = typeof chosen === 'string' ? caseIdOrNull(chosen) : null;
    if (!id) return NextResponse.json({ message: ZoneRefusal.InvalidRequest }, { status: 400 });
    body.filingBrokerageId = id;
  }

  return forwardToCrs('customer/person', 'POST', '/Api/Customer/Person', body);
}
