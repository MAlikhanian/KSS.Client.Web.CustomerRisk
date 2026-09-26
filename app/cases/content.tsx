'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { CaseList } from '../components/case-list';
import { CrsPage } from '../components/crs-page';

export function CasesListContent() {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage title={t('pageTitleCases', { defaultValue: 'My Cases' })} description={t('descCases')}>
      <CaseList archived={false} />
    </CrsPage>
  );
}
