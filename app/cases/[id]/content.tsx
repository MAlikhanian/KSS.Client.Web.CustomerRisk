'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useActingBrokerage } from '../../components/acting-brokerage-picker';
import { CaseStatusBadge } from '../../components/case-status-badge';
import { RelatedPersonsEditor } from '../../components/related-persons-editor';
import { RisksEditor, type RiskEntry } from '../../components/risks-editor';
import type {
  CrsRelatedPerson,
  CrsRiskCaseFile,
  CustomerType,
} from '@/lib/customer-risk/types';
import {
  archiveCase,
  defaultActorName,
  getBrokerage,
  getCaseForBrokerage,
  listOtherRisks,
  listRelatedPersons,
  pushAuditEntry,
  unarchiveCase,
} from '@/lib/customer-risk/mock-store';
import type { CaseAccess } from '@/lib/customer-risk/mock-store';
import { formatDate, formatDateTime } from '@/lib/customer-risk/format';

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

export function CaseDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('customer-risk');
  const { brokerageId, tick } = useActingBrokerage();
  const router = useRouter();

  const [access, setAccess] = useState<CaseAccess['status'] | null>(null);
  const [caseFile, setCaseFile] = useState<CrsRiskCaseFile | null>(null);
  const [relatedPersons, setRelatedPersons] = useState<CrsRelatedPerson[]>([]);
  const [risks, setRisks] = useState<RiskEntry[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerNationalId, setCustomerNationalId] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('Individual');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [brokerageName, setBrokerageName] = useState('—');

  const refresh = useCallback(() => {
    // Scoped read: another brokerage's case is never returned here, so it never
    // reaches component state. brokerageId is null on the very first paint —
    // useActingBrokerage sets it in its own mount effect — so hold rather than
    // read unscoped.
    //
    // WHAT RE-RUNS THIS when brokerageId arrives: `brokerageId` is in this
    // useCallback's dependency list, so `refresh`'s identity changes and the
    // [refresh, tick] effect below fires again. It is NOT `tick` — that is only
    // incremented by the acting-changed event handler, so it stays 0 for a whole
    // visit unless the operator touches the brokerage picker. Do not remove
    // `brokerageId` from the deps as redundant: the closure would capture null
    // for the lifetime of the page and every owner would see "No data found."
    // on their own case.
    if (!brokerageId) {
      setAccess(null);
      setCaseFile(null);
      return;
    }
    const result = getCaseForBrokerage(id, brokerageId);
    setAccess(result.status);
    const c = result.status === 'ok' ? result.caseFile : null;
    setCaseFile(c);
    if (c) {
      setRelatedPersons(listRelatedPersons(c.id));
      const riskList: RiskEntry[] = [];
      if (c.creditRisk?.hasRisk) {
        riskList.push({ id: '__credit', type: 'credit', amount: c.creditRisk.amount, description: c.creditRisk.description });
      }
      if (c.documentsRisk?.hasRisk) {
        riskList.push({ id: '__documents', type: 'documents', amount: c.documentsRisk.amount, description: c.documentsRisk.description });
      }
      for (const o of listOtherRisks(c.id)) {
        riskList.push({ id: o.id, type: 'other', amount: o.amount, description: o.description });
      }
      setRisks(riskList);
      setCustomerName(c.customerName);
      setCustomerFirstName(c.customerFirstName ?? '');
      setCustomerLastName(c.customerLastName ?? '');
      setCustomerNationalId(c.customerNationalId);
      setStockCode(c.stockCode ?? '');
      setDateOfBirth(c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '');
      setFatherName(c.fatherName ?? '');
      setCustomerType(c.customerType);
      setAdditionalNotes(c.additionalNotes ?? '');
      const b = getBrokerage(c.brokerageId);
      setBrokerageName(b?.nameFa ?? '—');
    }
  }, [id, brokerageId]);

  useEffect(() => {
    refresh();
  }, [refresh, tick]);

  // A case owned by another brokerage belongs on /search/[id]: that is the
  // cross-brokerage view, it shows less, and it writes a ViewOtherBrokerageCase
  // audit entry. Redirecting from an effect rather than during render — the
  // guard at search/[id] does it in render, which is a side effect in render
  // and should not be copied.
  //
  // NOT OBSERVED IN A BROWSER. Predicted, not verified — to reproduce, open
  //   /customer-risk/cases/<id of a case whose brokerageId is NOT the acting
  //   brokerage>
  // with 'customer-risk:acting-brokerage' set to some other brokerage, and watch
  // what paints before the redirect lands. Predicted: nothing of that case, at
  // any point. getCaseForBrokerage never returns a foreign record, so unlike a
  // render-time ownership test there is nothing in `caseFile` to paint — the
  // first render already takes the `return null` below. The weaker prediction,
  // that it paints once and is then replaced, would apply to a guard placed
  // after an unscoped getCase(); that is not what this does.
  // Also unverified: that the redirect target renders. Note this is NOT because
  // /search/[id] is unreachable — the search results table has always linked to
  // it for non-own rows; that link was broken by the doubled basePath and is
  // repaired by the same change as this. So there is a cheap way to exercise
  // this path: search, then open a row belonging to another brokerage.
  useEffect(() => {
    if (access === 'foreign') router.replace(`/search/${id}`);
  }, [access, id, router]);

  if (access === 'foreign') return null;

  // No acting brokerage, so there is no scope to read with. This is NOT the same
  // as 'missing' — there may well be a case at this id; we cannot say. "No data
  // found." would therefore be a lie, and rendering nothing was worse: silent,
  // and permanent rather than transient whenever listBrokerages() comes back
  // empty, because acting-brokerage-picker.tsx:36 then takes neither branch, so
  // no key is written and no acting-changed event is ever dispatched.
  //
  // On a cold browser this can show for a frame before the picker seeds the key
  // and dispatches. That is a briefly-visible true statement, not a wrong one.
  if (!brokerageId) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('errorNoActingBrokerage', { defaultValue: 'Pick an acting brokerage first.' })}
        </CardContent>
      </Card>
    );
  }

  // Scope exists but refresh() has not run for it yet — one frame. Render
  // nothing rather than flash "No data found." at an owner about to be shown
  // their own case.
  if (access === null) return null;

  if (!caseFile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('searchNoResults', { defaultValue: 'No data found.' })}
        </CardContent>
      </Card>
    );
  }

  // Always true now: the scoped read above only ever yields this brokerage's
  // case. Kept as defence in depth for the archive/unarchive guards below. The
  // "Owning brokerage" warning badge it also gates has become unreachable.
  const ownsCase = brokerageId === caseFile.brokerageId;
  const canEdit = ownsCase && !caseFile.isArchived;
  const isIndividual = customerType === 'Individual';

  const handleCustomerTypeChange = (type: CustomerType) => {
    setCustomerType(type);
    if (type === 'Legal') {
      setDateOfBirth('');
      setFatherName('');
      setStockCode('');
    }
  };

  const handleArchive = () => {
    if (!ownsCase) return;
    if (!window.confirm(t('confirmArchive', { defaultValue: 'Archive this case?' }))) return;
    const actor = defaultActorName(caseFile.brokerageId);
    // Null means the write did not land. Reporting success here and then calling
    // refresh() painted the case as still Active in the same frame as a "Case
    // archived." toast.
    if (!archiveCase(caseFile.id, actor)) {
      showError(
        t('toastChangeNotSaved', {
          defaultValue: 'The change could not be saved in this browser.',
        }),
      );
      return;
    }
    pushAuditEntry({
      brokerageId: caseFile.brokerageId,
      userName: actor,
      action: 'ArchiveCase',
      resourceId: caseFile.id,
      resourceLabel: caseFile.caseNumber,
    });
    showSuccess(t('toastCaseArchived', { defaultValue: 'Case archived.' }));
    refresh();
  };

  const handleUnarchive = () => {
    if (!ownsCase) return;
    if (!window.confirm(t('confirmUnarchive', { defaultValue: 'Restore from archive?' }))) return;
    const actor = defaultActorName(caseFile.brokerageId);
    if (!unarchiveCase(caseFile.id, actor)) {
      showError(
        t('toastChangeNotSaved', {
          defaultValue: 'The change could not be saved in this browser.',
        }),
      );
      return;
    }
    pushAuditEntry({
      brokerageId: caseFile.brokerageId,
      userName: actor,
      action: 'Unarchive',
      resourceId: caseFile.id,
      resourceLabel: caseFile.caseNumber,
    });
    showSuccess(t('toastCaseUnarchived', { defaultValue: 'Case restored.' }));
    refresh();
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <div className="flex items-center gap-3 flex-wrap">
                <ToolbarPageTitle
                  text={`${t('pageTitleCaseDetail', { defaultValue: 'Risk Case' })} — ${caseFile.caseNumber}`}
                />
                <CaseStatusBadge archived={caseFile.isArchived} />
                {!ownsCase && (
                  <Badge variant="warning" appearance="light" className="text-xs">
                    {t('owningBrokerage', { defaultValue: 'Owning brokerage' })}: {brokerageName}
                  </Badge>
                )}
              </div>
              <ToolbarDescription>{t('descCaseDetail')}</ToolbarDescription>
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
            <CardTitle>{t('basicInfoCard', { defaultValue: 'Customer basic information' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('caseNumber', { defaultValue: 'Case #' })}
                </Label>
                <div className="font-mono text-sm">{caseFile.caseNumber}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('owningBrokerage', { defaultValue: 'Owning brokerage' })}
                </Label>
                <div className="text-sm">{brokerageName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('createdAt', { defaultValue: 'Created' })}
                </Label>
                <div className="text-sm">
                  {formatDateTime(caseFile.createdAt)}
                  <div className="text-xs text-muted-foreground">{caseFile.createdByUserName}</div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('updatedAt', { defaultValue: 'Updated' })}
                </Label>
                <div className="text-sm">
                  {formatDateTime(caseFile.updatedAt)}
                  {caseFile.updatedByUserName && (
                    <div className="text-xs text-muted-foreground">{caseFile.updatedByUserName}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>{t('customerType', { defaultValue: 'Customer type' })}</Label>
                <Select
                  value={customerType}
                  onValueChange={(v) => handleCustomerTypeChange(v as CustomerType)}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">{t('customerTypeIndividual', { defaultValue: 'Individual' })}</SelectItem>
                    <SelectItem value="Legal">{t('customerTypeLegal', { defaultValue: 'Legal entity' })}</SelectItem>
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
                    <Input dir="rtl" value={customerFirstName} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label>
                      {t('customerLastName', { defaultValue: 'Last name' })}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <Input dir="rtl" value={customerLastName} disabled />
                  </div>
                </>
              ) : (
                <div className="space-y-1">
                  <Label>
                    {t('customerNameLegal', { defaultValue: 'Company name' })}
                    <span className="text-destructive ml-1">*</span>
                  </Label>
                  <Input dir="rtl" value={customerName} disabled />
                </div>
              )}
              <div className="space-y-1">
                <Label>
                  {isIndividual
                    ? t('customerNationalId', { defaultValue: 'National ID' })
                    : t('customerLegalId', { defaultValue: 'Legal entity ID' })}
                  <span className="text-destructive ml-1">*</span>
                </Label>
                <Input value={customerNationalId} onChange={(e) => setCustomerNationalId(e.target.value)} disabled />
              </div>
              {isIndividual && (
                <>
                  <div className="space-y-1">
                    <Label>{t('fatherName', { defaultValue: "Father's name" })}</Label>
                    <Input value={fatherName} onChange={(e) => setFatherName(e.target.value)} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('dateOfBirth', { defaultValue: 'Date of birth' })}</Label>
                    <DatePickerComponent value={dateOfBirth} onChange={(value) => setDateOfBirth(value)} disabled />
                  </div>
                  <div className="space-y-1">
                    <Label>{t('stockCode', { defaultValue: 'Stock code' })}</Label>
                    <Input value={stockCode} onChange={(e) => setStockCode(e.target.value)} disabled />
                  </div>
                </>
              )}
            </div>

            {caseFile.archivedAt && (
              <div className="text-xs text-muted-foreground">
                {t('archivedAt', { defaultValue: 'Archived' })}: {formatDate(caseFile.archivedAt)}
                {caseFile.archivedByUserName && ` — ${caseFile.archivedByUserName}`}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('relatedPersonsCard', { defaultValue: 'Related persons' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">{t('relatedPersonsHint')}</p>
            <RelatedPersonsEditor
              rows={relatedPersons}
              onChange={setRelatedPersons}
              caseId={caseFile.id}
              disabled
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('risksCard', { defaultValue: 'Risks' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <RisksEditor rows={risks} onChange={setRisks} disabled />
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
              disabled
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5">
            <div className="flex flex-wrap justify-end gap-3">
              {ownsCase && caseFile.isArchived && (
                <Button onClick={handleUnarchive}>
                  {t('unarchive', { defaultValue: 'Unarchive' })}
                </Button>
              )}
              {canEdit && (
                <Button onClick={handleArchive}>
                  {t('archive', { defaultValue: 'Archive' })}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
