'use client';

import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import type { CaseStatus } from '@/lib/customer-risk/types';

export function CaseStatusBadge({
  archived,
  className,
}: {
  archived: boolean;
  className?: string;
}) {
  const { t } = useTranslation('customer-risk');
  const status: CaseStatus = archived ? 'Archived' : 'Active';

  if (status === 'Archived') {
    return (
      <Badge
        variant="outline"
        className={`text-xs font-medium bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 ${className ?? ''}`}
      >
        {t('statusArchived', { defaultValue: 'Archived' })}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 ${className ?? ''}`}
    >
      {t('statusActive', { defaultValue: 'Active' })}
    </Badge>
  );
}
