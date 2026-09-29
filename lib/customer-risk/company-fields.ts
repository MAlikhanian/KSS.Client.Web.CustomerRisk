import { pickCompanyName } from './format';
import {
  ENGLISH_LANGUAGE_ID,
  PERSIAN_LANGUAGE_ID,
  type CompanySummaryDto,
  type NewCompanyFieldsDto,
} from './types';

/**
 * The fields a company customer is filed with. This is the ONE list: the
 * create form, the read-only view of a company that already exists and the
 * checks before saving all iterate it. Adding, removing or relaxing a field is
 * a change to this array only.
 *
 * The company's national id is not in the list: it is the search key, entered
 * before anything else. The legal form and the registration location are not
 * asked for at all: the service sets them.
 *
 * The name is ONE field, in the language of the screen: a Persian screen files
 * a Persian name and an English screen an English one. Its label names that
 * language, so the operator knows which name is wanted.
 *
 * Nothing here has a default. A required field left empty stops the save
 * rather than being filled with a guess (a date of "today", for example).
 */

export type CompanyFieldKind = 'name' | 'text' | 'date';

export interface CompanyFieldDef {
  key: CompanyFieldKey;
  kind: CompanyFieldKind;
  required: boolean;
  /** Key in the customer-risk namespace. The name's label comes from NAME_LABELS instead. */
  i18nKey: string;
  /** English default, identical to en.json. */
  en: string;
  /** Longest value the service stores. */
  maxLength?: number;
}

export type CompanyFieldKey = 'name' | 'registrationDate' | 'registrationNo' | 'economicCode';

export const COMPANY_FIELDS: readonly CompanyFieldDef[] = [
  { key: 'name', kind: 'name', required: true, i18nKey: 'companyFieldNameFa', en: 'Company name (Persian)', maxLength: 150 },
  { key: 'registrationDate', kind: 'date', required: true, i18nKey: 'companyFieldRegistrationDate', en: 'Registration date' },
  { key: 'registrationNo', kind: 'text', required: true, i18nKey: 'companyFieldRegistrationNo', en: 'Registration number', maxLength: 30 },
  { key: 'economicCode', kind: 'text', required: true, i18nKey: 'companyFieldEconomicCode', en: 'Economic code', maxLength: 20 },
];

/** The name field's label, by the language the name is in. */
const NAME_LABELS: Record<number, { i18nKey: string; en: string }> = {
  [PERSIAN_LANGUAGE_ID]: { i18nKey: 'companyFieldNameFa', en: 'Company name (Persian)' },
  [ENGLISH_LANGUAGE_ID]: { i18nKey: 'companyFieldNameEn', en: 'Company name (English)' },
};

/** The label for a field; the name's follows the language its value is in. */
export function companyFieldLabel(field: CompanyFieldDef, nameLanguageId: number): { i18nKey: string; en: string } {
  if (field.kind !== 'name') return field;
  return NAME_LABELS[nameLanguageId] ?? NAME_LABELS[PERSIAN_LANGUAGE_ID];
}

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
 * The first field that stops the save, or null. Every field must hold a value;
 * a date must be a plain calendar date; a text may not exceed what the service
 * stores. The name's script is not checked: real names mix scripts.
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

/**
 * A found company's details, shaped like the create form's, so the same
 * controls show them. The only place the lookup's shape is read.
 *
 * The name is the one in the screen's language, else the one it has: a company
 * held under one name only is shown by that name, labelled with its language.
 */
export function foundCompanyValues(
  company: CompanySummaryDto,
  screenLanguageId: number,
): { values: CompanyFieldValues; nameLanguageId: number } {
  const name = pickCompanyName(company.names, screenLanguageId);
  const nameLanguageId =
    name && (name.languageId === PERSIAN_LANGUAGE_ID || name.languageId === ENGLISH_LANGUAGE_ID)
      ? name.languageId
      : screenLanguageId;
  const values = emptyCompanyFields();
  values.name = name?.name ?? '';
  values.registrationDate = datePart(company.registrationDate);
  values.registrationNo = company.registrationNo?.trim() ?? '';
  values.economicCode = company.economicCode?.trim() ?? '';
  return { values, nameLanguageId };
}

/**
 * The request block for a company to create, from values that have passed
 * firstCompanyFieldProblem. The name's language is not in the block: it is the
 * request's languageId, the language of the screen the name was typed on.
 */
export function newCompanyRequest(values: CompanyFieldValues): NewCompanyFieldsDto {
  return {
    name: values.name.trim(),
    registrationDate: values.registrationDate.trim(),
    registrationNo: values.registrationNo.trim(),
    economicCode: values.economicCode.trim(),
  };
}
