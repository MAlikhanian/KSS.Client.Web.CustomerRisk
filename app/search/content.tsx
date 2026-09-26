'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { NotInThisVersion } from '../components/crs-page';

/**
 * The cross-brokerage search is not part of this version. The route stays so a link to it lands on a
 * sentence; nothing here reads or writes any data.
 */
export function SearchContent() {
  const { t } = useTranslation('customer-risk');
  return <NotInThisVersion title={t('pageTitleSearch', { defaultValue: 'Search' })} />;
}
