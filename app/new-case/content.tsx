'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { createCase, getLookups, getSexes } from '@/lib/customer-risk/api';
import { languageIdFor } from '@/lib/customer-risk/format';
import { crsErrorMessage } from '@/lib/customer-risk/messages';
import {
  CrsPermission,
  INDIVIDUAL_CUSTOMER_TYPE_CODE,
  type CaseItemInputDto,
  type CreateCaseRequestDto,
  type LookupsDto,
  type MeDto,
  type NewPersonFieldsDto,
} from '@/lib/customer-risk/types';
import { CrsAccessGate, CrsNotice, useBrokerageLabel } from '../components/crs-access';
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
      <CrsAccessGate permission={CrsPermission.CaseModify}>{(me) => <NewCaseForm me={me} />}</CrsAccessGate>
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
  if (!individual) {
    // v1 files individuals only, and the id to send comes from the service's
    // own list. Without it there is nothing correct to send.
    return (
      <CrsNotice
        tone="destructive"
        title={t('errorNoIndividualType', {
          defaultValue: 'The service did not return the Individual customer type, so a case cannot be filed.',
        })}
      />
    );
  }

  return <NewCaseFields me={me} lookups={lookups} customerTypeId={individual.id} />;
}

function NewCaseFields({
  me,
  lookups,
  customerTypeId,
}: {
  me: MeDto;
  lookups: LookupsDto;
  customerTypeId: number;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const router = useRouter();
  const queryClient = useQueryClient();
  const brokerageLabel = useBrokerageLabel();
  const personCreateEnabled = me.personCreateEnabled;

  const [customer, setCustomer] = useState<PersonEntryValue>(emptyPersonEntry);
  const [related, setRelated] = useState<RelatedPersonDraft[]>([]);
  const [risks, setRisks] = useState<RiskDraft[]>([]);
  const [notes, setNotes] = useState('');

  // Row keys for React only; a counter, never a generated GUID, and never sent.
  const nextKey = useRef(0);
  const newKey = () => `row-${++nextKey.current}`;

  // The sex list is needed only once some person is not found. Three states,
  // and they must not be conflated: pending (do not know yet), unavailable
  // (settled with an error or with nothing — nobody can choose), and loaded.
  const needsSexes =
    personCreateEnabled !== false &&
    (customer.lookup.kind === 'notFound' || related.some((r) => r.person.lookup.kind === 'notFound'));
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
    const customerProblem = personEntryProblem(t, customer, personCreateEnabled, sexOptions);
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
    languageId: languageIdFor(i18n.language),
    customerTypeId,
    customer: {
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
    onError: (err) => showError(crsErrorMessage(t, err)),
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

      {personCreateEnabled === false && (
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
          <p className="text-xs text-muted-foreground mb-3">
            {t('individualsOnlyHint', { defaultValue: 'This version files individual customers only.' })}
          </p>
          <PersonEntry
            idPrefix="customer"
            value={customer}
            onChange={setCustomer}
            sexOptions={sexOptions}
            personCreateEnabled={personCreateEnabled}
            disabled={busy}
          />
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
            sexOptions={sexOptions}
            personCreateEnabled={personCreateEnabled}
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
