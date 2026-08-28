'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { RiCheckboxCircleFill } from '@remixicon/react';
import { Archive, Eye, Plus, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
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
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
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
import { useActingBrokerage } from '../components/acting-brokerage-picker';
import { CaseStatusBadge } from '../components/case-status-badge';
import type { CrsRiskCaseFile } from '@/lib/customer-risk/types';
import {
  archiveCase,
  caseMatchesQuery,
  defaultActorName,
  listCasesByBrokerage,
  pushAuditEntry,
} from '@/lib/customer-risk/mock-store';
import { formatDate } from '@/lib/customer-risk/format';

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

export function CasesListContent() {
  const { t, i18n } = useTranslation('customer-risk');
  const isRtl = i18n.language === 'fa' || i18n.language === 'persian';
  const { brokerageId, tick } = useActingBrokerage();
  const [cases, setCases] = useState<CrsRiskCaseFile[]>([]);
  const [query, setQuery] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<CrsRiskCaseFile | null>(null);

  useEffect(() => {
    if (!brokerageId) {
      setCases([]);
      return;
    }
    setCases(listCasesByBrokerage(brokerageId));
  }, [brokerageId, tick]);

  const filtered = useMemo(
    () => cases.filter((c) => !c.isArchived && caseMatchesQuery(c, query)),
    [cases, query],
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [filtered],
  );

  const confirmArchive = () => {
    if (!brokerageId || !archiveTarget) return;
    const actor = defaultActorName(brokerageId);
    archiveCase(archiveTarget.id, actor);
    pushAuditEntry({
      brokerageId,
      userName: actor,
      action: 'ArchiveCase',
      resourceId: archiveTarget.id,
      resourceLabel: archiveTarget.caseNumber,
    });
    setCases(listCasesByBrokerage(brokerageId));
    showSuccess(t('toastCaseArchived', { defaultValue: 'Case archived.' }));
    setArchiveTarget(null);
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleCases', { defaultValue: 'My Cases' })} />
              <ToolbarDescription>{t('descCases')}</ToolbarDescription>
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
          <CardContent className="py-5">
            <div className="flex flex-wrap items-end gap-3 mb-4">
              <div className="space-y-1 flex-1 min-w-[240px] max-w-md">
                <Label className="text-xs text-muted-foreground">
                  {t('search', { defaultValue: 'Search' })}
                </Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t('searchPlaceholder', { defaultValue: 'Search by name or national ID' })}
                    className="ps-9"
                  />
                </div>
              </div>
              <div className="ms-auto">
                <Button asChild>
                  <Link href="/new-case">
                    <Plus className="size-4" />
                    {t('newCase', { defaultValue: 'New Case' })}
                  </Link>
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>{t('caseNumber', { defaultValue: 'Case #' })}</TableHead>
                  <TableHead>{t('customerType', { defaultValue: 'Type' })}</TableHead>
                  <TableHead>{t('customerName', { defaultValue: 'Customer' })}</TableHead>
                  <TableHead>{t('customerNationalId', { defaultValue: 'National ID' })}</TableHead>
                  <TableHead>{t('stockCode', { defaultValue: 'Stock code' })}</TableHead>
                  <TableHead>{t('createdAt', { defaultValue: 'Created' })}</TableHead>
                  <TableHead>{t('updatedAt', { defaultValue: 'Updated' })}</TableHead>
                  <TableHead>{t('filterStatus', { defaultValue: 'Status' })}</TableHead>
                  <TableHead className="text-center w-20">{t('actions', { defaultValue: 'Actions' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((c, idx) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                    <TableCell className="font-mono text-xs">{c.caseNumber}</TableCell>
                    <TableCell className="text-xs">
                      {c.customerType === 'Individual'
                        ? t('customerTypeIndividual', { defaultValue: 'Individual' })
                        : t('customerTypeLegal', { defaultValue: 'Legal entity' })}
                    </TableCell>
                    <TableCell className="font-medium">{c.customerName}</TableCell>
                    <TableCell className="font-mono text-xs">{c.customerNationalId}</TableCell>
                    <TableCell className="font-mono text-xs">{c.stockCode ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                    <TableCell className="text-xs">{formatDate(c.updatedAt)}</TableCell>
                    <TableCell>
                      <CaseStatusBadge archived={c.isArchived} />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button asChild variant="ghost" mode="icon" size="sm">
                          <Link href={`/cases/${c.id}`}>
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        {!c.isArchived && (
                          <Button
                            variant="ghost"
                            mode="icon"
                            size="sm"
                            onClick={() => setArchiveTarget(c)}
                            title={t('archive', { defaultValue: 'Archive' })}
                          >
                            <Archive className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      {t('searchNoResults', { defaultValue: 'No case files match these filters.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent dir={isRtl ? 'rtl' : 'ltr'}>
          <AlertDialogHeader className="text-start sm:text-start">
            <AlertDialogTitle>{t('confirmArchiveTitle', { defaultValue: 'Archive case' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmArchive', { defaultValue: 'Archive this case?' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:space-x-0 sm:gap-2.5">
            <AlertDialogCancel className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40">
              {t('cancel', { defaultValue: 'Cancel' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchive}>
              {t('archive', { defaultValue: 'Archive' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
