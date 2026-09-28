'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  createCase,
  getLegalForms,
  getLookups,
  getSexes,
  listFilingBrokerages,
  lookupCompany,
  lookupPerson,
} from '@/lib/customer-risk/api';
import { newCompanyRequest } from '@/lib/customer-risk/company-fields';
import { companyName, languageIdFor } from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import {
  CrsPermission,
  INDIVIDUAL_CUSTOMER_TYPE_CODE,
  LEGAL_CUSTOMER_TYPE_CODE,
  type CaseItemInputDto,
  type CreateCaseRequestDto,
  type LookupsDto,
  type MeDto,
  type NewPersonFieldsDto,
} from '@/lib/customer-risk/types';
import {
  BrokeragePicker,
  type BrokerageOption,
  type BrokerageOptionsState,
} from '../components/brokerage-picker';
import {
  CompanyEntry,
  companyEntryProblem,
  emptyCompanyEntry,
  type CompanyEntryValue,
  type LegalFormOptionsState,
} from '../components/company-entry';
import {
  CrsAccessGate,
  CrsNotice,
  companyCustomersEnabled,
  personCreateEnabled as personCreateOn,
  personLookupV2Enabled as personLookupV2On,
  useBrokerageLabel,
} from '../components/crs-access';
import { CrsPage } from '../components/crs-page';
import { showError, showSuccess } from '../components/crs-toast';
import {
  PersonEntry,
  emptyPersonEntry,
  personEntryProblem,
  type PersonEntryValue,
  type SexOptionsState,
} from '../components/person-entry';
import { RelatedPersonsEditor, type RelatedPersonDraft } from '../components/related-persons-editor';
import {
  RISK_DESCRIPTION_MAX,
  RISK_TITLE_MAX,
  RisksEditor,
  type RiskDraft,
} from '../components/risks-editor';

export function NewCaseContent() {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage title={t('pageTitleNewCase', { defaultValue: 'New Risk Case' })} description={t('descNewCase')}>
      <CrsAccessGate permission={CrsPermission.CaseModify} files>
        {(me) => <NewCaseForm me={me} />}
      </CrsAccessGate>
    </CrsPage>
  );
}

function NewCaseForm({ me }: { me: MeDto }) {
  const { t } = useTranslation('customer-risk');
  const { data: lookups, error } = useQuery({
    queryKey: ['customer-risk', 'lookups'],
    queryFn: getLookups,
    staleTime: 5 * 60 * 1000,
  });

  if (error) return <CrsNotice tone="destructive" title={crsErrorMessage(t, error)} />;
  if (!lookups) return <CrsNotice tone="info" title={t('loading', { defaultValue: 'Loading…' })} />;

  const individual = lookups.customerTypes.find((c) => c.code === INDIVIDUAL_CUSTOMER_TYPE_CODE);
  const legal = lookups.customerTypes.find((c) => c.code === LEGAL_CUSTOMER_TYPE_CODE);
  if (!individual) {
    // The id to send comes from the service's own list, and a person customer
    // is always possible. Without it there is nothing correct to send.
    return (
      <CrsNotice
        tone="destructive"
        title={t('errorNoIndividualType', {
          defaultValue: 'The service did not return the Individual customer type, so a case cannot be filed.',
        })}
      />
    );
  }

  return (
    <NewCaseFields me={me} lookups={lookups} individualTypeId={individual.id} legalTypeId={legal?.id} />
  );
}

