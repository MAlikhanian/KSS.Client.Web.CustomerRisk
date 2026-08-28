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

// ─── Search filter shape ────────────────────────────────────────────────────

export interface CrsSearchFilter {
  customerName?: string;
  customerNationalId?: string;
  stockCode?: string;
  relatedPersonName?: string;
  relatedPersonNationalId?: string;
  dateFrom?: string;
  dateTo?: string;
}
