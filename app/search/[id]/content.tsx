'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { NotInThisVersion } from '../../components/crs-page';

/**
 * The view of another brokerage's case is not part of this version. The route stays so a link to it lands on a
 * sentence; nothing here reads or writes any data.
 */
export function CrossBrokerageDetailContent() {
  const { t } = useTranslation('customer-risk');
  return <NotInThisVersion title={t('pageTitleSearchDetail', { defaultValue: 'Case inquiry' })} />;
}
