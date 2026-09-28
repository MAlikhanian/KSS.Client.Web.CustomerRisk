'use client';

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
import { languageIdFor, lookupName, personName, pickByLanguage } from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import type { CustomerLookupDto, ExternalLookupDto, PersonSummaryDto } from '@/lib/customer-risk/types';

export const NATIONAL_ID_LENGTH = 10;

/** A calendar date with no time and no offset: yyyy-MM-dd, which is what the date picker gives. */
const PLAIN_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What search-first has said about the national id currently in the box. */
export type PersonLookup =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'found'; person: PersonSummaryDto }
  | { kind: 'notFound' }
  /**
   * The search did not produce an answer. Never read as "not found": a
   * service that could not answer says nothing about whether the person
   * exists, so no new-person fields are offered. `retryable` is false when
   * searching again cannot help (two people hold the id in Person).
   */
  | { kind: 'error'; message: string; retryable: boolean };

/** A new person, exactly as the operator entered them. Nothing here has a default. */
export interface NewPersonDraft {
  firstName: string;
  lastName: string;
  fatherName: string;
  /** Gregorian YYYY-MM-DD from the date picker, or ''. */
  dateOfBirth: string;
  /** 0 = nothing chosen. Never sent as a sex. */
  sexId: number;
}

export interface PersonEntryValue {
  nationalId: string;
  lookup: PersonLookup;
  draft: NewPersonDraft;
}

export const EMPTY_DRAFT: NewPersonDraft = {
  firstName: '',
  lastName: '',
  fatherName: '',
  dateOfBirth: '',
  sexId: 0,
};

export function emptyPersonEntry(): PersonEntryValue {
  return { nationalId: '', lookup: { kind: 'idle' }, draft: { ...EMPTY_DRAFT } };
}

/** The sex list's state, as the parent loaded it. */
export interface SexOptionsState {
  options: ExternalLookupDto[];
  pending: boolean;
  /** Settled with an error, or settled with no rows: either way nobody can choose. */
  unavailable: boolean;
}

/**
 * Search-first for one person: the national id is looked up before anything
 * else, and the new-person fields appear only when the directory does not
 * hold it.
 *
 * A person who IS found is shown by national id and name only, unless
 * `personLookupV2Enabled` is true: then the lookup returns their details and
 * they are shown in the same controls as the create form, read-only. Either
 * way nothing is edited: the service links the existing person and ignores any
 * fields sent for them.
 *
 * The new-person fields are offered only when `personCreateEnabled` is true.
 * False or unknown keeps them closed, so the page never offers a creation the
 * service has not switched on.
 *
 * `lookup` is supplied by the page, because the page knows which brokerage
 * the search is asked for. `searchBlockedReason`, when set, keeps the search
 * closed and says why (for example, no brokerage has been chosen yet).
 */
