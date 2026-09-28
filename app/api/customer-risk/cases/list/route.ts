import { forwardToCrs, readJsonObject } from '@/services/customer-risk-api';

/**
 * POST /customer-risk/api/customer-risk/cases/list
 *   {"archived": false, "q": "", "page": 1, "pageSize": 20}
 * The filing brokerage's own cases. A POST on both hops because `q` can be a
 * national id, and a national id does not go in a URL.
 *
 * Only the four known fields are forwarded, each only when it has the right
 * type: the service refuses unknown fields with a 400, and it defaults any
 * field left out.
 */
export async function POST(request: Request) {
  const read = await readJsonObject(request);
  if (!read.ok) return read.response;

  const { archived, q, page, pageSize } = read.value;
  const body: Record<string, unknown> = {};
  if (typeof archived === 'boolean') body.archived = archived;
  if (typeof q === 'string') body.q = q;
  if (Number.isInteger(page)) body.page = page;
  if (Number.isInteger(pageSize)) body.pageSize = pageSize;

  return forwardToCrs('cases/list', 'POST', '/Api/Case/List', body);
}
