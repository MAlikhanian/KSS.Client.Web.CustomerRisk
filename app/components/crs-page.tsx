'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Toolbar,
  ToolbarActions,
  ToolbarDescription,
  ToolbarHeading,
  ToolbarPageTitle,
} from '@/partials/common/toolbar';
import { useTranslation } from '@/hooks/useTranslation';
import { CrsNotice } from './crs-access';

/**
 * The frame every Customer Risk screen shares: the title card, then the
 * rose-tinted stack its cards sit in. The title card sits outside the tint
 * wrapper so it keeps its own border.
 */
export function CrsPage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 lg:space-y-7.5">
      <Card className="bg-rose-50/25! border-rose-100! dark:bg-rose-950/25! dark:border-rose-900! shadow-lg shadow-black/5">
        <CardContent className="py-5">
          <Toolbar>
            <ToolbarHeading>
              <ToolbarPageTitle text={title} />
              {description && <ToolbarDescription>{description}</ToolbarDescription>}
            </ToolbarHeading>
            {actions && <ToolbarActions>{actions}</ToolbarActions>}
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
        {children}
      </div>
    </div>
  );
}

/**
 * Stands in for a screen that exists in the design but not in this version:
 * the cross-brokerage search, the audit log and the administration screens.
 * The route stays so a link to it (the estate sidebar still has them) lands on
 * a sentence instead of a 404. Nothing on these screens calls the service.
 */
export function NotInThisVersion({ title }: { title: string }) {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage title={title}>
      <CrsNotice
        tone="info"
        title={t('notInThisVersion', { defaultValue: 'This screen is not part of this version.' })}
      />
    </CrsPage>
  );
}
