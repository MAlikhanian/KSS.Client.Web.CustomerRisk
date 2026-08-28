'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, Search as SearchIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useActingBrokerage } from '../components/acting-brokerage-picker';
import { CaseStatusBadge } from '../components/case-status-badge';
import type { CrsBrokerage, CrsRiskCaseFile } from '@/lib/customer-risk/types';
import {
  defaultActorName,
  listBrokerages,
  pushAuditEntry,
  searchCasesByText,
} from '@/lib/customer-risk/mock-store';
import { formatDate } from '@/lib/customer-risk/format';

export function SearchContent() {
  const { t } = useTranslation('customer-risk');
  const { language } = useLanguage();
  const { brokerageId } = useActingBrokerage();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CrsRiskCaseFile[] | null>(null);
  const [brokerages, setBrokerages] = useState<CrsBrokerage[]>([]);

  useEffect(() => {
    setBrokerages(listBrokerages());
  }, []);

  const brokeragesById = useMemo(() => {
    const m = new Map<string, CrsBrokerage>();
    for (const b of brokerages) m.set(b.id, b);
    return m;
  }, [brokerages]);

  const brokerageLabel = (id: string) => {
    const b = brokeragesById.get(id);
    if (!b) return '—';
    return language.code === 'en' ? b.nameEn : b.nameFa;
  };

  const handleSearch = () => {
    const q = query.trim();
    setResults(searchCasesByText(q));

    if (brokerageId) {
      const actor = defaultActorName(brokerageId);
      pushAuditEntry({
        brokerageId,
        userName: actor,
        action: 'Search',
        details: q ? `q=${q}` : '(empty query)',
      });
    }
  };

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleSearch', { defaultValue: 'Search & Inquiry' })} />
              <ToolbarDescription>{t('descSearch')}</ToolbarDescription>
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
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1 flex-1 min-w-[240px] max-w-md">
                <Label className="text-xs text-muted-foreground">
                  {t('search', { defaultValue: 'Search' })}
                </Label>
                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearch();
                    }}
                    placeholder={t('searchPlaceholder', { defaultValue: 'Search by name or national ID' })}
                    className="ps-9"
                  />
                </div>
              </div>
              <Button onClick={handleSearch} disabled={!query.trim()}>
                <SearchIcon className="size-4" />
                {t('search', { defaultValue: 'Search' })}
              </Button>
            </div>
          </CardContent>
        </Card>

        {results !== null && (
          <Card>
            <CardContent className="py-5">
              <div className="text-sm mb-3">
                {t('searchResultCount', {
                  defaultValue: '{{count}} matching case file(s) found.',
                  count: results.length,
                })}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead>{t('caseNumber', { defaultValue: 'Case #' })}</TableHead>
                    <TableHead>{t('owningBrokerage', { defaultValue: 'Owning brokerage' })}</TableHead>
                    <TableHead>{t('customerType', { defaultValue: 'Type' })}</TableHead>
                    <TableHead>{t('customerName', { defaultValue: 'Customer' })}</TableHead>
                    <TableHead>{t('customerNationalId', { defaultValue: 'National ID' })}</TableHead>
                    <TableHead>{t('stockCode', { defaultValue: 'Stock code' })}</TableHead>
                    <TableHead>{t('createdAt', { defaultValue: 'Created' })}</TableHead>
                    <TableHead>{t('filterStatus', { defaultValue: 'Status' })}</TableHead>
                    <TableHead className="text-center w-20">{t('actions', { defaultValue: 'Actions' })}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((c, idx) => {
                    const isOwn = brokerageId === c.brokerageId;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                        <TableCell className="font-mono text-xs">{c.caseNumber}</TableCell>
                        <TableCell>
                          {brokerageLabel(c.brokerageId)}
                          {isOwn && (
                            <Badge variant="secondary" appearance="light" className="ms-2 text-[10px]">
                              {t('ownBrokerageBadge', { defaultValue: 'Yours' })}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.customerType === 'Individual'
                            ? t('customerTypeIndividual', { defaultValue: 'Individual' })
                            : t('customerTypeLegal', { defaultValue: 'Legal entity' })}
                        </TableCell>
                        <TableCell className="font-medium">{c.customerName}</TableCell>
                        <TableCell className="font-mono text-xs">{c.customerNationalId}</TableCell>
                        <TableCell className="font-mono text-xs">{c.stockCode ?? '—'}</TableCell>
                        <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                        <TableCell>
                          <CaseStatusBadge archived={c.isArchived} />
                        </TableCell>
                        <TableCell className="text-center">
                          <Button asChild variant="ghost" mode="icon" size="sm">
                            <Link
                              href={
                                isOwn
                                  ? `/customer-risk/cases/${c.id}`
                                  : `/customer-risk/search/${c.id}`
                              }
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {results.length === 0 && (
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
        )}
      </div>
    </div>
  );
}
