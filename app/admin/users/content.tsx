'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { NotInThisVersion } from '../../components/crs-page';

/**
 * User administration is not part of this version. The route stays so a link to it lands on a
 * sentence; nothing here reads or writes any data.
 */
export function AdminUsersContent() {
  const { t } = useTranslation('customer-risk');
  return <NotInThisVersion title={t('pageTitleAdminUsers', { defaultValue: 'Users' })} />;
}
