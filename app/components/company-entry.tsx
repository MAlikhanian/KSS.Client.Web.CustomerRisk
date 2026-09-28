'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import { getLocations } from '@/lib/customer-risk/api';
import {
  COMPANY_FIELDS,
  COMPANY_NATIONAL_ID_LENGTH,
  emptyCompanyFields,
  firstCompanyFieldProblem,
  foundCompanyValues,
  type CompanyFieldDef,
  type CompanyFieldKey,
  type CompanyFieldValues,
} from '@/lib/customer-risk/company-fields';
import { ENGLISH_LANGUAGE_ID } from '@/lib/customer-risk/types';
import { languageIdFor, lookupName } from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import type { CompanySummaryDto, CustomerLookupDto, ExternalLookupDto } from '@/lib/customer-risk/types';

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

/** The legal-form list's state, as the page loaded it. */
export interface LegalFormOptionsState {
  options: ExternalLookupDto[];
  pending: boolean;
  /** Settled with an error, or settled with no rows: either way nobody can choose. */
  unavailable: boolean;
}

/** Refusals that searching again cannot change. */
const TERMINAL_LOOKUP_CODES = ['CRS_COMPANY_DUPLICATE_NATIONAL_ID', 'CRS_COMPANY_NATIONAL_ID_UNAVAILABLE'];

/**
 * Search-first for the case's customer when it is a company: the 11-digit
 * national id is looked up before anything else.
 *
 * A company that IS found is shown in the same controls as the create form,
 * read-only; the form never edits it. A company that is not found is entered
 * in full: every field in COMPANY_FIELDS, with nothing defaulted.
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
  legalForms,
  disabled,
  searchBlockedReason,
  idPrefix,
}: {
  value: CompanyEntryValue;
  onChange: (next: CompanyEntryValue) => void;
  lookup: (nationalId: string) => Promise<CustomerLookupDto>;
  legalForms: LegalFormOptionsState;
  disabled?: boolean;
  searchBlockedReason?: string;
  idPrefix: string;
}) {
  const { t } = useTranslation('customer-risk');
  const { nationalId, lookup, draft } = value;

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

      {lookup.kind === 'found' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('companyFound', { defaultValue: 'Found. This existing company will be linked to the case.' })}
          </p>
          <CompanyFields
            idPrefix={`${idPrefix}-found`}
            values={foundCompanyValues(lookup.company)}
            readOnly
            disabled={disabled}
            legalForms={legalForms}
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
            onChange={setDraft}
            readOnly={false}
            disabled={disabled}
            legalForms={legalForms}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Every field in COMPANY_FIELDS, in order. The same controls serve the create
 * form and a company that already exists; `readOnly` shows the latter.
 */
