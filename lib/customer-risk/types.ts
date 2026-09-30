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
  /**
   * Whether search-first returns a found person's full details (names, father's
   * name, date of birth, sex). Until it does, a found person is shown by name and
   * national id only, so no empty detail fields appear. Optional for the same
   * reason as personCreateEnabled.
   */
  personLookupV2Enabled?: boolean;
  /**
   * True when the caller's access covers every company and no single brokerage
   * is resolved for the caller: the filing brokerage is chosen on the case form.
   * The status string does not change for this caller; this flag is the signal.
   * Absent (an older service) is treated as false.
   */
  chooseBrokerage?: boolean;
  /**
   * True when the caller's access covers every company, at view or edit level,
   * and no single brokerage is resolved for the caller: the case list, the case
   * detail and the overview span every brokerage. True whenever chooseBrokerage
   * is true; a view-level caller has this without the picker. Absent (an older
   * service) is treated as false.
   */
  allBrokerages?: boolean;
  /**
   * For a caller with allBrokerages: whether archive and unarchive are offered
   * (the access covering every company is at edit level). Kept apart from
   * chooseBrokerage on purpose, so that filing and archiving can change
   * independently; never infer one from the other. Absent is treated as false.
   */
  archiveAllBrokerages?: boolean;
}

/** A brokerage a caller who covers every company may file for. Language 0 = one name for both languages. */
export interface FilingBrokerageDto {
  id: string;
  names: CompanyNameDto[];
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

/** CustomerType.Code of an individual (a person). */
export const INDIVIDUAL_CUSTOMER_TYPE_CODE = 'Individual';

/** CustomerType.Code of a legal entity (a company). */
export const LEGAL_CUSTOMER_TYPE_CODE = 'Legal';

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

/**
 * A company as the directory holds it. The fields after `names` are optional:
 * they are the company's create-form fields, added to the service's lookup so
 * a found company can be shown in full, and a service that does not send them
 * yet leaves them blank on screen.
 */
export interface CompanySummaryDto {
  id: string;
  nationalId: string;
  registrationNo?: string | null;
  isActive: boolean;
  isDeleted: boolean;
  names: CompanyNameDto[];
  registrationDate?: string | null;
  economicCode?: string | null;
}

export interface CustomerLookupDto {
  found: boolean;
  person?: PersonSummaryDto | null;
  company?: CompanySummaryDto | null;
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
  /**
   * The brokerage the case is filed for. Shown only to a caller whose access
   * covers every company; to anyone else every case is their own brokerage's.
   * Optional because an older service does not send it; resolved false means no
   * name could be read, which is display only.
   */
  brokerage?: BrokerageRefDto;
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
  /**
   * The brokerage the case is filed for. Shown only to a caller whose access
   * covers every company; to anyone else every case is their own brokerage's.
   * Optional because an older service does not send it; resolved false means no
   * name could be read, which is display only.
   */
  brokerage?: BrokerageRefDto;
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

// ─── National-id search ─────────────────────────────────────────────────────

/**
 * The search's whole request: one complete national id, 10 digits for a
 * person or 11 for a company. The service infers which from the length and
 * refuses any other property.
 */
export interface NationalIdSearchRequestDto {
  nationalId: string;
}

/** The cases whose CUSTOMER holds that id, newest first; the same rows as the case list. */
/** A relation through which the searched id is a related person of the case. */
export interface RelatedMatchDto {
  relationTypeId: number;
  relationTypeCode: string;
}

/**
 * One case found by national id: one row per case, however the id matched it.
 * Both match fields are optional so that a service which does not send them
 * yet reads as a plain customer match, with no note.
 */
export interface NationalIdSearchCaseDto extends CaseSummaryDto {
  /** The searched id is the case's customer. */
  matchedAsCustomer?: boolean;
  /** Each relation through which the searched id is a related person; empty when it is not. */
  relatedMatches?: RelatedMatchDto[];
}

export interface NationalIdSearchResponseDto {
  cases: NationalIdSearchCaseDto[];
}

/**
 * The read-only view of a case found by the search. The service serves it only
 * when that case's customer holds this exact national id, and answers a wrong
 * id and a missing case identically. The answer is a CaseDetailDto.
 */
export interface CaseViewByNationalIdRequestDto {
  caseId: string;
  nationalId: string;
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

/**
 * A company not yet in the directory. Every field comes from the operator and
 * every one is required. The name is in the request's languageId; the service
 * sets the legal form and the place of registration itself.
 */
export interface NewCompanyFieldsDto {
  name: string;
  /** Gregorian YYYY-MM-DD, as the date picker gives it. */
  registrationDate: string;
  registrationNo: string;
  economicCode: string;
}

export interface CaseCustomerInputDto {
  nationalId: string;
  /** Sent only for a person search-first did not find. */
  newPerson?: NewPersonFieldsDto;
  /** Sent only for a company search-first did not find. */
  newCompany?: NewCompanyFieldsDto;
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
  /**
   * Sent ONLY by a caller who chooses the brokerage (Me.chooseBrokerage). A
   * caller tied to one brokerage sends nothing: the service derives it, and
   * refuses a different one.
   */
  filingBrokerageId?: string;
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