export function PersonEntry({
  value,
  onChange,
  lookup: lookupPerson,
  sexOptions,
  personCreateEnabled,
  personLookupV2Enabled,
  disabled,
  searchBlockedReason,
  idPrefix,
}: {
  value: PersonEntryValue;
  onChange: (next: PersonEntryValue) => void;
  lookup: (nationalId: string) => Promise<CustomerLookupDto>;
  sexOptions: SexOptionsState;
  personCreateEnabled: boolean | undefined;
  personLookupV2Enabled: boolean | undefined;
  disabled?: boolean;
  searchBlockedReason?: string;
  idPrefix: string;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const { nationalId, lookup, draft } = value;

  const setNationalId = (raw: string) => {
    const next = toEnglishDigits(raw).replace(/[^0-9]/g, '').slice(0, NATIONAL_ID_LENGTH);
    if (next === nationalId) return;
    // A result belongs to the id it was asked for. A changed id starts over,
    // and so do any new-person fields typed for the previous one.
    onChange({ nationalId: next, lookup: { kind: 'idle' }, draft: { ...EMPTY_DRAFT } });
  };

  const setDraft = (patch: Partial<NewPersonDraft>) => onChange({ ...value, draft: { ...draft, ...patch } });

  const search = async () => {
    if (searchBlockedReason || nationalId.length !== NATIONAL_ID_LENGTH) return;
    const askedFor = nationalId;
    onChange({ ...value, lookup: { kind: 'searching' } });
    try {
      const result = await lookupPerson(askedFor);
      onChange({
        nationalId: askedFor,
        draft,
        lookup: result.found && result.person ? { kind: 'found', person: result.person } : { kind: 'notFound' },
      });
    } catch (error) {
      onChange({
        nationalId: askedFor,
        draft,
        lookup: {
          kind: 'error',
          message: crsErrorMessage(t, error),
          retryable:
            !isCrsCode(error, 'CRS_PERSON_DUPLICATE_NATIONAL_ID') &&
            !isCrsCode(error, 'CRS_PERSON_NATIONAL_ID_UNAVAILABLE'),
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1 w-full max-w-xs">
          <Label htmlFor={`${idPrefix}-nid`}>
            {t('customerNationalId', { defaultValue: 'National ID' })}
            <span className="text-destructive ms-1">*</span>
          </Label>
          <Input
            id={`${idPrefix}-nid`}
            inputMode="numeric"
            dir="ltr"
            maxLength={NATIONAL_ID_LENGTH}
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
            nationalId.length !== NATIONAL_ID_LENGTH ||
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
          {t('searchFirstHint', {
            defaultValue: 'Enter the 10-digit national ID and search. A person who already exists is linked as-is.',
          })}
        </p>
      )}

      {lookup.kind === 'error' && <p className="text-sm text-destructive">{lookup.message}</p>}

      {lookup.kind === 'found' && personLookupV2Enabled !== true && (
        <div className="rounded-lg border px-4 py-3 text-sm">
          <div className="text-xs text-muted-foreground mb-1">
            {t('personFound', { defaultValue: 'Found. This existing person will be linked to the case.' })}
          </div>
          <div className="font-medium">
            {personName(lookup.person.names, languageId) ||
              t('customerNameUnavailable', { defaultValue: 'Name unavailable' })}
            <span className="font-mono text-xs text-muted-foreground ms-2">{lookup.person.nationalId}</span>
          </div>
        </div>
      )}

      {lookup.kind === 'found' && personLookupV2Enabled === true && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('personFound', { defaultValue: 'Found. This existing person will be linked to the case.' })}
          </p>
          <PersonFields
            idPrefix={`${idPrefix}-found`}
            values={foundPersonValues(lookup.person, languageId)}
            readOnly
            disabled={disabled}
            sexOptions={sexOptions}
          />
        </div>
      )}

      {lookup.kind === 'notFound' && personCreateEnabled !== true && (
        <p className="text-sm text-destructive">
          {t('errorPersonCreateNotAvailable', {
            defaultValue: 'A new person cannot be created in this version. Only people who already exist can be filed.',
          })}
        </p>
      )}

      {lookup.kind === 'notFound' && personCreateEnabled === true && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t('personNotFoundNew', {
              defaultValue:
                'No person with this national ID exists yet. Enter the new person’s details; they are saved in the language of this screen.',
            })}
          </p>
          <PersonFields
            idPrefix={idPrefix}
            values={draft}
            onChange={setDraft}
            readOnly={false}
            disabled={disabled}
            sexOptions={sexOptions}
          />
        </div>
      )}
    </div>
  );
}

/** A plain calendar date from a service date-time, or '' when there is none. */
function datePart(value: string | null | undefined): string {
  const head = (value ?? '').slice(0, 10);
  return PLAIN_DATE.test(head) ? head : '';
}

/**
 * A found person's details, shaped like the create form's, so the same
 * controls show them. A detail the directory did not return stays empty.
 */
export function foundPersonValues(person: PersonSummaryDto, languageId: number): NewPersonDraft {
  const name = pickByLanguage(person.names, languageId);
  return {
    firstName: name?.firstName?.trim() ?? '',
    lastName: name?.lastName?.trim() ?? '',
    fatherName: name?.fatherName?.trim() ?? '',
    dateOfBirth: datePart(person.dateOfBirth),
    sexId: person.sexId ?? 0,
  };
}

/**
 * The five person fields after the national id. The same controls serve the
 * create form and a person who already exists; `readOnly` shows the latter,
 * which the form never edits: an existing person is linked as they are.
 */
