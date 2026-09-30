'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { viewCaseByNationalId } from '@/lib/customer-risk/api';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import { companyName, languageIdFor } from '@/lib/customer-risk/format';
import { holdsSearchPermission, isOwnBrokerage, searchBrokerageText } from '@/lib/customer-risk/search-access';
import { searchedNationalIdInMemory } from '@/lib/customer-risk/search-memory';
import { CaseView } from '../../cases/[id]/content';
import type { MeDto } from '@/lib/customer-risk/types';
import { CrsAccessGate, CrsNotice, useBrokerageLabel } from '../../components/crs-access';
import { CrsPage } from '../../components/crs-page';

/**
 * The read-only view of a case the national-id search found in another
 * brokerage. The service serves it only for the id the case was found by,
 * which the search holds in memory: after a reload or in a new tab there is
 * none, nothing is called, and the view says the case is not available.
 *
 * It offers no action of any kind. Every refusal reads the same, so it never
 * tells a wrong id from a missing case; the one exception is the company
 * search refusal, which depends only on the caller's own permissions.
 */
export function CrossBrokerageDetailContent({ id }: { id: string }) {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage
      title={t('pageTitleSearchDetail', { defaultValue: 'Cross-Brokerage Inquiry View' })}
      description={t('descCaseViewReadOnly', {
        defaultValue: 'A read-only view of a case found by national ID search.',
      })}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/search">{t('back', { defaultValue: 'Back' })}</Link>
        </Button>
      }
    >
      <CrsAccessGate admit={holdsSearchPermission}>{(me) => <ReadOnlyCase id={id} me={me} />}</CrsAccessGate>
    </CrsPage>
  );
}

function ReadOnlyCase({ id, me }: { id: string; me: MeDto }) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const brokerageLabel = useBrokerageLabel();
  const nationalId = searchedNationalIdInMemory();

  // The query key carries the case id only; the national id is passed in the
  // request and kept out of every key and URL.
  const { data: caseFile, error, isPending } = useQuery({
    queryKey: ['customer-risk', 'case-view', id],
    queryFn: () => viewCaseByNationalId({ caseId: id, nationalId: nationalId ?? '' }),
    enabled: !!nationalId,
    retry: false,
    gcTime: 0,
  });

  const notAvailable = (
    <CrsNotice title={t('caseViewNotAvailable', { defaultValue: 'This case is not available.' })} />
  );

  if (!nationalId) return notAvailable;
  if (error) {
    if (isCrsCode(error, 'CRS_COMPANY_SEARCH_NOT_ALLOWED')) return <CrsNotice title={crsErrorMessage(t, error)} />;
    return notAvailable;
  }
  if (isPending || !caseFile) {
    return <CrsNotice tone="info" title={t('loading', { defaultValue: 'Loading…' })} />;
  }
  // The same wording as the search table: the name when the service could read
  // it; otherwise the caller's own brokerage keeps its usual wording and any
  // other brokerage is named neutrally, never by its id.
  const ref = caseFile.brokerage;
  const brokerageField = {
    label: t('registeringBrokerage', { defaultValue: 'Registering brokerage' }),
    text: searchBrokerageText(
      ref?.resolved ? companyName(ref.names, languageId) : '',
      isOwnBrokerage(me.filingBrokerage?.id, ref?.id),
      brokerageLabel(ref),
      t('brokerageOther', { defaultValue: 'Another brokerage' }),
    ),
  };
  return <CaseView caseFile={caseFile} canArchive={false} showBrokerage brokerageField={brokerageField} />;
}
