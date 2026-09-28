'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { archiveCase, getCase, getLookups, getSexes, unarchiveCase } from '@/lib/customer-risk/api';
import {
  fatherName,
  formatDateOnly,
  formatDateTime,
  formatRial,
  languageIdFor,
  lookupName,
  personName,
  pickByLanguage,
} from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import {
  CrsPermission,
  INDIVIDUAL_CUSTOMER_TYPE_CODE,
  type CaseDetailDto,
  type MeDto,
} from '@/lib/customer-risk/types';
import { CaseStatusBadge } from '../../components/case-status-badge';
import { customerDisplayName } from '../../components/case-list';
import { CrsAccessGate, CrsNotice, hasCrsPermission } from '../../components/crs-access';
import { CrsPage } from '../../components/crs-page';
import { showError, showSuccess } from '../../components/crs-toast';

export function CaseDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage
      title={t('pageTitleCaseDetail', { defaultValue: 'Risk Case' })}
      description={t('descCaseDetail')}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/cases">{t('back', { defaultValue: 'Back' })}</Link>
        </Button>
      }
    >
      <CrsAccessGate permission={CrsPermission.CaseRead}>{(me) => <CaseDetail id={id} me={me} />}</CrsAccessGate>
    </CrsPage>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="text-sm font-medium break-words">{children}</div>
    </div>
  );
}

function CaseDetail({ id, me }: { id: string; me: MeDto }) {
  const { t } = useTranslation('customer-risk');

  // A case read is a read of another service's records too (the customer's
  // name), so a refusal is final for this visit: no retries.
  const { data: caseFile, error, isPending } = useQuery({
    queryKey: ['customer-risk', 'case', id],
    queryFn: () => getCase(id),
    retry: false,
  });

  if (error) {
    // Another brokerage's case is refused by the service, and the refusal is
    // all that reaches this page: no part of that case is ever in state here.
    // It is explained in place rather than redirected: the inquiry view it
    // would lead to is not part of this version.
    if (isCrsCode(error, 'CRS_FOREIGN_CASE') || isCrsCode(error, 'CRS_CASE_NOT_FOUND')) {
      return <CrsNotice title={crsErrorMessage(t, error)} />;
    }
    return <CrsNotice tone="destructive" title={crsErrorMessage(t, error)} />;
  }
  if (isPending || !caseFile) {
    return <CrsNotice tone="info" title={t('loading', { defaultValue: 'Loading…' })} />;
  }

  return <CaseView caseFile={caseFile} canModify={hasCrsPermission(me, CrsPermission.CaseModify)} />;
}

