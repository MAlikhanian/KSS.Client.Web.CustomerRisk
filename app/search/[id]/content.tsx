'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { useActingBrokerage } from '../../components/acting-brokerage-picker';
import { CaseStatusBadge } from '../../components/case-status-badge';
import type {
  CrsOtherRisk,
  CrsRelatedPerson,
  CrsRiskCaseFile,
} from '@/lib/customer-risk/types';
import {
  defaultActorName,
  getBrokerage,
  getCase,
  listOtherRisks,
  listRelatedPersons,
  pushAuditEntry,
} from '@/lib/customer-risk/mock-store';
import { formatDate, formatRial } from '@/lib/customer-risk/format';

interface RiskRow {
  label: string;
  amount?: number;
  description?: string;
}

export function CrossBrokerageDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('customer-risk');
  const { language } = useLanguage();
  const { brokerageId } = useActingBrokerage();
  const router = useRouter();

  const [caseFile, setCaseFile] = useState<CrsRiskCaseFile | null>(null);
  const [related, setRelated] = useState<CrsRelatedPerson[]>([]);
  const [otherRisks, setOtherRisks] = useState<CrsOtherRisk[]>([]);
  const [ownerName, setOwnerName] = useState<string>('—');
  const [auditPushed, setAuditPushed] = useState(false);

  useEffect(() => {
    const c = getCase(id);
    setCaseFile(c);
    if (c) {
      setRelated(listRelatedPersons(c.id));
      setOtherRisks(listOtherRisks(c.id));
      const owner = getBrokerage(c.brokerageId);
      setOwnerName(owner ? (language.code === 'en' ? owner.nameEn : owner.nameFa) : '—');
    }
  }, [id, language.code]);

  // Audit the cross-brokerage view exactly once per case visit by this persona.
  useEffect(() => {
    if (!caseFile || !brokerageId || auditPushed) return;
    if (brokerageId === caseFile.brokerageId) return; // owner — handled by the normal detail page
    const actor = defaultActorName(brokerageId);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'ViewOtherBrokerageCase',
      resourceId: caseFile.id,
      resourceLabel: caseFile.caseNumber,
      details: `viewed case owned by ${ownerName}`,
    });
    setAuditPushed(true);
  }, [caseFile, brokerageId, ownerName, auditPushed]);

  if (!caseFile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          {t('searchNoResults', { defaultValue: 'No data found.' })}
        </CardContent>
      </Card>
    );
  }

  // If the operator is actually the owner, send them to the full detail page.
  if (brokerageId === caseFile.brokerageId) {
    router.replace(`/cases/${caseFile.id}`);
    return null;
  }

  const isIndividual = caseFile.customerType === 'Individual';

  const relationLabel = (r: CrsRelatedPerson) =>
    r.relationType ? t(`relation${r.relationType}`, { defaultValue: r.relationType }) : '—';

  const riskRows: RiskRow[] = [
    ...(caseFile.creditRisk.hasRisk
      ? [{ label: t('creditRiskCard', { defaultValue: 'Credit risk' }), amount: caseFile.creditRisk.amount, description: caseFile.creditRisk.description }]
      : []),
    ...(caseFile.documentsRisk.hasRisk
      ? [{ label: t('documentsRiskCard', { defaultValue: 'Documents risk' }), amount: caseFile.documentsRisk.amount, description: caseFile.documentsRisk.description }]
      : []),
    ...otherRisks.map((o) => ({
      label: o.riskType?.trim() || t('otherRisksCard', { defaultValue: 'Other risks' }),
      amount: o.amount,
      description: o.description,
    })),
  ];

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <div className="flex items-center gap-3 flex-wrap">
                <ToolbarPageTitle
                  text={`${t('pageTitleSearchDetail', { defaultValue: 'Cross-Brokerage Inquiry View' })} — ${caseFile.caseNumber}`}
                />
                <CaseStatusBadge archived={caseFile.isArchived} />
                <Badge variant="warning" appearance="light" className="text-xs">
                  {t('owningBrokerage', { defaultValue: 'Owning brokerage' })}: {ownerName}
                </Badge>
              </div>
              <ToolbarDescription>{t('descSearchDetail')}</ToolbarDescription>
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
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('caseNumber', { defaultValue: 'Case #' })}</Label>
                <div className="font-mono text-sm">{caseFile.caseNumber}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('owningBrokerage', { defaultValue: 'Owning brokerage' })}</Label>
                <div className="text-sm">{ownerName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('createdAt', { defaultValue: 'Created' })}</Label>
                <div className="text-sm">{formatDate(caseFile.createdAt)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">{t('customerType', { defaultValue: 'Type' })}</Label>
                <div className="text-sm">
                  {isIndividual
                    ? t('customerTypeIndividual', { defaultValue: 'Individual' })
                    : t('customerTypeLegal', { defaultValue: 'Legal entity' })}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {isIndividual
                    ? t('customerNameIndividual', { defaultValue: 'Customer full name' })
                    : t('customerNameLegal', { defaultValue: 'Company name' })}
                </Label>
                <div className="text-sm font-medium">{caseFile.customerName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {isIndividual
                    ? t('customerNationalId', { defaultValue: 'National ID' })
                    : t('customerLegalId', { defaultValue: 'Legal entity ID' })}
                </Label>
                <div className="text-sm font-mono">{caseFile.customerNationalId}</div>
              </div>
              {isIndividual && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('fatherName', { defaultValue: "Father's name" })}</Label>
                    <div className="text-sm">{caseFile.fatherName ?? '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('dateOfBirth', { defaultValue: 'Date of birth' })}</Label>
                    <div className="text-sm">{caseFile.dateOfBirth ? formatDate(caseFile.dateOfBirth) : '—'}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{t('stockCode', { defaultValue: 'Stock code' })}</Label>
                    <div className="text-sm font-mono">{caseFile.stockCode ?? '—'}</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('relatedPersonsCard', { defaultValue: 'Related persons' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('relatedPersonName', { defaultValue: 'Name' })}</TableHead>
                  <TableHead>{t('relatedPersonNationalId', { defaultValue: 'National ID' })}</TableHead>
                  <TableHead>{t('relatedPersonFatherName', { defaultValue: 'Father name' })}</TableHead>
                  <TableHead>{t('relatedPersonDateOfBirth', { defaultValue: 'Date of birth' })}</TableHead>
                  <TableHead>{t('relatedPersonRelation', { defaultValue: 'Relation' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {related.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{r.nationalId ?? '—'}</TableCell>
                    <TableCell>{r.fatherName ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.dateOfBirth ? formatDate(r.dateOfBirth) : '—'}</TableCell>
                    <TableCell className="text-xs">{relationLabel(r)}</TableCell>
                  </TableRow>
                ))}
                {related.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-xs">
                      {t('noRelatedPersons', { defaultValue: 'No related persons.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('risksCard', { defaultValue: 'Risks' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('riskType', { defaultValue: 'Risk type' })}</TableHead>
                  <TableHead>{t('riskAmount', { defaultValue: 'Amount (Rial)' })}</TableHead>
                  <TableHead>{t('riskDescription', { defaultValue: 'Description' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {riskRows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="font-mono text-xs">{row.amount != null ? formatRial(row.amount) : '—'}</TableCell>
                    <TableCell className="text-sm">{row.description?.trim() || '—'}</TableCell>
                  </TableRow>
                ))}
                {riskRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 text-muted-foreground text-xs">
                      {t('noRisks', { defaultValue: 'No risks added yet.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {caseFile.additionalNotes?.trim() && (
          <Card>
            <CardHeader>
              <CardTitle>{t('additionalNotesCard', { defaultValue: 'Additional notes' })}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{caseFile.additionalNotes}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-5">
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => router.push('/search')}>
                {t('back', { defaultValue: 'Back' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
