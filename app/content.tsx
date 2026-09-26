'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { listCases } from '@/lib/customer-risk/api';
import { crsErrorMessage } from '@/lib/customer-risk/messages';
import { CrsPermission, type MeDto } from '@/lib/customer-risk/types';
import { CrsAccessGate, CrsNotice, CrsStanding } from './components/crs-access';
import { CrsPage } from './components/crs-page';
import { TcBanner } from './components/tc-banner';

export function LandingContent() {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage
      title={t('pageTitleLanding', { defaultValue: 'Customer Risk System' })}
      description={t('descLanding')}
    >
      <TcBanner />
      <CrsAccessGate permission={CrsPermission.CaseRead}>{(me) => <Overview me={me} />}</CrsAccessGate>
    </CrsPage>
  );
}

/** The filing brokerage and its case counts. Counts come from the service's own totals. */
function Overview({ me }: { me: MeDto }) {
  const { t } = useTranslation('customer-risk');

  const active = useQuery({
    queryKey: ['customer-risk', 'cases', { archived: false, q: '', page: 1, count: true }],
    queryFn: () => listCases({ archived: false, q: '', page: 1, pageSize: 1 }),
  });
  const archived = useQuery({
    queryKey: ['customer-risk', 'cases', { archived: true, q: '', page: 1, count: true }],
    queryFn: () => listCases({ archived: true, q: '', page: 1, pageSize: 1 }),
  });

  const error = active.error ?? archived.error;
  const count = (q: typeof active) => (q.data ? String(q.data.total) : '—');

  return (
    <>
      <CrsStanding me={me} />
      {error ? (
        <CrsNotice tone="destructive" title={crsErrorMessage(t, error)} />
      ) : (
        <Card>
          <CardContent className="py-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsActiveCases', { defaultValue: 'Active cases' })}
                </Label>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{count(active)}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsArchivedCases', { defaultValue: 'Archived cases' })}
                </Label>
                <div className="text-sm font-semibold">{count(archived)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
