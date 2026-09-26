'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ArchiveRestore, ChevronLeft, ChevronRight, Eye, Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
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
import { archiveCase, getLookups, listCases, unarchiveCase } from '@/lib/customer-risk/api';
import {
  companyName,
  formatDate,
  languageIdFor,
  lookupName,
  personName,
} from '@/lib/customer-risk/format';
import { crsErrorMessage } from '@/lib/customer-risk/messages';
import {
  CrsPermission,
  INDIVIDUAL_CUSTOMER_TYPE_CODE,
  type CaseCustomerDto,
  type CaseSummaryDto,
  type MeDto,
} from '@/lib/customer-risk/types';
import { CaseStatusBadge } from './case-status-badge';
import { CrsAccessGate, CrsNotice, hasCrsPermission } from './crs-access';
import { showError, showSuccess } from './crs-toast';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 400;

/** The customer's display name, or '' when the directory could not be read. */
export function customerDisplayName(customer: CaseCustomerDto, languageId: number): string {
  return customer.customerType === INDIVIDUAL_CUSTOMER_TYPE_CODE
    ? personName(customer.personNames, languageId)
    : companyName(customer.companyNames, languageId);
}

/**
 * The filing brokerage's own cases, live or archived. Paged and searched by
 * the service; the search box matches the case number and the national id or
 * name of the customer and of related persons.
 */
export function CaseList({ archived }: { archived: boolean }) {
  return <CrsAccessGate permission={CrsPermission.CaseRead}>{(me) => <CaseListTable archived={archived} me={me} />}</CrsAccessGate>;
}

function CaseListTable({ archived, me }: { archived: boolean; me: MeDto }) {
  const { t, i18n } = useTranslation('customer-risk');
  const isRtl = i18n.language === 'fa' || i18n.language === 'persian';
  const languageId = languageIdFor(i18n.language);
  const queryClient = useQueryClient();
  const canModify = hasCrsPermission(me, CrsPermission.CaseModify);

  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<CaseSummaryDto | null>(null);

  // Typing settles for a moment before it becomes a request, and a new query
  // always starts from the first page.
  useEffect(() => {
    const handle = setTimeout(() => {
      setQ(input.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [input]);

  const { data: lookups } = useQuery({
    queryKey: ['customer-risk', 'lookups'],
    queryFn: getLookups,
    staleTime: 5 * 60 * 1000,
  });

  const { data, error, isPending, isFetching } = useQuery({
    queryKey: ['customer-risk', 'cases', { archived, q, page }],
    queryFn: () => listCases({ archived, q, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });

  const toggle = useMutation({
    mutationFn: (c: CaseSummaryDto) => (archived ? unarchiveCase(c.id) : archiveCase(c.id)),
    onSuccess: () => {
      showSuccess(
        archived
          ? t('toastCaseUnarchived', { defaultValue: 'Case restored.' })
          : t('toastCaseArchived', { defaultValue: 'Case archived.' }),
      );
      queryClient.invalidateQueries({ queryKey: ['customer-risk', 'cases'] });
      queryClient.invalidateQueries({ queryKey: ['customer-risk', 'case'] });
    },
    onError: (err) => showError(crsErrorMessage(t, err)),
    onSettled: () => setTarget(null),
  });

  const riskName = (code: string) => {
    const type = lookups?.riskTypes.find((r) => r.code === code);
    return (type && lookupName(type.names, languageId)) || code;
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Card>
        <CardContent className="py-5">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="space-y-1 flex-1 min-w-[240px] max-w-md">
              <Label className="text-xs text-muted-foreground">
                {t('search', { defaultValue: 'Search' })}
              </Label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t('searchPlaceholderCases', {
                    defaultValue: 'Search by case number, name or national ID',
                  })}
                  className="ps-9"
                />
              </div>
            </div>
            {!archived && canModify && (
              <div className="ms-auto">
                <Button asChild>
                  <Link href="/new-case">
                    <Plus className="size-4" />
                    {t('newCase', { defaultValue: 'New Case' })}
                  </Link>
                </Button>
              </div>
            )}
          </div>

          {error ? (
            <CrsNotice tone="destructive" title={crsErrorMessage(t, error)} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>{t('caseNumber', { defaultValue: 'Case #' })}</TableHead>
                  <TableHead>{t('customerName', { defaultValue: 'Customer' })}</TableHead>
                  <TableHead>{t('customerNationalId', { defaultValue: 'National ID' })}</TableHead>
                  <TableHead>{t('risksCard', { defaultValue: 'Risks' })}</TableHead>
                  <TableHead>{t('relatedPersonsCard', { defaultValue: 'Related persons' })}</TableHead>
                  <TableHead>{t('createdAt', { defaultValue: 'Created' })}</TableHead>
                  {archived && <TableHead>{t('archivedAt', { defaultValue: 'Archived' })}</TableHead>}
                  <TableHead>{t('filterStatus', { defaultValue: 'Status' })}</TableHead>
                  <TableHead className="text-center w-20">{t('actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((c, idx) => {
                  const name = customerDisplayName(c.customer, languageId);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-center text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</TableCell>
                      <TableCell className="font-mono text-xs">{c.caseNumber}</TableCell>
                      <TableCell className="font-medium">
                        {name || (
                          <span className="text-muted-foreground text-xs">
                            {t('customerNameUnavailable', { defaultValue: 'Name unavailable' })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{c.customer.nationalId ?? '—'}</TableCell>
                      <TableCell className="text-xs">
                        {c.riskTypeCodes.length > 0 ? c.riskTypeCodes.map(riskName).join('، ') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-center">{c.relatedPersonCount}</TableCell>
                      <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                      {archived && <TableCell className="text-xs">{formatDate(c.archivedAt)}</TableCell>}
                      <TableCell>
                        <CaseStatusBadge archived={c.isArchived} />
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button asChild variant="ghost" mode="icon" size="sm">
                            <Link href={`/cases/${c.id}`} title={t('view', { defaultValue: 'View' })}>
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                          {canModify && (
                            <Button
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              onClick={() => setTarget(c)}
                              title={
                                archived
                                  ? t('unarchive', { defaultValue: 'Unarchive' })
                                  : t('archive', { defaultValue: 'Archive' })
                              }
                            >
                              {archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {items.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={archived ? 10 : 9} className="text-center py-8 text-muted-foreground">
                      {isPending
                        ? t('loading', { defaultValue: 'Loading…' })
                        : t('searchNoResults', { defaultValue: 'No case files match these filters.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}

          {!error && total > PAGE_SIZE && (
            <div className="flex items-center justify-end gap-2 mt-4 text-xs">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                title={t('pagePrevious', { defaultValue: 'Previous page' })}
              >
                {isRtl ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
              </Button>
              <span>
                {t('pageOf', { defaultValue: 'Page {{page}} of {{total}}', page, total: pageCount })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pageCount || isFetching}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                title={t('pageNext', { defaultValue: 'Next page' })}
              >
                {isRtl ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!target} onOpenChange={(open) => !open && !toggle.isPending && setTarget(null)}>
        <AlertDialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle>
              {archived
                ? t('confirmUnarchiveTitle', { defaultValue: 'Restore case' })
                : t('confirmArchiveTitle', { defaultValue: 'Archive case' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {archived
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
                // Keep the dialog open until the service answers; onSettled closes it.
                e.preventDefault();
                if (target) toggle.mutate(target);
              }}
            >
              {archived
                ? t('unarchive', { defaultValue: 'Unarchive' })
                : t('archive', { defaultValue: 'Archive' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