function CompanyFields({
  idPrefix,
  values,
  onChange,
  readOnly,
  disabled,
  legalForms,
}: {
  idPrefix: string;
  values: CompanyFieldValues;
  onChange?: (patch: Partial<CompanyFieldValues>) => void;
  readOnly: boolean;
  disabled?: boolean;
  legalForms: LegalFormOptionsState;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const locked = readOnly || !!disabled;

  const set = (key: CompanyFieldKey, next: string) => {
    if (readOnly || !onChange) return;
    // A province belongs to a country and a city to a province: changing the
    // parent clears what depended on it rather than keeping a mismatch.
    if (key === 'registrationCountryId') {
      onChange({ registrationCountryId: next, registrationRegionId: '', registrationCityId: '' });
    } else if (key === 'registrationRegionId') {
      onChange({ registrationRegionId: next, registrationCityId: '' });
    } else {
      onChange({ [key]: next } as Partial<CompanyFieldValues>);
    }
  };

  const label = (field: CompanyFieldDef, htmlFor?: string) => (
    <Label htmlFor={htmlFor}>
      {t(field.i18nKey, { defaultValue: field.en })}
      {field.required && !readOnly && <span className="text-destructive ms-1">*</span>}
    </Label>
  );

  const placeholder = readOnly ? '—' : t('select', { defaultValue: 'Select' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COMPANY_FIELDS.map((field) => {
        const id = `${idPrefix}-${field.key}`;
        const current = values[field.key];

        if (field.kind === 'text') {
          return (
            <div key={field.key} className="space-y-1">
              {label(field, id)}
              <Input
                id={id}
                dir={field.rtl ? 'rtl' : undefined}
                maxLength={field.maxLength}
                value={current}
                disabled={locked}
                onChange={(e) => set(field.key, e.target.value)}
              />
            </div>
          );
        }

        if (field.kind === 'date') {
          return (
            <div key={field.key} className="space-y-1">
              {label(field)}
              <DatePickerComponent value={current} disabled={locked} onChange={(v) => set(field.key, v)} />
            </div>
          );
        }

        if (field.kind === 'legalForm') {
          const legalPlaceholder = readOnly
            ? '—'
            : legalForms.pending
              ? t('loading', { defaultValue: 'Loading…' })
              : legalForms.unavailable
                ? t('companyLegalFormUnavailable', {
                    defaultValue: 'Unavailable — a new company cannot be filed until the list loads',
                  })
                : placeholder;
          return (
            <div key={field.key} className="space-y-1">
              {label(field)}
              <Select
                value={current || undefined}
                onValueChange={(v) => set(field.key, v)}
                disabled={locked || legalForms.pending || legalForms.unavailable}
              >
                <SelectTrigger>
                  <SelectValue placeholder={legalPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {legalForms.options.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {lookupName(f.names, languageId) || String(f.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        const parentId =
          field.kind === 'region'
            ? values.registrationCountryId
            : field.kind === 'city'
              ? values.registrationRegionId
              : undefined;
        return (
          <div key={field.key} className="space-y-1">
            {label(field)}
            <LocationSelect
              kind={field.kind}
              parentId={parentId}
              value={current}
              onChange={(v) => set(field.key, v)}
              locked={locked}
              readOnly={readOnly}
              english={languageId === ENGLISH_LANGUAGE_ID}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * One level of the location lists. A province list waits for a country and a
 * city list for a province. A read-only field still loads its list, only to
 * show the chosen entry's name.
 */
function LocationSelect({
  kind,
  parentId,
  value,
  onChange,
  locked,
  readOnly,
  english,
}: {
  kind: 'country' | 'region' | 'city';
  parentId?: string;
  value: string;
  onChange: (value: string) => void;
  locked: boolean;
  readOnly: boolean;
  english: boolean;
}) {
  const { t } = useTranslation('customer-risk');
  const type = kind === 'country' ? 'countries' : kind === 'region' ? 'provinces' : 'cities';
  const needsParent = kind !== 'country';
  const ready = !needsParent || !!parentId;
  const wanted = readOnly ? !!value && ready : ready;

  const query = useQuery({
    queryKey: ['customer-risk', 'locations', type, parentId ?? ''],
    queryFn: () => getLocations(type, parentId),
    enabled: wanted,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const options = query.data ?? [];
  const failed = !!query.error;
  const placeholder = readOnly
    ? '—'
    : !ready
      ? t('companyLocationParentFirst', { defaultValue: 'Choose the previous level first' })
      : query.isPending
        ? t('loading', { defaultValue: 'Loading…' })
        : failed
          ? t('companyLocationUnavailable', { defaultValue: 'The list could not be loaded' })
          : t('select', { defaultValue: 'Select' });

  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={locked || !ready || query.isPending || failed}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={String(o.id)}>
            {(english ? o.nameEn?.trim() : '') || o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  const field = t(problem.field.i18nKey, { defaultValue: problem.field.en });
  if (problem.problem === 'date') {
    return t('validationCompanyDate', { defaultValue: 'Enter the registration date again using the calendar.' });
  }
  if (problem.problem === 'tooLong') {
    return t('validationCompanyFieldTooLong', { defaultValue: '{{field}} is too long.', field });
  }
  return t('validationCompanyFieldRequired', { defaultValue: '{{field}} is required.', field });
}
