'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import {
  COMPANY_FIELDS,
  COMPANY_NATIONAL_ID_LENGTH,
  companyFieldLabel,
  emptyCompanyFields,
  firstCompanyFieldProblem,
  foundCompanyValues,
  type CompanyFieldDef,
  type CompanyFieldKey,
  type CompanyFieldValues,
} from '@/lib/customer-risk/company-fields';
import { PERSIAN_LANGUAGE_ID } from '@/lib/customer-risk/types';
import { languageIdFor } from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import type { CompanySummaryDto, CustomerLookupDto } from '@/lib/customer-risk/types';

/** What search-first has said about the company national id in the box. */
export type CompanyLookup =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'found'; company: CompanySummaryDto }
  | { kind: 'notFound' }
  /**
   * The search did not produce an answer. Never read as "not found".
   * `retryable` is false when searching again cannot help.
   */
  | { kind: 'error'; message: string; retryable: boolean };

export interface CompanyEntryValue {
  nationalId: string;
  lookup: CompanyLookup;
  draft: CompanyFieldValues;
}

export function emptyCompanyEntry(): CompanyEntryValue {
  return { nationalId: '', lookup: { kind: 'idle' }, draft: emptyCompanyFields() };
}

/** Refusals that searching again cannot change. */
const TERMINAL_LOOKUP_CODES = ['CRS_COMPANY_DUPLICATE_NATIONAL_ID', 'CRS_COMPANY_NATIONAL_ID_UNAVAILABLE'];

/**
 * Search-first for the case's customer when it is a company: the 11-digit
 * national id is looked up before anything else.
 *
 * A company that IS found is shown in the same controls as the create form,
 * read-only; the form never edits it. A company that is not found is entered
 * with every field in COMPANY_FIELDS, nothing defaulted, and its name in the
 * language of the screen.
 *
 * The lookup is deliberately not limited to the active company: a national id
 * held anywhere in the directory returns that company, and the service decides
 * who may search. `lookup` is supplied by the page, which knows the brokerage
 * the search is asked for.
 */
