import { companyName } from './format';
import { CrsPermission, type BrokerageRefDto } from './types';

/**
 * Who may use the national-id search, and where each of its rows opens. Pure
 * rules over /Me, kept apart from the React gate so they can be tested on
 * their own.
 */

/**
 * The search, and its read-only view of another brokerage's case, are for
 * holders of CustomerRisk.Search.Read specifically; case-read access alone does
 * not open them. /Me lists the caller's own Customer Risk permission claims in
 * its permissions field whatever the service's permission switch says, so this
 * reads the claim itself, never the switch.
 */
export function holdsSearchPermission(me: { permissions: readonly string[] }): boolean {
  return me.permissions.includes(CrsPermission.SearchRead);
}

/** Whether a search hit belongs to the caller's own brokerage: both ids known and equal. */
export function isOwnBrokerage(
  callerBrokerageId: string | null | undefined,
  rowBrokerageId: string | null | undefined,
): boolean {
  return !!callerBrokerageId && !!rowBrokerageId && rowBrokerageId === callerBrokerageId;
}

/**
 * Whether the service could not supply the brokerage's name. The only place the
 * search screens read that signal, so a change in how the service marks it is a
 * change here alone.
 */
export function brokerageNameFailed(ref: BrokerageRefDto | null | undefined): boolean {
  return !ref || !ref.resolved;
}

/**
 * The registering brokerage as the search screens show it: its name, or, when
 * no name could be obtained, the given failure sentence, for the caller's own
 * brokerage and any other alike. Never an id.
 */
export function searchBrokerageName(
  ref: BrokerageRefDto | null | undefined,
  languageId: number,
  failedText: string,
): string {
  const name = ref && !brokerageNameFailed(ref) ? companyName(ref.names, languageId) : '';
  return name || failedText;
}

/** Whether the caller holds CustomerRisk.Case.Read itself, read from the claim like the search permission. */
export function holdsCaseReadPermission(me: { permissions: readonly string[] }): boolean {
  return me.permissions.includes(CrsPermission.CaseRead);
}

/**
 * Whether a search row opens the regular case page. Only for a caller who
 * holds case-read access, since that page needs it: then every row when her
 * access covers every company, otherwise her own brokerage's rows. Any other
 * row, including one whose brokerage is unknown, and every row for a caller
 * without case-read access, opens the read-only view instead, which the
 * service serves only for the searched id. A search result never lands on a
 * refusal.
 */
export function opensCasePage(
  holdsCaseRead: boolean,
  allCompanyCaller: boolean,
  callerBrokerageId: string | null | undefined,
  rowBrokerageId: string | null | undefined,
): boolean {
  if (!holdsCaseRead) return false;
  if (allCompanyCaller) return true;
  return isOwnBrokerage(callerBrokerageId, rowBrokerageId);
}