function NewCaseFields({
  me,
  lookups,
  individualTypeId,
  legalTypeId,
}: {
  me: MeDto;
  lookups: LookupsDto;
  individualTypeId: number;
  /** The Legal customer type's id, when the service's list carries it. */
  legalTypeId: number | undefined;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const router = useRouter();
  const queryClient = useQueryClient();
  const brokerageLabel = useBrokerageLabel();
  const personCreateEnabled = me.personCreateEnabled;
  const personLookupV2Enabled = me.personLookupV2Enabled;
  const languageId = languageIdFor(i18n.language);

  // ── Person or company ─────────────────────────────────────────────────────
  // A company customer is offered only when the service switches it on AND its
  // list carries the Legal type to send. Otherwise the form stays exactly as it
  // was: a person, and nothing to choose.
  const companyOffered = companyCustomersEnabled(me) && legalTypeId !== undefined;
  const companyTypeMissing = companyCustomersEnabled(me) && legalTypeId === undefined;
  const [customerKind, setCustomerKind] = useState<'person' | 'company'>('person');
  const isCompany = companyOffered && customerKind === 'company';

  const [customer, setCustomer] = useState<PersonEntryValue>(emptyPersonEntry);
  const [company, setCompany] = useState<CompanyEntryValue>(emptyCompanyEntry);
  const [related, setRelated] = useState<RelatedPersonDraft[]>([]);
  const [risks, setRisks] = useState<RiskDraft[]>([]);
  const [notes, setNotes] = useState('');

  // ── The filing brokerage, for a caller who chooses it ────────────────────
  // Only when the service says so (Me.chooseBrokerage). A caller tied to one
  // brokerage never sees the picker and never sends a brokerage: the service
  // derives it, and would refuse a different one.
  const choose = me.chooseBrokerage === true;
  const [brokerageId, setBrokerageId] = useState<string | null>(null);

  const brokeragesQuery = useQuery({
    queryKey: ['customer-risk', 'filing-brokerages'],
    queryFn: listFilingBrokerages,
    enabled: choose,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const brokerageOptions: BrokerageOption[] = (brokeragesQuery.data ?? []).map((b) => ({
    id: b.id,
    label: companyName(b.names, languageId) || b.id,
  }));
  const brokerageState: BrokerageOptionsState = brokeragesQuery.error
    ? { kind: 'error', message: crsErrorMessage(t, brokeragesQuery.error) }
    : brokeragesQuery.data
      ? { kind: 'loaded', options: brokerageOptions }
      : { kind: 'pending' };

  // A search result was given for the brokerage it was asked for. Choosing a
  // different brokerage clears every result; the national ids and any typed
  // new-person fields stay, and the operator searches again.
  const chooseBrokerage = (id: string) => {
    if (id === brokerageId) return;
    setBrokerageId(id);
    setCustomer((prev) => ({ ...prev, lookup: { kind: 'idle' } }));
    setCompany((prev) => ({ ...prev, lookup: { kind: 'idle' } }));
    setRelated((prev) => prev.map((r) => ({ ...r, person: { ...r.person, lookup: { kind: 'idle' } } })));
  };

  // While any search is in flight the brokerage cannot change, so a result can
  // never arrive for a brokerage that is no longer the chosen one.
  const anySearching =
    customer.lookup.kind === 'searching' ||
    company.lookup.kind === 'searching' ||
    related.some((r) => r.person.lookup.kind === 'searching');

  const lookup = (nationalId: string) =>
    lookupPerson(nationalId, choose && brokerageId ? brokerageId : undefined);
  const lookupCompanyCustomer = (nationalId: string) =>
    lookupCompany(nationalId, choose && brokerageId ? brokerageId : undefined);
  const searchBlockedReason =
    choose && !brokerageId
      ? t('chooseBrokerageFirst', { defaultValue: 'Choose the brokerage first.' })
      : undefined;

  // Row keys for React only; a counter, never a generated GUID, and never sent.
  const nextKey = useRef(0);
  const newKey = () => `row-${++nextKey.current}`;

  // The sex list is needed once some person is to be created, or a found person
  // holds a sex to show (only when found persons are shown with their details).
  // Three states, and they must not be conflated: pending
  // (do not know yet), unavailable (settled with an error or with nothing —
  // nobody can choose), and loaded.
  const persons = isCompany ? related.map((r) => r.person) : [customer, ...related.map((r) => r.person)];
  const needsSexes = persons.some(
    (p) =>
      (personCreateOn(me) && p.lookup.kind === 'notFound') ||
      (personLookupV2On(me) && p.lookup.kind === 'found' && p.lookup.person.sexId != null),
  );
  const sexesQuery = useQuery({
    queryKey: ['customer-risk', 'sexes'],
    queryFn: getSexes,
    staleTime: 5 * 60 * 1000,
    enabled: needsSexes,
  });
  const sexOptions: SexOptionsState = {
    options: sexesQuery.data ?? [],
    pending: needsSexes && sexesQuery.isPending,
    unavailable: !!sexesQuery.error || (!!sexesQuery.data && sexesQuery.data.length === 0),
  };

  // The legal-form list, once a company is to be created or a found one shown.
  const needsLegalForms = isCompany && (company.lookup.kind === 'notFound' || company.lookup.kind === 'found');
  const legalFormsQuery = useQuery({
    queryKey: ['customer-risk', 'legal-forms'],
    queryFn: getLegalForms,
    staleTime: 5 * 60 * 1000,
    enabled: needsLegalForms,
    retry: false,
  });
  const legalForms: LegalFormOptionsState = {
    options: legalFormsQuery.data ?? [],
    pending: needsLegalForms && legalFormsQuery.isPending,
    unavailable: !!legalFormsQuery.error || (!!legalFormsQuery.data && legalFormsQuery.data.length === 0),
  };

  const newPersonFields = (entry: PersonEntryValue): NewPersonFieldsDto | undefined => {
    if (entry.lookup.kind !== 'notFound') return undefined;
    const d = entry.draft;
    return {
      sexId: d.sexId,
      dateOfBirth: d.dateOfBirth,
      firstName: d.firstName.trim(),
      lastName: d.lastName.trim(),
      ...(d.fatherName.trim() ? { fatherName: d.fatherName.trim() } : {}),
    };
  };

  /** Every reason the case cannot be filed yet, checked before anything is sent. */
  const validate = (): string | null => {
    if (choose && !brokerageId) {
      return t('validationBrokerageRequired', { defaultValue: 'Choose the brokerage this case is filed for.' });
    }
    const customerProblem = isCompany
      ? companyEntryProblem(t, company)
      : personEntryProblem(t, customer, personCreateEnabled, sexOptions);
    if (customerProblem) return `${t('customerCard', { defaultValue: 'Customer' })}: ${customerProblem}`;

    const seen = new Set<string>();
    for (let index = 0; index < related.length; index++) {
      const row = related[index];
      const label = `${t('relatedPersonsCard', { defaultValue: 'Related persons' })} ${index + 1}`;
      if (!row.relationTypeId) {
        return `${label}: ${t('validationRelationType', { defaultValue: 'Choose a relation for every related person.' })}`;
      }
      const problem = personEntryProblem(t, row.person, personCreateEnabled, sexOptions);
      if (problem) return `${label}: ${problem}`;
      if (seen.has(row.person.nationalId)) {
        return t('validationRelatedPersonDuplicate', { defaultValue: 'The same person is listed more than once.' });
      }
      seen.add(row.person.nationalId);
    }

    const perType = new Map<number, number>();
    for (let index = 0; index < risks.length; index++) {
      const row = risks[index];
      const label = `${t('risksCard', { defaultValue: 'Risks' })} ${index + 1}`;
      const type = lookups.riskTypes.find((r) => r.id === row.riskTypeId);
      if (!type) return `${label}: ${t('validationRiskType', { defaultValue: 'Choose a type for every risk.' })}`;
      if (type.requiresTitle && !row.title.trim()) {
        return `${label}: ${t('validationRiskTitle', { defaultValue: 'This risk type needs a title.' })}`;
      }
      if (row.title.trim().length > RISK_TITLE_MAX || row.description.trim().length > RISK_DESCRIPTION_MAX) {
        return `${label}: ${t('validationTextTooLong', {
          defaultValue: 'A title can be at most 100 characters and a description at most 1000.',
        })}`;
      }
      perType.set(type.id, (perType.get(type.id) ?? 0) + 1);
      if (!type.allowsMultiple && (perType.get(type.id) ?? 0) > 1) {
        return `${label}: ${t('validationRiskTypeSingle', { defaultValue: 'This risk type can be added only once per case.' })}`;
      }
    }
    return null;
  };

  const buildRequest = (): CreateCaseRequestDto => ({
    languageId,
    ...(choose && brokerageId ? { filingBrokerageId: brokerageId } : {}),
    customerTypeId: isCompany && legalTypeId !== undefined ? legalTypeId : individualTypeId,
    customer: isCompany
      ? {
          nationalId: company.nationalId,
          // Only a company search-first did not find carries its fields; a found
          // one is linked as it is.
          ...(company.lookup.kind === 'notFound' ? { newCompany: newCompanyRequest(company.draft) } : {}),
        }
      : {
          nationalId: customer.nationalId,
          ...(newPersonFields(customer) ? { newPerson: newPersonFields(customer) } : {}),
        },
    relatedPersons: related.map((r) => ({
      relationTypeId: r.relationTypeId,
      nationalId: r.person.nationalId,
      ...(newPersonFields(r.person) ? { newPerson: newPersonFields(r.person) } : {}),
    })),
    items: risks.map((r): CaseItemInputDto => ({
      riskTypeId: r.riskTypeId,
      ...(r.amount ? { amount: Number(r.amount) } : {}),
      ...(r.title.trim() ? { title: r.title.trim() } : {}),
      ...(r.description.trim() ? { description: r.description.trim() } : {}),
    })),
    ...(notes.trim() ? { additionalNotes: notes.trim() } : {}),
    archiveAfter: false,
  });

  const save = useMutation({
    mutationFn: (request: CreateCaseRequestDto) => createCase(request),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['customer-risk', 'cases'] });
      showSuccess(
        t('toastCaseCreatedNumber', { defaultValue: 'Case {{number}} created.', number: created.caseNumber }),
      );
      router.push(`/cases/${created.id}`);
    },
    onError: (err) => {
      showError(crsErrorMessage(t, err));
      // The chosen brokerage stopped being eligible between loading the list
      // and saving: reload the list so it no longer offers it.
      if (isCrsCode(err, 'CRS_FILING_BROKERAGE_NOT_ELIGIBLE')) {
        queryClient.invalidateQueries({ queryKey: ['customer-risk', 'filing-brokerages'] });
      }
    },
  });

  const handleSave = () => {
    const problem = validate();
    if (problem) {
      showError(problem);
      return;
    }
    save.mutate(buildRequest());
  };

  const busy = save.isPending;

  return (
    <>
      {choose ? (
        <Card>
          <CardContent className="py-5 space-y-3">
            <BrokeragePicker
              state={brokerageState}
              value={brokerageId}
              onChange={chooseBrokerage}
              disabled={busy || anySearching}
            />
            <p className="text-xs text-muted-foreground">
              {t('newCaseNumberHint', {
                defaultValue: 'The case number is issued by the system when the case is saved.',
              })}
            </p>
          </CardContent>
        </Card>
      ) : (
        <CrsNotice
          tone="info"
          title={t('meResolved', {
            defaultValue: 'You file cases for: {{name}}',
            name: brokerageLabel(me.filingBrokerage),
          })}
        >
          {t('newCaseNumberHint', {
            defaultValue: 'The case number is issued by the system when the case is saved.',
          })}
        </CrsNotice>
      )}

      {!personCreateOn(me) && (
        <CrsNotice
          title={t('errorPersonCreateNotAvailable', {
            defaultValue: 'A new person cannot be created in this version. Only people who already exist can be filed.',
          })}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('customerCard', { defaultValue: 'Customer' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {companyOffered ? (
            <RadioGroup
              value={customerKind}
              onValueChange={(v) => setCustomerKind(v === 'company' ? 'company' : 'person')}
              disabled={busy || anySearching}
              className="flex flex-wrap gap-6 mb-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="person" id="customer-kind-person" />
                <Label htmlFor="customer-kind-person">
                  {t('customerTypeIndividual', { defaultValue: 'Individual' })}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="company" id="customer-kind-company" />
                <Label htmlFor="customer-kind-company">
                  {t('customerTypeLegal', { defaultValue: 'Legal entity' })}
                </Label>
              </div>
            </RadioGroup>
          ) : companyTypeMissing ? (
            <p className="text-xs text-destructive mb-3">
              {t('errorNoLegalType', {
                defaultValue:
                  'The service did not return the Legal customer type, so only individual customers can be filed.',
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-3">
              {t('individualsOnlyHint', { defaultValue: 'This version files individual customers only.' })}
            </p>
          )}
          {isCompany ? (
            <CompanyEntry
              idPrefix="customer-company"
              value={company}
              onChange={setCompany}
              lookup={lookupCompanyCustomer}
              searchBlockedReason={searchBlockedReason}
              legalForms={legalForms}
              disabled={busy}
            />
          ) : (
            <PersonEntry
              idPrefix="customer"
              value={customer}
              onChange={setCustomer}
              lookup={lookup}
              searchBlockedReason={searchBlockedReason}
              sexOptions={sexOptions}
              personCreateEnabled={personCreateEnabled}
              personLookupV2Enabled={personLookupV2Enabled}
              disabled={busy}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('relatedPersonsCard', { defaultValue: 'Related persons' })}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              setRelated((prev) => [...prev, { key: newKey(), relationTypeId: 0, person: emptyPersonEntry() }])
            }
          >
            <Plus className="size-4" />
            {t('addRelatedPerson', { defaultValue: 'Add related person' })}
          </Button>
        </CardHeader>
        <CardContent>
          <RelatedPersonsEditor
            rows={related}
            setRows={setRelated}
            relationTypes={lookups.relationTypes}
            lookup={lookup}
            searchBlockedReason={searchBlockedReason}
            sexOptions={sexOptions}
            personCreateEnabled={personCreateEnabled}
            personLookupV2Enabled={personLookupV2Enabled}
            disabled={busy}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('risksCard', { defaultValue: 'Risks' })}</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              setRisks((prev) => [
                ...prev,
                { key: newKey(), riskTypeId: 0, amount: '', title: '', description: '' },
              ])
            }
          >
            <Plus className="size-4" />
            {t('addRisk', { defaultValue: 'Add risk' })}
          </Button>
        </CardHeader>
        <CardContent>
          <RisksEditor rows={risks} setRows={setRisks} riskTypes={lookups.riskTypes} disabled={busy} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('additionalNotesCard', { defaultValue: 'Additional notes' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea rows={4} value={notes} disabled={busy} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-2">
            {t('textLanguageHint', {
              defaultValue: 'Titles, descriptions and notes are saved in the language of this screen.',
            })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('operationsCard', { defaultValue: 'Operations' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap justify-end gap-3">
            <Button disabled={busy} onClick={handleSave}>
              {busy ? t('saving', { defaultValue: 'Saving…' }) : t('save', { defaultValue: 'Save' })}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
