'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { NotInThisVersion } from '../components/crs-page';

/**
 * The audit log is not part of this version. The route stays so a link to it lands on a
 * sentence; nothing here reads or writes any data.
 */
export function AuditLogContent() {
  const { t } = useTranslation('customer-risk');
  return <NotInThisVersion title={t('pageTitleAuditLog', { defaultValue: 'Audit Log' })} />;
}