function CaseView({ caseFile, canModify }: { caseFile: CaseDetailDto; canModify: boolean }) {
  const { t, i18n } = useTranslation('customer-risk');
  const isRtl = i18n.language === 'fa' || i18n.language === 'persian';
  const languageId = languageIdFor(i18n.language);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const { data: lookups } = useQuery({
    queryKey: ['customer-risk', 'lookups'],
    queryFn: getLookups,
    staleTime: 5 * 60 * 1000,
  });

  const customer = caseFile.customer;
  const individual = customer.customerType === INDIVIDUAL_CUSTOMER_TYPE_CODE;

  // People found through the directory usually come without sex and date of
  // birth. The sex list is fetched only when a sex is actually present.
  const { data: sexes } = useQuery({
    queryKey: ['customer-risk', 'sexes'],
    queryFn: getSexes,
    staleTime: 5 * 60 * 1000,
    enabled: customer.sexId != null,
  });

  const toggle = useMutation({
    mutationFn: () => (caseFile.isArchived ? unarchiveCase(caseFile.id) : archiveCase(caseFile.id)),
    onSuccess: () => {
      showSuccess(
        caseFile.isArchived
          ? t('toastCaseUnarchived', { defaultValue: 'Case restored.' })
          : t('toastCaseArchived', { defaultValue: 'Case archived.' }),
      );
      queryClient.invalidateQueries({ queryKey: ['customer-risk', 'case', caseFile.id] });
      queryClient.invalidateQueries({ queryKey: ['customer-risk', 'cases'] });
    },
    onError: (err) => showError(crsErrorMessage(t, err)),
    onSettled: () => setConfirming(false),
  });

  const name = customerDisplayName(customer, languageId);
  const father = individual ? fatherName(customer.personNames, languageId) : '';
  const sexName =
    customer.sexId != null
      ? lookupName(sexes?.find((s) => s.id === customer.sexId)?.names, languageId)
      : '';
  const relationName = (relationTypeId: number, code: string) =>
    lookupName(lookups?.relationTypes.find((r) => r.id === relationTypeId)?.names, languageId) || code;
  const riskName = (riskTypeId: number, code: string) =>
    lookupName(lookups?.riskTypes.find((r) => r.id === riskTypeId)?.names, languageId) || code;
  const note = pickByLanguage(caseFile.notes, languageId)?.additionalNotes?.trim();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('caseInfoCard', { defaultValue: 'Case' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label={t('caseNumber', { defaultValue: 'Case #' })}>
              <span className="font-mono">{caseFile.caseNumber}</span>
            </Field>
            <Field label={t('filterStatus', { defaultValue: 'Status' })}>
              <CaseStatusBadge archived={caseFile.isArchived} />
            </Field>
            <Field label={t('createdAt', { defaultValue: 'Created' })}>{formatDateTime(caseFile.createdAt)}</Field>
            {caseFile.isArchived ? (
              <Field label={t('archivedAt', { defaultValue: 'Archived' })}>{formatDateTime(caseFile.archivedAt)}</Field>
            ) : (
              <Field label={t('updatedAt', { defaultValue: 'Updated' })}>{formatDateTime(caseFile.updatedAt)}</Field>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('basicInfoCard', { defaultValue: 'Customer basic information' })}</CardTitle>
        </CardHeader>
        <CardContent>
          {!customer.resolved && (
            <p className="text-xs text-muted-foreground mb-3">
              {t('customerNotResolved', {
                defaultValue: 'The customer’s details could not be read right now; only the link is shown.',
              })}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label={t('customerNationalId', { defaultValue: 'National ID' })}>
              <span className="font-mono">{customer.nationalId ?? '—'}</span>
            </Field>
            <Field label={t('customerName', { defaultValue: 'Customer' })}>{name || '—'}</Field>
            {father && <Field label={t('fatherName', { defaultValue: "Father's name" })}>{father}</Field>}
            {customer.dateOfBirth && (
              <Field label={t('dateOfBirth', { defaultValue: 'Date of birth' })}>
                {formatDateOnly(customer.dateOfBirth)}
              </Field>
            )}
            {sexName && <Field label={t('customerSex', { defaultValue: 'Sex' })}>{sexName}</Field>}
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
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>{t('relatedPersonRelation', { defaultValue: 'Relation' })}</TableHead>
                <TableHead>{t('relatedPersonNationalId', { defaultValue: 'National ID' })}</TableHead>
                <TableHead>{t('relatedPersonName', { defaultValue: 'Name' })}</TableHead>
                <TableHead>{t('relatedPersonFatherName', { defaultValue: 'Father name' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseFile.relatedPersons.map((r, idx) => (
                <TableRow key={r.id}>
                  <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                  <TableCell className="text-xs">{relationName(r.relationTypeId, r.relationTypeCode)}</TableCell>
                  <TableCell className="font-mono text-xs">{r.nationalId ?? '—'}</TableCell>
                  <TableCell>{personName(r.names, languageId) || '—'}</TableCell>
                  <TableCell className="text-xs">{fatherName(r.names, languageId) || '—'}</TableCell>
                </TableRow>
              ))}
              {caseFile.relatedPersons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    {t('noRelatedPersons', { defaultValue: 'No related persons added yet.' })}
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
                <TableHead className="w-10 text-center">#</TableHead>
                <TableHead>{t('riskType', { defaultValue: 'Risk type' })}</TableHead>
                <TableHead>{t('riskTitle', { defaultValue: 'Title' })}</TableHead>
                <TableHead>{t('riskAmount', { defaultValue: 'Amount (Rial)' })}</TableHead>
                <TableHead>{t('riskDescription', { defaultValue: 'Risk description' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {caseFile.items.map((item, idx) => {
                const text = pickByLanguage(item.texts, languageId);
                return (
                  <TableRow key={item.id}>
                    <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-xs">{riskName(item.riskTypeId, item.riskTypeCode)}</TableCell>
                    <TableCell className="text-xs">{text?.title?.trim() || '—'}</TableCell>
                    <TableCell className="text-xs">{formatRial(item.amount)}</TableCell>
                    <TableCell className="text-xs whitespace-pre-wrap">{text?.description?.trim() || '—'}</TableCell>
                  </TableRow>
                );
              })}
              {caseFile.items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground text-xs">
                    {t('noRisks', { defaultValue: 'No risks added yet.' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('additionalNotesCard', { defaultValue: 'Additional notes' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">{note || '—'}</p>
        </CardContent>
      </Card>

      {canModify && (
        <Card>
          <CardHeader>
            <CardTitle>{t('operationsCard', { defaultValue: 'Operations' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap justify-end gap-3">
              <Button
                variant={caseFile.isArchived ? 'primary' : 'outline'}
                disabled={toggle.isPending}
                onClick={() => setConfirming(true)}
              >
                {caseFile.isArchived
                  ? t('unarchive', { defaultValue: 'Unarchive' })
                  : t('archive', { defaultValue: 'Archive' })}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirming} onOpenChange={(open) => !open && !toggle.isPending && setConfirming(false)}>
        <AlertDialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle>
              {caseFile.isArchived
                ? t('confirmUnarchiveTitle', { defaultValue: 'Restore case' })
                : t('confirmArchiveTitle', { defaultValue: 'Archive case' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {caseFile.isArchived
                ? t('confirmUnarchive', { defaultValue: 'Restore from archive?' })
                : t('confirmArchive', { defaultValue: 'Archive this case?' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:space-x-0 sm:gap-2.5">
            <AlertDialogCancel
              disabled={toggle.isPending}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {t('cancel', { defaultValue: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={toggle.isPending}
              onClick={(e) => {
                e.preventDefault();
                toggle.mutate();
              }}
            >
              {caseFile.isArchived
                ? t('unarchive', { defaultValue: 'Unarchive' })
                : t('archive', { defaultValue: 'Archive' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
