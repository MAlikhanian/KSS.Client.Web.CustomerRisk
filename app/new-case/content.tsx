'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { RiCheckboxCircleFill, RiErrorWarningFill } from '@remixicon/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DatePickerComponent } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import { useQuery } from '@tanstack/react-query';
import {
  ENGLISH_LANGUAGE_ID,
  PERSIAN_LANGUAGE_ID,
  linkOrCreatePerson,
  listSexOptions,
  type PersonLinkStatus,
} from '@/lib/customer-risk/person-link';
import { useActingBrokerage } from '../components/acting-brokerage-picker';
import { RelatedPersonsEditor } from '../components/related-persons-editor';
import { RisksEditor, type RiskEntry } from '../components/risks-editor';
import type {
  CrsRelatedPerson,
  CustomerType,
} from '@/lib/customer-risk/types';
import {
  createCase,
  archiveCase,
  defaultActorName,
  getBrokerage,
  pushAuditEntry,
  saveOtherRisks,
  saveRelatedPersons,
  newRelatedPersonId,
  newOtherRiskId,
} from '@/lib/customer-risk/mock-store';

function showSuccess(msg: string) {
  toast.custom(
    () => (
      <Alert variant="mono" icon="success">
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

function showError(msg: string) {
  toast.custom(
    () => (
      <Alert variant="mono" icon="destructive">
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{msg}</AlertTitle>
      </Alert>
    ),
    { position: 'top-center' },
  );
}

export function NewCaseContent() {
  const { t, i18n } = useTranslation('customer-risk');
  const { brokerageId, tick } = useActingBrokerage();
  const router = useRouter();

  const [customerType, setCustomerType] = useState<CustomerType>('Individual');
  // Individual customers are captured as first + last, matching the structured
  // shape KSS.Service.Person stores; Legal entities keep a single company name.
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customerNationalId, setCustomerNationalId] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fatherName, setFatherName] = useState('');
  // 0 = nothing chosen. It is never sent as a sex: handleSave passes
  // `sexId || undefined`, and linkOrCreatePerson refuses to CREATE without a
  // real value rather than letting the DTO default supply one. validate()
  // additionally requires a choice, but only once the options have settled with
  // rows — so 0 does reach linkOrCreatePerson when Person cannot be asked, and
  // being refused there is the intended outcome, not a gap.
  const [sexId, setSexId] = useState(0);

  const [risks, setRisks] = useState<RiskEntry[]>([]);

  const [relatedPersons, setRelatedPersons] = useState<CrsRelatedPerson[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [busy, setBusy] = useState(false);

  const [brokerageName, setBrokerageName] = useState('—');

  // Sex options come from KSS.Service.Person, so they can be unavailable while
  // this page still works. THREE states, and conflating any two of them is a
  // defect — an earlier version of this file conflated the last two and filed
  // cases with no person link while telling the operator Person was down:
  //
  //   pending          — no answer yet. We do not know. Do not save.
  //   settled, []      — Person cannot be asked. Save, and file without a link.
  //   settled, [rows]  — Person answered. A sex must be chosen.
  //
  // `sexOptions` is [] in the first TWO of those, so length is not a sufficient
  // test; `sexOptionsPending` is what separates them.
  //
  // Blocking the save while pending is only legitimate because that state is
  // BOUNDED: listSexOptions carries a 10s AbortSignal.timeout and swallows the
  // rejection, so a hang settles to [] and lands in the middle case rather than
  // waiting forever. Without that ceiling this gate would turn a slow Person
  // service into a page that cannot save at all, which is the failure the whole
  // item exists to prevent. If you remove the timeout, remove this gate too.
  const { data: sexOptions = [], isPending: sexOptionsPending } = useQuery({
    queryKey: ['person-reference-data', 'sex', i18n.language],
    queryFn: () =>
      listSexOptions(i18n.language === 'en' ? ENGLISH_LANGUAGE_ID : PERSIAN_LANGUAGE_ID),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!brokerageId) {
      setBrokerageName('—');
      return;
    }
    const b = getBrokerage(brokerageId);
    setBrokerageName(b?.nameFa ?? '—');
  }, [brokerageId, tick]);

  // Individual national ids are 10 digits; a Legal شناسه ملی is 11.
  const nationalIdLength = customerType === 'Individual' ? 10 : 11;

  /** Composed display value — `first last` for an Individual, the company name
   *  for a Legal entity. Kept in sync the way Person recomputes DisplayName. */
  const customerName =
    customerType === 'Individual'
      ? `${customerFirstName.trim()} ${customerLastName.trim()}`.trim()
      : companyName.trim();

  // Switching customer type clears the fields belonging to the other branch, so
  // a half-filled Individual can't leak into a Legal case (or the reverse).
  const handleCustomerTypeChange = (type: CustomerType) => {
    setCustomerType(type);
    setCustomerNationalId('');
    if (type === 'Legal') {
      setCustomerFirstName('');
      setCustomerLastName('');
      setDateOfBirth('');
      setFatherName('');
      setSexId(0);
      setStockCode('');
    } else {
      setCompanyName('');
    }
  };

  const validate = (): string | null => {
    if (!brokerageId) return t('errorNoActingBrokerage', { defaultValue: 'Pick an acting brokerage first.' });
    if (customerType === 'Individual') {
      if (!customerFirstName.trim()) {
        return t('validationCustomerFirstName', { defaultValue: 'First name is required.' });
      }
      if (!customerLastName.trim()) {
        return t('validationCustomerLastName', { defaultValue: 'Last name is required.' });
      }
      // Its own check, not folded into validationIndividualFields below: that
      // message names date of birth and father's name, and would start lying
      // about which field is missing.
      //
      // Pending is NOT the same as unavailable. While the query is unsettled the
      // Select is disabled, so the operator could not have chosen even if they
      // wanted to — saving here would skip a required field and then report a
      // Person outage that is not happening. Bounded by the 10s timeout in
      // listSexOptions, so this asks for a retry rather than a wait forever.
      if (sexOptionsPending) {
        return t('validationSexOptionsPending', {
          defaultValue: 'Still loading customer details — try again in a moment.',
        });
      }
      // Settled and empty means Person cannot be asked. Do NOT block: this
      // module promises a risk case stays filable when Person is unreachable.
      // The case is filed without the link, and linkOrCreatePerson refuses to
      // invent a value rather than falling through to the DTO default.
      if (sexOptions.length > 0 && !sexId) {
        return t('validationCustomerSex', { defaultValue: "Select the customer's sex." });
      }
    } else if (!companyName.trim()) {
      return t('validationCompanyName', { defaultValue: 'Company name is required.' });
    }
    if (customerNationalId.length !== nationalIdLength) {
      return customerType === 'Individual'
        ? t('validationNationalIdLength', { defaultValue: 'National ID must be exactly 10 digits.' })
        : t('validationLegalIdLength', { defaultValue: 'Legal entity ID must be exactly 11 digits.' });
    }
    if (customerType === 'Individual' && (!dateOfBirth || !fatherName.trim())) {
      return t('validationIndividualFields', { defaultValue: 'Individual customers require DOB + father.' });
    }
    return null;
  };

  const persistAndAudit = (archiveAfter: boolean, customerPersonId?: string) => {
    if (!brokerageId) return null;
    const actor = defaultActorName(brokerageId);
    const creditEntry = risks.find((r) => r.type === 'credit');
    const documentsEntry = risks.find((r) => r.type === 'documents');
    const otherEntries = risks.filter((r) => r.type === 'other');
    const created = createCase({
      brokerageId,
      customerType,
      customerFirstName: customerType === 'Individual' ? customerFirstName.trim() : undefined,
      customerLastName: customerType === 'Individual' ? customerLastName.trim() : undefined,
      customerName,
      customerNationalId: customerNationalId.trim(),
      customerPersonId,
      stockCode: customerType === 'Individual' && stockCode.trim() ? stockCode.trim() : undefined,
      dateOfBirth: customerType === 'Individual' ? new Date(dateOfBirth).toISOString() : undefined,
      fatherName: customerType === 'Individual' ? fatherName.trim() : undefined,
      creditRisk: creditEntry ? { hasRisk: true, amount: creditEntry.amount, description: creditEntry.description } : { hasRisk: false },
      documentsRisk: documentsEntry ? { hasRisk: true, amount: documentsEntry.amount, description: documentsEntry.description } : { hasRisk: false },
      hasAnyOtherRisks: otherEntries.length > 0,
      additionalNotes: additionalNotes.trim() || undefined,
      createdByUserName: actor,
    });

    // The case itself did not persist — localStorage is the only copy, so there
    // is nothing to attach related persons, risks or an audit entry to. Bail
    // before writing any of them; handleSave turns this into an error toast
    // rather than the success message it would otherwise show.
    if (!created) return null;

    // The case itself is stored by this point, so a failure here is PARTIAL, not
    // total — saying "nothing was saved" would be as wrong as the old silent
    // success. Report it and carry on; the case is real and navigable.
    const relatedStored = saveRelatedPersons(
      created.id,
      relatedPersons.map((r) => ({ ...r, caseId: created.id })),
    );
    const risksStored = saveOtherRisks(
      created.id,
      otherEntries.map((r) => ({ id: r.id, caseId: created.id, riskType: '', description: r.description, amount: r.amount })),
    );
    if (!relatedStored || !risksStored) {
      showError(
        t('toastCasePartiallySaved', {
          defaultValue:
            'The case was saved, but its related persons or other risks could not be stored.',
        }),
      );
    }

    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'CreateCase',
      resourceId: created.id,
      resourceLabel: created.caseNumber,
    });

    if (archiveAfter) {
      archiveCase(created.id, actor);
      pushAuditEntry({
        brokerageId,
        userName: actor,
        action: 'ArchiveCase',
        resourceId: created.id,
        resourceLabel: created.caseNumber,
      });
    }

    return created;
  };

  const handleSave = async (archiveAfter: boolean) => {
    const err = validate();
    if (err) {
      showError(err);
      return;
    }
    setBusy(true);
    try {
      // Individual customers are mirrored into KSS.Service.Person. Person is a
      // SOFT dependency: every failure path below still files the case, with the
      // link left null — the as-filed snapshot is the record either way.
      let customerPersonId: string | undefined;
      let personStatus: PersonLinkStatus | undefined;
      if (customerType === 'Individual') {
        const link = await linkOrCreatePerson({
          nationalId: customerNationalId.trim(),
          firstName: customerFirstName.trim(),
          lastName: customerLastName.trim(),
          fatherName: fatherName.trim() || undefined,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : undefined,
          // undefined only when Person could not be asked — validate() requires
          // a choice once the options have settled with rows, and refuses to
          // save at all while they are still pending. linkOrCreatePerson will
          // still LINK an existing person without it, and refuses to CREATE.
          sexId: sexId || undefined,
        });
        customerPersonId = link.personId;
        personStatus = link.status;

        if (link.status === 'duplicate') {
          showError(
            t('personDuplicateOutOfScope', {
              defaultValue:
                'This national ID already exists in the system but is not visible in your company. The case was filed without a person link.',
            }),
          );
        } else if (link.status === 'failed') {
          showError(
            t('personLinkFailed', {
              defaultValue: 'Could not reach the Person service. The case was filed without a person link.',
            }),
          );
        }
      }

      const created = persistAndAudit(archiveAfter, customerPersonId);
      if (!created) {
        // validate() already rejected a missing acting brokerage, so reaching
        // null here means the write itself failed. Say so: this used to fall
        // through to "Case created." for a case that was never stored.
        showError(
          t('toastCaseSaveFailed', {
            defaultValue: 'The case could not be saved in this browser. Nothing was stored.',
          }),
        );
        return;
      }

      if (personStatus === 'linked') {
        showSuccess(
          t('personLinked', { defaultValue: 'Linked to an existing person record.' }),
        );
      } else if (personStatus === 'created') {
        showSuccess(
          t('personCreated', { defaultValue: 'Customer saved to the Person service.' }),
        );
      }

      showSuccess(
        archiveAfter
          ? t('toastCaseArchived', { defaultValue: 'Case archived.' })
          : t('toastCaseCreated', { defaultValue: 'Case created.' }),
      );
      router.push(`/cases/${created.id}`);
    } finally {
      setBusy(false);
    }
  };

  const isIndividual = customerType === 'Individual';

  // Placeholder caseId for related-person rows until the case is saved; every
  // row's caseId is overwritten with the real one in persistAndAudit, so the
  // value is never persisted or compared.
  //
  // A constant, not Math.random(): a useMemo body runs in the server prerender
  // AND again on the client, so a random value differs between the two. Nothing
  // renders it today, which is the only reason that was not a hydration
  // mismatch — the same impurity class as the related-persons read this item
  // removes from the cases and archive filters.
  const tempCaseId = 'pending';

  const addRelatedPerson = () => {
    setRelatedPersons((prev) => [
      ...prev,
      { id: newRelatedPersonId(), caseId: tempCaseId, firstName: '', lastName: '', name: '', nationalId: '', fatherName: '', dateOfBirth: '', relationType: undefined },
    ]);
  };

  const addRisk = () => {
    setRisks((prev) => [...prev, { id: newOtherRiskId(), type: 'credit', amount: undefined, description: '' }]);
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleNewCase', { defaultValue: 'New Risk Case' })} />
              <ToolbarDescription>{t('descNewCase')}</ToolbarDescription>
            </ToolbarHeading>
          </Toolbar>
        </CardContent>
      </Card>

      <div
        className={
          'space-y-5 lg:space-y-7.5 ' +
          '[&_div.rounded-xl.bg-card]:bg-rose-50/25! ' +
          '[&_div.rounded-xl.bg-card]:border-rose-100! ' +
          'dark:[&_div.rounded-xl.bg-card]:bg-rose-950/25! ' +
          'dark:[&_div.rounded-xl.bg-card]:border-rose-900! ' +
          '[&_div.rounded-xl.bg-card]:shadow-lg ' +
          '[&_div.rounded-xl.bg-card]:shadow-black/5'
        }
      >
        <Card>
          <CardHeader>
            <CardTitle>{t('owningBrokerage', { defaultValue: 'Owning brokerage' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-semibold">{brokerageName}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('basicInfoCard', { defaultValue: 'Customer basic information' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t('customerType', { defaultValue: 'Customer type' })}</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) => handleCustomerTypeChange(v as CustomerType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">
                      {t('customerTypeIndividual', { defaultValue: 'Individual' })}
                    </SelectItem>
                    <SelectItem value="Legal">
                      {t('customerTypeLegal', { defaultValue: 'Legal entity' })}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {isIndividual ? (
                <>
                  <div className="space-y-1">
                    <Label>
                      {t('customerFirstName', { defaultValue: 'First name' })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      dir="rtl"
                      value={customerFirstName}
                      onChange={(e) => setCustomerFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t('customerLastName', { defaultValue: 'Last name' })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input
                      dir="rtl"
                      value={customerLastName}
                      onChange={(e) => setCustomerLastName(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label>
                    {t('customerNameLegal', { defaultValue: 'Company name' })}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input dir="rtl" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>
                  {isIndividual
                    ? t('customerNationalId', { defaultValue: 'National ID' })
                    : t('customerLegalId', { defaultValue: 'Legal entity ID' })}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input
                  inputMode="numeric"
                  maxLength={nationalIdLength}
                  value={customerNationalId}
                  onChange={(e) =>
                    setCustomerNationalId(
                      toEnglishDigits(e.target.value)
                        .replace(/[^0-9]/g, '')
                        .slice(0, nationalIdLength),
                    )
                  }
                />
              </div>
              {isIndividual && (
                <>
                  {/* No preselected value. An Individual customer becomes a row
                      in KSS.Service.Person, and this field is the only thing
                      that decides its sex — before it existed, every one of
                      them was written as male. A default would still be an
                      assertion nobody made, so the placeholder is not a
                      selectable option.
                      Required once the options have loaded. NOT required when
                      Person could not be asked — see validate(); the case is
                      then filed with no person link rather than blocked. Do not
                      "restore" an unconditional requirement here: that is the
                      hard block on a soft dependency this design forbids. */}
                  <div className="space-y-1">
                    <Label>
                      {t('customerSex', { defaultValue: 'Sex' })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Select
                      value={sexId ? String(sexId) : undefined}
                      onValueChange={(value) => setSexId(Number(value))}
                      disabled={sexOptions.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            sexOptionsPending
                              ? t('loading', { defaultValue: 'Loading…' })
                              : sexOptions.length === 0
                                ? t('customerSexUnavailable', {
                                    defaultValue: 'Unavailable — the case will be filed without a person link',
                                  })
                                : t('select', { defaultValue: 'Select' })
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sexOptions.map((s) => (
                          <SelectItem key={s.sexId} value={String(s.sexId)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t('fatherName', { defaultValue: "Father's name" })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t('dateOfBirth', { defaultValue: 'Date of birth' })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <DatePickerComponent value={dateOfBirth} onChange={(value) => setDateOfBirth(value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('stockCode', { defaultValue: 'Stock code' })}</Label>
                    <Input value={stockCode} onChange={(e) => setStockCode(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('relatedPersonsCard', { defaultValue: 'Related persons' })}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRelatedPerson}>
              <Plus className="h-4 w-4 ml-1" />
              {t('addRelatedPerson', { defaultValue: 'Add related person' })}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">{t('relatedPersonsHint')}</p>
            <RelatedPersonsEditor rows={relatedPersons} onChange={setRelatedPersons} caseId={tempCaseId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('risksCard', { defaultValue: 'Risks' })}</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRisk}>
              <Plus className="h-4 w-4 ml-1" />
              {t('addRisk', { defaultValue: 'Add risk' })}
            </Button>
          </CardHeader>
          <CardContent>
            <RisksEditor rows={risks} onChange={setRisks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('additionalNotesCard', { defaultValue: 'Additional notes' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={4}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('operationsCard', { defaultValue: 'Operations' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-end gap-3">
              <Button disabled={busy} onClick={() => handleSave(false)}>
                {t('save', { defaultValue: 'Save' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

