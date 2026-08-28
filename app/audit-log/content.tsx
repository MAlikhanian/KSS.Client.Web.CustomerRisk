'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
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
import { useActingBrokerage } from '../components/acting-brokerage-picker';
import type { AuditAction, CrsAuditLogEntry } from '@/lib/customer-risk/types';
import { listAuditEntries } from '@/lib/customer-risk/mock-store';
import { formatDateTime } from '@/lib/customer-risk/format';

function actionLabel(action: AuditAction, t: (k: string, o?: { defaultValue?: string }) => string): string {
  return t(`auditAction${action}`, { defaultValue: action });
}

export function AuditLogContent() {
  const { t } = useTranslation('customer-risk');
  const { brokerageId, tick } = useActingBrokerage();

  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<CrsAuditLogEntry[]>([]);

  useEffect(() => {
    if (!brokerageId) {
      setEntries([]);
      return;
    }
    setEntries(listAuditEntries({ brokerageId }));
  }, [brokerageId, tick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const haystack = [e.userName, e.ipAddress, e.resourceLabel, e.details, e.action, actionLabel(e.action, t)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, query, t]);

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={t('pageTitleAuditLog', { defaultValue: 'Audit Log' })} />
              <ToolbarDescription>{t('descAuditLog')}</ToolbarDescription>
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
                    placeholder={t('auditSearchPlaceholder', { defaultValue: 'Search: action, user, IP, resource, details' })}
                    className="ps-9"
                  />
                </div>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead>{t('auditTimestamp', { defaultValue: 'Timestamp' })}</TableHead>
                  <TableHead>{t('auditAction', { defaultValue: 'Action' })}</TableHead>
                  <TableHead>{t('auditUser', { defaultValue: 'User' })}</TableHead>
                  <TableHead>{t('auditIp', { defaultValue: 'IP' })}</TableHead>
                  <TableHead>{t('auditResource', { defaultValue: 'Resource' })}</TableHead>
                  <TableHead>{t('auditDetails', { defaultValue: 'Details' })}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e, idx) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-center text-xs">{idx + 1}</TableCell>
                    <TableCell className="text-xs">{formatDateTime(e.timestamp)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" appearance="light" className="text-xs">
                        {actionLabel(e.action, t)}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.userName}</TableCell>
                    <TableCell className="font-mono text-xs">{e.ipAddress ?? '—'}</TableCell>
                    <TableCell className="font-mono text-xs">{e.resourceLabel ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-md">{e.details ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('auditNoEntries', { defaultValue: 'No audit entries.' })}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