function PersonFields({
  idPrefix,
  values,
  onChange,
  readOnly,
  disabled,
  sexOptions,
}: {
  idPrefix: string;
  values: NewPersonDraft;
  onChange?: (patch: Partial<NewPersonDraft>) => void;
  readOnly: boolean;
  disabled?: boolean;
  sexOptions: SexOptionsState;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const locked = readOnly || !!disabled;
  const set = (patch: Partial<NewPersonDraft>) => {
    if (!readOnly) onChange?.(patch);
  };
  const required = readOnly ? null : <span className="text-destructive ms-1">*</span>;

  const sexPlaceholder = readOnly
    ? '—'
    : sexOptions.pending
      ? t('loading', { defaultValue: 'Loading…' })
      : sexOptions.unavailable
        ? t('customerSexUnavailableV1', {
            defaultValue: 'Unavailable — a new person cannot be filed until the list loads',
          })
        : t('select', { defaultValue: 'Select' });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-first`}>
          {t('customerFirstName', { defaultValue: 'First name' })}
          {required}
        </Label>
        <Input
          id={`${idPrefix}-first`}
          value={values.firstName}
          disabled={locked}
          onChange={(e) => set({ firstName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-last`}>
          {t('customerLastName', { defaultValue: 'Last name' })}
          {required}
        </Label>
        <Input
          id={`${idPrefix}-last`}
          value={values.lastName}
          disabled={locked}
          onChange={(e) => set({ lastName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}-father`}>{t('fatherName', { defaultValue: "Father's name" })}</Label>
        <Input
          id={`${idPrefix}-father`}
          value={values.fatherName}
          disabled={locked}
          onChange={(e) => set({ fatherName: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label>
          {t('dateOfBirth', { defaultValue: 'Date of birth' })}
          {required}
        </Label>
        <DatePickerComponent value={values.dateOfBirth} disabled={locked} onChange={(v) => set({ dateOfBirth: v })} />
      </div>
      {/* No preselected value, and the placeholder is not an option: a
          default would be an assertion about a real person that nobody
          made. The service refuses a new person without a sex. */}
      <div className="space-y-1">
        <Label>
          {t('customerSex', { defaultValue: 'Sex' })}
          {required}
        </Label>
        <Select
          value={values.sexId ? String(values.sexId) : undefined}
          onValueChange={(v) => set({ sexId: Number(v) })}
          disabled={locked || sexOptions.pending || sexOptions.unavailable}
        >
          <SelectTrigger>
            <SelectValue placeholder={sexPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {sexOptions.options.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {lookupName(s.names, languageId) || String(s.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

/**
 * Why this entry cannot be filed yet, or null when it can. The same rules the
 * service applies, checked first so the operator hears about all of them in
 * one place instead of one refusal at a time.
 */
export function personEntryProblem(
  t: (key: string, options: { defaultValue: string }) => string,
  value: PersonEntryValue,
  personCreateEnabled: boolean | undefined,
  sexOptions: SexOptionsState,
): string | null {
  const { lookup, draft } = value;
  if (value.nationalId.length !== NATIONAL_ID_LENGTH) {
    return t('validationNationalIdLength', { defaultValue: 'National ID must be exactly 10 digits.' });
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

  if (personCreateEnabled !== true) {
    return t('errorPersonCreateNotAvailable', {
      defaultValue: 'A new person cannot be created in this version. Only people who already exist can be filed.',
    });
  }
  if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.dateOfBirth) {
    return t('errorPersonFieldsRequired', {
      defaultValue: 'A new person needs a first name, a last name, a date of birth and a sex.',
    });
  }
  // The service takes a plain calendar date and refuses anything with a time
  // or an offset, because the day would already have been shifted by then.
  if (!PLAIN_DATE.test(draft.dateOfBirth)) {
    return t('errorBirthDateNotADate', { defaultValue: 'Enter the date of birth again using the calendar.' });
  }
  if (sexOptions.pending) {
    return t('validationSexListPending', { defaultValue: 'The sex list is still loading — try again in a moment.' });
  }
  if (!draft.sexId) {
    return sexOptions.unavailable
      ? t('customerSexUnavailableV1', {
          defaultValue: 'Unavailable — a new person cannot be filed until the list loads',
        })
      : t('validationPersonSex', { defaultValue: 'Select the sex.' });
  }
  return null;
}
