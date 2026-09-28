/**
 * Shapes exchanged with the Customer Risk (CRS) service, as JSON (camelCase).
 *
 * These mirror KSS.Service.SEBA_ERP_CustomerRisk's DTOs field for field and
 * are the only CRS types this zone has. Keep them exact: the service refuses a
 * request body carrying any field it does not declare, so a field added here
 * "for later" turns a working save into a 400.
 *
 * What is deliberately NOT here, and must not come back:
 *   - a brokerage id on any request. The service resolves the filing brokerage
 *     from the caller's own access on every request.
 *   - a case number on any request. The service issues it.
 *   - an audit entry type. The service writes its own audit; the page writes
 *     none.
 */

/** LanguageId in KSS_Common: 12 Persian, 10 English. 0 means the service could not tell. */
export const PERSIAN_LANGUAGE_ID = 12;
export const ENGLISH_LANGUAGE_ID = 10;

/** The CRS permission codes the service reports on /Me. */
export const CrsPermission = {
  CaseRead: 'CustomerRisk.Case.Read',
  CaseModify: 'CustomerRisk.Case.Modify',
  SearchRead: 'CustomerRisk.Search.Read',
} as const;
export type CrsPermissionCode = (typeof CrsPermission)[keyof typeof CrsPermission];

// ─── Names ──────────────────────────────────────────────────────────────────

export interface LookupNameDto {
  languageId: number;
  name: string;
}

export interface PersonNameDto {
  languageId: number;
  firstName?: string | null;
  lastName?: string | null;
  fatherName?: string | null;
}

export interface CompanyNameDto {
  languageId: number;
  name: string;
}

// ─── /Me ────────────────────────────────────────────────────────────────────

export type MeStatus =
  | 'resolved'
  | 'noPerson'
  | 'noFilingBrokerage'
  | 'estateWideNoFilingBrokerage'
  | 'ambiguous';

export interface BrokerageRefDto {
  id: string;
  /** False when the brokerage's name could not be read; only the id is known. */
  resolved: boolean;
  names: CompanyNameDto[];
}

export interface MeDto {
  status: MeStatus;
  filingBrokerage: BrokerageRefDto | null;
  /** Filled only when status is 'ambiguous'. */
  candidates: BrokerageRefDto[];
  permissions: string[];
  /** Whether a CRS permission is required in addition to a filing brokerage. */
  permissionRequired: boolean;
  crossBrokerageEnabled: boolean;
  legalCustomersEnabled: boolean;
  bourseCodeEnabled: boolean;
  /**
   * Whether the service may create a person that search-first did not find.
   * Optional because a service older than this field does not send it: absent
   * means "not reported", which is not the same as false.
   */
  personCreateEnabled?: boolean;
}

// ─── Lookups ────────────────────────────────────────────────────────────────

export interface LookupItemDto {
  id: number;
  code: string;
  names: LookupNameDto[];
}

export interface RiskTypeLookupDto extends LookupItemDto {
  /** False: at most one item of this type per case. */
  allowsMultiple: boolean;
  /** True: every item of this type needs a title. */
  requiresTitle: boolean;
  sortOrder: number;
}

export interface LookupsDto {
  riskTypes: RiskTypeLookupDto[];
  customerTypes: LookupItemDto[];
  relationTypes: LookupItemDto[];
}

/** A reference row from the Person or Company service (sexes). */
export interface ExternalLookupDto {
  id: number;
  names: LookupNameDto[];
}

/** CustomerType.Code of an individual; v1 files individuals only. */
export const INDIVIDUAL_CUSTOMER_TYPE_CODE = 'Individual';

// ─── Search-first ───────────────────────────────────────────────────────────

/**
 * A person as the directory holds it. Search-first and case reads carry the
 * national id and names only; `sexId` and `dateOfBirth` are usually absent and
 * a screen must render correctly without them.
 */
export interface PersonSummaryDto {
  id: string;
  nationalId: string;
  sexId?: number | null;
  dateOfBirth?: string | null;
  names: PersonNameDto[];
}

export interface CustomerLookupDto {
  found: boolean;
  person?: PersonSummaryDto | null;
}

// ─── Cases ──────────────────────────────────────────────────────────────────

export interface PagedResultDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * The case's customer. The case stores only a link; names are read from the
 * Person or Company service at request time. `resolved` false means that read
 * was not possible and only the link came back.
 */
export interface CaseCustomerDto {
  customerType: string;
  personId?: string | null;
  companyId?: string | null;
  resolved: boolean;
  nationalId?: string | null;
  personNames: PersonNameDto[];
  companyNames: CompanyNameDto[];
  dateOfBirth?: string | null;
  sexId?: number | null;
}

export interface CaseSummaryDto {
  id: string;
  caseNumber: string;
  customer: CaseCustomerDto;
  riskTypeCodes: string[];
  relatedPersonCount: number;
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
}

export interface CaseItemTextDto {
  languageId: number;
  title?: string | null;
  description?: string | null;
}

export interface CaseItemDto {
  id: string;
  riskTypeId: number;
  riskTypeCode: string;
  amount?: number | null;
  texts: CaseItemTextDto[];
}

export interface CaseRelatedPersonDto {
  id: string;
  relationTypeId: number;
  relationTypeCode: string;
  personId: string;
  resolved: boolean;
  nationalId?: string | null;
  names: PersonNameDto[];
  dateOfBirth?: string | null;
  sexId?: number | null;
}

export interface CaseNoteDto {
  languageId: number;
  additionalNotes?: string | null;
}

export interface CaseDetailDto {
  id: string;
  caseNumber: string;
  caseJalaliYear: number;
  caseJalaliMonth: number;
  caseSequence: number;
  customer: CaseCustomerDto;
  items: CaseItemDto[];
  relatedPersons: CaseRelatedPersonDto[];
  notes: CaseNoteDto[];
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CaseListRequest {
  archived: boolean;
  q: string;
  page: number;
  pageSize: number;
}

// ─── Filing ─────────────────────────────────────────────────────────────────

/** Every fact about a new person comes from the operator; nothing is defaulted. */
export interface NewPersonFieldsDto {
  sexId: number;
  /** Gregorian YYYY-MM-DD, as the date picker gives it. */
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
}

export interface CaseCustomerInputDto {
  nationalId: string;
  newPerson?: NewPersonFieldsDto;
}

export interface CaseItemInputDto {
  riskTypeId: number;
  amount?: number;
  title?: string;
  description?: string;
}

export interface RelatedPersonInputDto {
  relationTypeId: number;
  nationalId: string;
  newPerson?: NewPersonFieldsDto;
}

export interface CreateCaseRequestDto {
  /** The language the text was entered in; it is stored in that language only. */
  languageId: number;
  customerTypeId: number;
  customer: CaseCustomerInputDto;
  items: CaseItemInputDto[];
  relatedPersons: RelatedPersonInputDto[];
  additionalNotes?: string;
  archiveAfter: boolean;
}

export interface CaseCreatedDto {
  id: string;
  caseNumber: string;
  isArchived: boolean;
}
