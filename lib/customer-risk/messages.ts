import type { TFunction } from 'i18next';
import { CrsApiError } from './api';

/**
 * One sentence per refusal code, for toasts and error cards.
 *
 * A code this table does not know is shown VERBATIM inside a generic sentence
 * rather than hidden: the service adds codes over time, and an operator who
 * can read the code back to support is better off than one who sees "error".
 */
const MESSAGES: Record<string, [key: string, english: string]> = {
  CRS_NO_PERSON: ['meNoPerson', 'Your sign-in is not linked to a person record, so the system cannot tell which brokerage you file for. Ask your administrator to link your account to a person.'],
  CRS_NO_FILING_BROKERAGE: ['meNoFilingBrokerage', 'You have no access to an active brokerage, so you cannot file or view risk cases. Ask your administrator for access to your brokerage.'],
  // As an ERROR this code reaches this zone only from the case form, when no
  // brokerage was sent by a caller who must choose one. The service also answers
  // it to a caller who sees every brokerage at view level only, on filing and on
  // archive/unarchive; the zone never offers those actions to that caller
  // (filesCases, mayArchiveCases), which is what keeps this sentence off them.
  // The standing text for the same status (meEstateWide) is still what
  // CrsStanding shows when an older service reports the status without either
  // flag.
  CRS_ESTATE_WIDE_NO_FILING_BROKERAGE: ['validationBrokerageRequired', 'Choose the brokerage this case is filed for.'],
  CRS_FILING_BROKERAGE_NOT_ELIGIBLE: ['errorFilingBrokerageNotEligible', "The selected brokerage can't be used for filing. Choose another brokerage from the list."],
  CRS_FILING_BROKERAGE_MISMATCH: ['errorFilingBrokerageMismatch', 'Your account files cases for a different brokerage. You can only file for your own brokerage.'],
  CRS_BROKERAGE_CHOICE_NOT_AVAILABLE: ['errorBrokerageChoiceNotAvailable', 'Choosing a brokerage is only available to users with access to all companies.'],
  CRS_AMBIGUOUS_FILING_BROKERAGE: ['meAmbiguous', 'You have access to more than one brokerage, and the system will not choose one for you. Ask your administrator to leave you with access only to the brokerage you file for.'],
  CRS_NOT_ENABLED: ['meNotEnabled', 'Customer risk is not enabled for your account. Ask your administrator for access.'],
  CRS_NO_ACTIVE_COMPANY: ['errorNoActiveCompany', 'No active company is selected. Choose a company from the company menu and try again.'],
  CRS_CROSS_BROKERAGE_DISABLED: ['notInThisVersion', 'This screen is not part of this version.'],
  CRS_FOREIGN_CASE: ['errorForeignCase', 'This case belongs to another brokerage. Other brokerages’ cases cannot be opened in this version.'],
  CRS_CASE_NOT_FOUND: ['errorCaseNotFound', 'No such case was found.'],
  CRS_PERSON_NOT_FOUND: ['errorPersonNotFound', 'No person with this national ID exists yet. Enter the new person’s details.'],
  CRS_PERSON_CREATE_NOT_AVAILABLE: ['errorPersonCreateNotAvailable', 'A new person cannot be created in this version. Only people who already exist can be filed.'],
  CRS_PERSON_FIELDS_REQUIRED: ['errorPersonFieldsRequired', 'A new person needs a first name, a last name, a date of birth and a sex.'],
  CRS_PERSON_DUPLICATE_NATIONAL_ID: ['errorPersonDuplicateNationalId', 'Two people hold this national ID in the person records, so the system will not choose one. This cannot be fixed from this screen; report it to your administrator.'],
  CRS_BIRTH_DATE_NOT_A_DATE:['errorBirthDateNotADate', 'Enter the date of birth again using the calendar.'],
  CRS_INVALID_NATIONAL_ID:['validationNationalIdLength', 'National ID must be exactly 10 digits.'],
  CRS_INVALID_RISK_TYPE: ['validationRiskType', 'Choose a type for every risk.'],
  CRS_RISK_TYPE_SINGLE: ['validationRiskTypeSingle', 'This risk type can be added only once per case.'],
  CRS_RISK_TITLE_REQUIRED: ['validationRiskTitle', 'This risk type needs a title.'],
  CRS_AMOUNT_NEGATIVE: ['validationAmountNegative', 'An amount cannot be negative.'],
  CRS_TEXT_TOO_LONG: ['validationTextTooLong', 'A title can be at most 100 characters and a description at most 1000.'],
  CRS_INVALID_RELATION_TYPE: ['validationRelationType', 'Choose a relation for every related person.'],
  CRS_RELATED_PERSON_DUPLICATE: ['validationRelatedPersonDuplicate', 'The same person is listed more than once.'],
  CRS_ALREADY_ARCHIVED: ['errorAlreadyArchived', 'This case is already archived.'],
  CRS_NOT_ARCHIVED: ['errorNotArchived', 'This case is not archived.'],
  CRS_LEGAL_CUSTOMER_NOT_AVAILABLE: ['notInThisVersion', 'This screen is not part of this version.'],
  CRS_BOURSE_CODE_NOT_AVAILABLE: ['notInThisVersion', 'This screen is not part of this version.'],
  // A company customer. The two *_NATIONAL_ID_UNAVAILABLE codes end like the
  // "cannot answer now" family below but are final refusals, which is why they
  // are named here: a named code always wins over the generic handling.
  CRS_COMPANY_FIELDS_REQUIRED: ['errorCompanyFieldsRequired', 'A new company needs every required field. Fill in the fields marked with *.'],
  CRS_COMPANY_FIELDS_INVALID: ['errorCompanyFieldsInvalid', 'A company field is too long or not in the expected form. Check the entries and try again.'],
  CRS_COMPANY_REGISTRATION_NO_TAKEN: ['errorCompanyRegistrationNoTaken', 'Another company in this country is already registered under this registration number. Check the number.'],
  CRS_COMPANY_ECONOMIC_CODE_TAKEN: ['errorCompanyEconomicCodeTaken', 'Another company in this country already holds this economic code. Check the code.'],
  CRS_COMPANY_FIELDS_NOT_LATIN: ['errorCompanyFieldsNotLatin', 'Registration number and economic code accept only English letters, digits and symbols.'],
  CRS_COMPANY_NATIONAL_ID_UNAVAILABLE: ['errorCompanyNationalIdUnavailable', 'This legal entity ID belongs to a company record that cannot be used, for example a deleted one. This cannot be fixed from this screen; report it to your administrator.'],
  CRS_COMPANY_DUPLICATE_NATIONAL_ID: ['errorCompanyDuplicateNationalId', 'Two companies hold this legal entity ID, so the system will not choose one. This cannot be fixed from this screen; report it to your administrator.'],
  CRS_PERSON_NATIONAL_ID_UNAVAILABLE: ['errorPersonNationalIdUnavailable', 'This national ID belongs to a person record that cannot be used, for example a deleted one. This cannot be fixed from this screen; report it to your administrator.'],
  CRS_INVALID_CUSTOMER_TYPE: ['errorInvalidCustomerType', 'The customer type is not valid. Reload the page and try again.'],
  Unauthorized: ['errorSessionExpired', 'Your session has ended. Sign in again.'],
};

/** Codes that mean "the service cannot answer right now", not "you may not". */
function isUnavailable(error: CrsApiError): boolean {
  return (
    error.status === 0 ||
    error.status >= 500 ||
    error.code.endsWith('_NOT_CONFIGURED') ||
    error.code.endsWith('_UNAVAILABLE') ||
    error.code === 'CRS_SERVICE_UNREACHABLE'
  );
}

export function crsErrorMessage(t: TFunction, error: unknown): string {
  if (!(error instanceof CrsApiError)) {
    return t('errorUnexpected', { defaultValue: 'Something went wrong. Try again.' });
  }
  const known = MESSAGES[error.code];
  if (known) return t(known[0], { defaultValue: known[1] });
  if (isUnavailable(error)) {
    return t('errorServiceUnavailable', {
      defaultValue: 'The customer risk service cannot answer right now. Try again later. ({{code}})',
      code: error.code,
    });
  }
  return t('errorRefused', {
    defaultValue: 'The request was refused ({{code}}).',
    code: error.code,
  });
}

/** True when the error is the given code. */
export function isCrsCode(error: unknown, code: string): boolean {
  return error instanceof CrsApiError && error.code === code;
}
