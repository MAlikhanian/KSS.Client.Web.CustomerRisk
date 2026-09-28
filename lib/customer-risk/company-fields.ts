import {
  ENGLISH_LANGUAGE_ID,
  PERSIAN_LANGUAGE_ID,
  type CompanySummaryDto,
  type NewCompanyFieldsDto,
} from './types';

/**
 * The fields a company customer is filed with. This is the ONE list: the
 * create form, the read-only view of a company that already exists, the
 * checks before saving and the request sent to the service all iterate it.
 * Adding, removing or relaxing a field is a change to this array only.
 *
 * The keys are the service's NewCompanyFieldsDto field names, so a value can
 * be sent under its own key. The company's national id is not in the list: it
 * is the search key, entered before anything else.
 *
 * Nothing here has a default. A company is created with exactly what the
 * operator entered; a required field left empty stops the save rather than
 * being filled with a guess (a date of "today", a first entry in a list).
 */

export type CompanyFieldKind =
  | 'text'
  | 'date'
  /** Chosen from the service's legal-form list. */
  | 'legalForm'
  /** Chosen from the location lists; region follows country, city follows region. */
  | 'country'
  | 'region'
  | 'city';

export interface CompanyFieldDef {
  key: CompanyFieldKey;
  kind: CompanyFieldKind;
  required: boolean;
  /** Key in the customer-risk namespace. */
  i18nKey: string;
  /** English default, identical to en.json. */
  en: string;
  /** Right-to-left text input (a Persian name). */
  rtl?: boolean;
  /** Longest value the service stores. */
  maxLength?: number;
}

export type CompanyFieldKey =
  | 'nameFa'
  | 'nameEn'
  | 'legalFormId'
  | 'registrationDate'
  | 'registrationNo'
  | 'economicCode'
  | 'registrationCountryId'
  | 'registrationRegionId'
  | 'registrationCityId';

export const COMPANY_FIELDS: readonly CompanyFieldDef[] = [
  { key: 'nameFa', kind: 'text', required: true, i18nKey: 'companyFieldNameFa', en: 'Company name (Persian)', rtl: true, maxLength: 150 },
  { key: 'nameEn', kind: 'text', required: false, i18nKey: 'companyFieldNameEn', en: 'Company name (Latin)', maxLength: 150 },
  { key: 'legalFormId', kind: 'legalForm', required: true, i18nKey: 'companyFieldLegalForm', en: 'Legal form' },
  { key: 'registrationDate', kind: 'date', required: true, i18nKey: 'companyFieldRegistrationDate', en: 'Registration date' },
  { key: 'registrationNo', kind: 'text', required: true, i18nKey: 'companyFieldRegistrationNo', en: 'Registration number', maxLength: 30 },
  { key: 'economicCode', kind: 'text', required: true, i18nKey: 'companyFieldEconomicCode', en: 'Economic code', maxLength: 20 },
  { key: 'registrationCountryId', kind: 'country', required: true, i18nKey: 'companyFieldCountry', en: 'Registration country' },
  { key: 'registrationRegionId', kind: 'region', required: true, i18nKey: 'companyFieldRegion', en: 'Registration province' },
  { key: 'registrationCityId', kind: 'city', required: true, i18nKey: 'companyFieldCity', en: 'Registration city' },
];

/** A company's national id (شناسه ملی) is 11 digits. */
export const COMPANY_NATIONAL_ID_LENGTH = 11;

/** Every field as the operator entered it, or as a found company holds it. '' = empty. */
export type CompanyFieldValues = Record<CompanyFieldKey, string>;

export function emptyCompanyFields(): CompanyFieldValues {
  const values = {} as CompanyFieldValues;
  for (const field of COMPANY_FIELDS) values[field.key] = '';
  return values;
}

/** A calendar date with no time and no offset: yyyy-MM-dd, which is what the date picker gives. */
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The first field that stops the save, or null. Required fields must hold a
 * value; a date must be a plain calendar date; a text may not exceed what the
 * service stores.
 */
export function firstCompanyFieldProblem(
  values: CompanyFieldValues,
): { field: CompanyFieldDef; problem: 'required' | 'date' | 'tooLong' } | null {
  for (const field of COMPANY_FIELDS) {
    const value = values[field.key].trim();
    if (!value) {
      if (field.required) return { field, problem: 'required' };
      continue;
    }
    if (field.kind === 'date' && !PLAIN_DATE.test(value)) return { field, problem: 'date' };
    if (field.maxLength && value.length > field.maxLength) return { field, problem: 'tooLong' };
  }
  return null;
}

/** A plain calendar date from a service date-time, or '' when there is none. */
function datePart(value: string | null | undefined): string {
  const head = (value ?? '').slice(0, 10);
  return PLAIN_DATE.test(head) ? head : '';
}

function idText(value: number | null | undefined): string {
  return value ? String(value) : '';
}

/**
 * A found company's details, shaped like the create form's, so the same
 * controls show them. The only place the lookup's shape is read: a field the
 * directory did not return stays empty on screen.
 */
export function foundCompanyValues(company: CompanySummaryDto): CompanyFieldValues {
  const nameIn = (languageId: number) =>
    company.names.find((n) => n.languageId === languageId)?.name?.trim() ?? '';
  const values = emptyCompanyFields();
  values.nameFa = nameIn(PERSIAN_LANGUAGE_ID) || nameIn(0);
  values.nameEn = nameIn(ENGLISH_LANGUAGE_ID);
  values.legalFormId = idText(company.legalFormId);
  values.registrationDate = datePart(company.registrationDate);
  values.registrationNo = company.registrationNo?.trim() ?? '';
  values.economicCode = company.economicCode?.trim() ?? '';
  values.registrationCountryId = idText(company.registrationCountryId);
  values.registrationRegionId = idText(company.registrationRegionId);
  values.registrationCityId = idText(company.registrationCityId);
  return values;
}

/**
 * The request block for a company to create, from values that have passed
 * firstCompanyFieldProblem. The optional Latin name is sent only when entered.
 */
export function newCompanyRequest(values: CompanyFieldValues): NewCompanyFieldsDto {
  const nameEn = values.nameEn.trim();
  return {
    legalFormId: Number(values.legalFormId),
    registrationDate: values.registrationDate.trim(),
    registrationNo: values.registrationNo.trim(),
    economicCode: values.economicCode.trim(),
    registrationCountryId: Number(values.registrationCountryId),
    registrationRegionId: Number(values.registrationRegionId),
    registrationCityId: Number(values.registrationCityId),
    nameFa: values.nameFa.trim(),
    ...(nameEn ? { nameEn } : {}),
  };
}
