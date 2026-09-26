'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { CaseList } from '../components/case-list';
import { CrsPage } from '../components/crs-page';

export function ArchiveListContent() {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage title={t('pageTitleArchive', { defaultValue: 'Archive' })} description={t('descArchive')}>
      <CaseList archived />
    </CrsPage>
  );
}