export function CompanyEntry({
  value,
  onChange,
  lookup: lookupCompany,
  disabled,
  searchBlockedReason,
  idPrefix,
}: {
  value: CompanyEntryValue;
  onChange: (next: CompanyEntryValue) => void;
  lookup: (nationalId: string) => Promise<CustomerLookupDto>;
  disabled?: boolean;
  searchBlockedReason?: string;
  idPrefix: string;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const screenLanguageId = languageIdFor(i18n.language);
  const { nationalId, lookup, draft } = value;
  const found = lookup.kind === 'found' ? foundCompanyValues(lookup.company, screenLanguageId) : null;

  const setNationalId = (raw: string) => {
    const next = toEnglishDigits(raw).replace(/[^0-9]/g, '').slice(0, COMPANY_NATIONAL_ID_LENGTH);
    if (next === nationalId) return;
    // A result belongs to the id it was asked for. A changed id starts over,
    // and so do any fields typed for the previous one.
    onChange({ nationalId: next, lookup: { kind: 'idle' }, draft: emptyCompanyFields() });
  };

  const setDraft = (patch: Partial<CompanyFieldValues>) => onChange({ ...value, draft: { ...draft, ...patch } });

  const search = async () => {
    if (searchBlockedReason || nationalId.length !== COMPANY_NATIONAL_ID_LENGTH) return;
    const askedFor = nationalId;
    onChange({ ...value, lookup: { kind: 'searching' } });
    try {
      const result = await lookupCompany(askedFor);
      onChange({
        nationalId: askedFor,
        draft,
        lookup: result.found && result.company ? { kind: 'found', company: result.company } : { kind: 'notFound' },
      });
    } catch (error) {
      onChange({
        nationalId: askedFor,
        draft,
        lookup: {
          kind: 'error',
          message: crsErrorMessage(t, error),
          retryable: !TERMINAL_LOOKUP_CODES.some((code) => isCrsCode(error, code)),
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 w-full max-w-xs">
          <Label htmlFor={`${idPrefix}-nid`}>
            {t('customerLegalId', { defaultValue: 'Legal entity ID' })}
            <span className="text-destructive ms-1">*</span>
          </Label>
          <Input
            id={`${idPrefix}-nid`}
            inputMode="numeric"
            dir="ltr"
            maxLength={COMPANY_NATIONAL_ID_LENGTH}
            value={nationalId}
            disabled={disabled || lookup.kind === 'searching'}
            onChange={(e) => setNationalId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (lookup.kind !== 'error' || lookup.retryable) void search();
              }
            }}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={
            disabled ||
            !!searchBlockedReason ||
            nationalId.length !== COMPANY_NATIONAL_ID_LENGTH ||
            lookup.kind === 'searching' ||
            (lookup.kind === 'error' && !lookup.retryable)
          }
          onClick={() => void search()}
        >
          <Search className="size-4" />
          {lookup.kind === 'searching'
            ? t('searching', { defaultValue: 'Searching…' })
            : t('searchPerson', { defaultValue: 'Search' })}
        </Button>
      </div>

      {lookup.kind === 'idle' && searchBlockedReason && (
        <p className="text-xs text-destructive">{searchBlockedReason}</p>
      )}

      {lookup.kind === 'idle' && !searchBlockedReason && (
        <p className="text-xs text-muted-foreground">
          {t('companySearchFirstHint', {
            defaultValue: 'Enter the 11-digit legal entity ID and search. A company that already exists is linked as-is.',
          })}
        </p>
      )}

      {lookup.kind === 'error' && <p className="text-sm text-destructive">{lookup.message}</p>}

      {found && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('companyFound', { defaultValue: 'Found. This existing company will be linked to the case.' })}
          </p>
          <CompanyFields
            idPrefix={`${idPrefix}-found`}
            values={found.values}
            nameLanguageId={found.nameLanguageId}
            readOnly
            disabled={disabled}
          />
        </div>
      )}

      {lookup.kind === 'notFound' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('companyNotFoundNew', {
              defaultValue: 'No company with this legal entity ID exists yet. Enter the new company’s details.',
            })}
          </p>
          <CompanyFields
            idPrefix={idPrefix}
            values={draft}
            nameLanguageId={screenLanguageId}
            onChange={setDraft}
            readOnly={false}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Every field in COMPANY_FIELDS, in order. The same controls serve the create
 * form and a company that already exists; `readOnly` shows the latter. The
 * name is labelled, and written, in `nameLanguageId`.
 */
function CompanyFields({
  idPrefix,
  values,
  nameLanguageId,
  onChange,
  readOnly,
  disabled,
}: {
  idPrefix: string;
  values: CompanyFieldValues;
  nameLanguageId: number;
  onChange?: (patch: Partial<CompanyFieldValues>) => void;
  readOnly: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation('customer-risk');
  const locked = readOnly || !!disabled;

  const set = (key: CompanyFieldKey, next: string) => {
    if (readOnly || !onChange) return;
    onChange({ [key]: next } as Partial<CompanyFieldValues>);
  };

  const label = (field: CompanyFieldDef, htmlFor?: string) => {
    const text = companyFieldLabel(field, nameLanguageId);
    return (
      <Label htmlFor={htmlFor}>
        {t(text.i18nKey, { defaultValue: text.en })}
        {field.required && !readOnly && <span className="text-destructive ms-1">*</span>}
      </Label>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COMPANY_FIELDS.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const current = values[field.key];

        if (field.kind === 'date') {
          return (
            <div key={field.key} className="space-y-1">
              {label(field)}
              <DatePickerComponent value={current} disabled={locked} onChange={(v) => set(field.key, v)} />
            </div>
          );
        }

        return (
          <div key={field.key} className="space-y-1">
            {label(field, id)}
            <Input
              id={id}
              dir={field.kind === 'name' ? (nameLanguageId === PERSIAN_LANGUAGE_ID ? 'rtl' : 'ltr') : undefined}
              maxLength={field.maxLength}
              value={current}
              disabled={locked}
              onChange={(e) => set(field.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Why this entry cannot be filed yet, or null when it can. The same rules the
 * service applies, checked first so the operator hears about all of them in
 * one place.
 */
export function companyEntryProblem(
  t: (key: string, options: Record<string, unknown> & { defaultValue: string }) => string,
  value: CompanyEntryValue,
  screenLanguageId: number,
): string | null {
  const { lookup, draft } = value;
  if (value.nationalId.length !== COMPANY_NATIONAL_ID_LENGTH) {
    return t('validationLegalIdLength', { defaultValue: 'Legal entity ID must be exactly 11 digits.' });
  }
  if (lookup.kind === 'error') {
    return lookup.retryable
      ? t('validationSearchFirst', { defaultValue: 'Search the national ID before saving.' })
      : lookup.message;
  }
  if (lookup.kind === 'idle') {
    return t('validationSearchFirst', { defaultValue: 'Search the national ID before saving.' });
  }
  if (lookup.kind === 'searching') {
    return t('validationStillSearching', { defaultValue: 'Still searching — try again in a moment.' });
  }
  if (lookup.kind === 'found') return null;

  const problem = firstCompanyFieldProblem(draft);
  if (!problem) return null;
  const text = companyFieldLabel(problem.field, screenLanguageId);
  const field = t(text.i18nKey, { defaultValue: text.en });
  if (problem.problem === 'date') {
    return t('validationCompanyDate', { defaultValue: 'Enter the registration date again using the calendar.' });
  }
  if (problem.problem === 'tooLong') {
    return t('validationCompanyFieldTooLong', { defaultValue: '{{field}} is too long.', field });
  }
  return t('validationCompanyFieldRequired', { defaultValue: '{{field}} is required.', field });
}
