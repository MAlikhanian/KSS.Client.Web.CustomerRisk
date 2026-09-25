/**
 * Shared types for the Customer Risk Record System (CRS / سامانه سابقه ریسک).
 *
 * Each brokerage owns its own case files. Cross-brokerage querying is via a
 * search inquiry endpoint with field-level redaction enforced in the UI.
 *
 * Field names mirror the planned DB shape so swapping the mock localStorage
 * store for real API calls is a 1:1 swap, not a rewrite.
 */

// ─── Enums ──────────────────────────────────────────────────────────────────

export type CustomerType = 'Individual' | 'Legal';

export type CaseStatus = 'Active' | 'Archived';

export type RelationType =
  | 'Spouse'
  | 'Child'
  | 'Parent'
  | 'Sibling'
  | 'BusinessPartner'
  | 'LegalRepresentative'
  | 'Other';

export const ALL_RELATION_TYPES: readonly RelationType[] = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'BusinessPartner',
  'LegalRepresentative',
  'Other',
] as const;

export type BrokerageUserRole = 'Admin' | 'Operator' | 'Viewer';

export const ALL_USER_ROLES: readonly BrokerageUserRole[] = [
  'Admin',
  'Operator',
  'Viewer',
] as const;

/**
 * THE AUDIT VOCABULARY RECORDS OUTCOMES, NOT ATTEMPTS.
 *
 * Every action below names something that HAPPENED. A refused access is not an
 * access: when a guard blocks or redirects a request, nothing is written, by
 * design. That is why /search/[id] pushes no ViewOtherBrokerageCase for a case
 * it renders not-found — the viewer did not view it, and an entry saying they
 * did would be false. A false audit record is worse than a missing one, because
 * it survives as evidence.
 *
 * This is written here, beside the vocabulary, because it was not written
 * anywhere before, and the cost of that was not one wrong decision — it was
 * every author deciding afresh from whichever page they were standing in, each
 * of them correctly, and differently. The rule is here so the next person does
 * not have to work it out again.
 *
 * THE LIMITATION, STATED ON PURPOSE: outcome-only auditing cannot support
 * intrusion detection. Someone walking case ids looking for another brokerage's
 * records leaves no trace at all, because every one of those requests is
 * refused and a refusal is not an event. That is a consequence of this design,
 * not a gap in it. If attempt-auditing is ever wanted it is a separate thing
 * with its own terms — what counts as an attempt, what is kept, for how long,
 * and who may read it.
 *
 * DO NOT ADD ATTEMPT-AUDITING ONE PAGE AT A TIME. A log that is part outcomes
 * and part attempts answers neither question: you can no longer read an entry
 * as "this happened", and the absence of an entry no longer means "this did not
 * happen". The local fix is the thing that destroys the property.
 */
export type AuditAction =
  | 'Login'
  | 'CreateCase'
  | 'EditCase'
  | 'ArchiveCase'
  | 'Unarchive'
  | 'Search'
  | 'ViewOtherBrokerageCase'
  | 'UserCreated'
  | 'UserUpdated'
  | 'UserLocked'
  | 'UserUnlocked'
  | 'IpWhitelistAdded'
  | 'IpWhitelistRemoved';

// ─── Master data ────────────────────────────────────────────────────────────

export interface CrsBrokerage {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrsBrokerageUser {
  id: string;
  brokerageId: string;
  username: string;
  displayName: string;
  role: BrokerageUserRole;
  isActive: boolean;
  /** Set when an Admin locks the account for emergency disable. */
  lockedUntil?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrsIpWhitelistEntry {
  id: string;
  brokerageId: string;
  ipAddress: string;
  label: string;
  addedByUserName: string;
  addedAt: string;
}

// ─── Risk case file ─────────────────────────────────────────────────────────

export interface CrsRelatedPerson {
  id: string;
  caseId: string;
  /** Structured given name — the shape KSS.Service.Person stores. */
  firstName?: string;
  /** Structured family name — the shape KSS.Service.Person stores. */
  lastName?: string;
  /**
   * Composed display value, kept in sync from firstName + lastName. Mirrors
   * Person's `Translation.DisplayName`, which the DB recomputes from the two
   * structured columns — search and every read site match on this.
   */
  name?: string;
  nationalId?: string;
  fatherName?: string;
  dateOfBirth?: string;
  relationType?: RelationType;
}

/**
 * Embedded sub-record for the binary "credit risk" and "documents risk"
 * categories. `hasRisk` is required on the parent case file; the optional
 * `description` and `amount` are filled only when `hasRisk` is true.
 */
export interface CrsRiskCommon {
  hasRisk: boolean;
  description?: string;
  amount?: number;
}

/**
 * 0..N entries under the "other risks" category. Each row is fully optional
 * per spec; the parent flag `hasAnyOtherRisks` gates the section's visibility.
 */
export interface CrsOtherRisk {
  id: string;
  caseId: string;
  riskType?: string;
  description?: string;
  amount?: number;
}

export interface CrsRiskCaseFile {
  id: string;
  /** `YYYY-MM-brokerageCode-counter`, counter resets monthly per brokerage. */
  caseNumber: string;
  brokerageId: string;
  customerType: CustomerType;
  /**
   * Structured given name — Individual customers only. Legal entities have a
   * company name and no first/last split.
   */
  customerFirstName?: string;
  /** Structured family name — Individual customers only. */
  customerLastName?: string;
  /**
   * Composed display value: `firstName lastName` for an Individual, the company
   * name for a Legal entity. Mirrors Person's computed `DisplayName`; every
   * table, detail page and the search predicate read this field.
   */
  customerName: string;
  customerNationalId: string;
  /**
   * Link to the matching row in KSS.Service.Person, when one could be resolved.
   * Individual customers only, and always optional — Person is a soft dependency,
   * so a case stays filable when the link cannot be made. The as-filed identity
   * fields above remain the record of what was asserted at filing time.
   */
  customerPersonId?: string;
  /** Stock-trading code, applicable to Individual customers. */
  stockCode?: string;
  /** Required for Individual customers per spec. */
  dateOfBirth?: string;
  /** Required for Individual customers per spec. */
  fatherName?: string;
  creditRisk: CrsRiskCommon;
  documentsRisk: CrsRiskCommon;
  /** Master toggle for the "other risks" section — sub-records are separate. */
  hasAnyOtherRisks: boolean;
  additionalNotes?: string;
  isArchived: boolean;
  archivedAt?: string;
  archivedByUserName?: string;
  createdAt: string;
  createdByUserName: string;
  updatedAt: string;
  updatedByUserName?: string;
}

// ─── Audit log ──────────────────────────────────────────────────────────────

export interface CrsAuditLogEntry {
  id: string;
  brokerageId: string;
  userName: string;
  action: AuditAction;
  /** Case#/User#/IP that the action affected, when applicable. */
  resourceId?: string;
  resourceLabel?: string;
  ipAddress?: string;
  /** Free-form details (search terms, change summary, etc.). */
  details?: string;
  timestamp: string;
}

// Removed: CrsSearchFilter. It typed the filter of a searchCases() that had no
// call sites, and it carried no brokerageId — so the shape could not express a
// tenant at all. Left in place it would have been lifted straight into a DTO by
// whoever wrote the real search endpoint, which is how an unscoped query
// becomes a contract. Reintroduce it only with a tenant field.
