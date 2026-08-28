'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { linkOrCreatePerson, type PersonLinkStatus } from '@/lib/customer-risk/person-link';
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
  const { t } = useTranslation('customer-risk');
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

  const [risks, setRisks] = useState<RiskEntry[]>([]);

  const [relatedPersons, setRelatedPersons] = useState<CrsRelatedPerson[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [busy, setBusy] = useState(false);

  const [brokerageName, setBrokerageName] = useState('—');

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

    saveRelatedPersons(
      created.id,
      relatedPersons.map((r) => ({ ...r, caseId: created.id })),
    );
    saveOtherRisks(
      created.id,
      otherEntries.map((r) => ({ id: r.id, caseId: created.id, riskType: '', description: r.description, amount: r.amount })),
    );

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
      if (!created) return;

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

  // Temporary caseId for the related-persons rows until the case is saved.
  const tempCaseId = useMemo(() => `pending-${Math.random().toString(36).slice(2, 8)}`, []);

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
                  <div className="space-y-1">
                    <Label>{t('fatherName', { defaultValue: "Father's name" })}</Label>
                    <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('dateOfBirth', { defaultValue: 'Date of birth' })}</Label>
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

