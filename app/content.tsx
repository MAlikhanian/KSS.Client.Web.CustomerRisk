'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import { TcBanner } from './components/tc-banner';
import { useActingBrokerage } from './components/acting-brokerage-picker';
import {
  getBrokerage,
  listAuditEntries,
  listCasesByBrokerage,
  listRelatedPersons,
} from '@/lib/customer-risk/mock-store';

interface Stats {
  active: number;
  archived: number;
  relatedPersons: number;
  auditEntries: number;
}

export function LandingContent() {
  const { t } = useTranslation('customer-risk');
  const { language } = useLanguage();
  const { brokerageId, tick } = useActingBrokerage();
  const [stats, setStats] = useState<Stats>({ active: 0, archived: 0, relatedPersons: 0, auditEntries: 0 });
  const [brokerageName, setBrokerageName] = useState<string>('—');

  useEffect(() => {
    if (!brokerageId) return;
    const cases = listCasesByBrokerage(brokerageId);
    const active = cases.filter((c) => !c.isArchived).length;
    const archived = cases.length - active;
    const relatedPersons = cases.reduce((sum, c) => sum + listRelatedPersons(c.id).length, 0);
    const auditEntries = listAuditEntries({ brokerageId }).length;
    setStats({ active, archived, relatedPersons, auditEntries });

    const brokerage = getBrokerage(brokerageId);
    if (brokerage) {
      setBrokerageName(language.code === 'en' ? brokerage.nameEn : brokerage.nameFa);
    }
  }, [brokerageId, tick, language.code]);

  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle
                text={t('pageTitleLanding', { defaultValue: 'Customer Risk System' })}
              />
              <ToolbarDescription>{t('descLanding')}</ToolbarDescription>
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
        <TcBanner />

        <Card>
          <CardContent className="py-5">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('actingBrokerage', { defaultValue: 'Acting Brokerage' })}
                </Label>
                <div className="text-sm font-semibold">{brokerageName}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsActiveCases', { defaultValue: 'Active cases' })}
                </Label>
                <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  {stats.active}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsArchivedCases', { defaultValue: 'Archived cases' })}
                </Label>
                <div className="text-sm font-semibold">{stats.archived}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsRelatedPersons', { defaultValue: 'Related persons' })}
                </Label>
                <div className="text-sm font-semibold">{stats.relatedPersons}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {t('statsAuditEntries', { defaultValue: 'Audit entries' })}
                </Label>
                <div className="text-sm font-semibold">{stats.auditEntries}</div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
