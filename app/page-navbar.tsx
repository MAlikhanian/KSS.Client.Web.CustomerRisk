'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslation } from '@/hooks/useTranslation';
import { holdsSearchPermission } from '@/lib/customer-risk/search-access';
import {
  filesCases,
  seesAllBrokerages,
  useBrokerageLabel,
  useCrsMe,
} from './components/crs-access';

/**
 * The zone's own tabs. The national-id search, which spans every brokerage, is
 * offered only to a caller holding CustomerRisk.Search.Read. The cross-brokerage search, the audit
 * log and the administration screens are not in this version, and are not
 * offered here. Their routes still answer with a "not in this version"
 * card, because the estate sidebar (a kit-synced file this zone does not own)
 * still links to them.
 *
 * On the right, the filing brokerage the service resolved for the caller, when
 * there is one. The navbar never chooses a brokerage: the service resolves it,
 * or a caller who may choose picks it per case on the new-case form.
 *
 * New Case is left out for a caller who sees every brokerage at view level
 * only, once /Me says so; until /Me answers, the tab is shown as before. The
 * page itself still explains the refusal to anyone who reaches it another way.
 */
const PageNavbar = () => {
  const { settings } = useSettings();
  const { t } = useTranslation('customer-risk');
  const { data: me } = useCrsMe();
  const brokerageLabel = useBrokerageLabel();
  const viewOnly = !!me && seesAllBrokerages(me) && !filesCases(me);
  const maySearch = !!me && holdsSearchPermission(me);

  const items = [
    { title: t('navLanding', { defaultValue: 'Overview' }), path: '/customer-risk/overview' },
    ...(maySearch ? [{ title: t('navSearch', { defaultValue: 'Search' }), path: '/customer-risk/search' }] : []),
    { title: t('navCases', { defaultValue: 'My Cases' }), path: '/customer-risk/cases' },
    { title: t('navArchive', { defaultValue: 'Archive' }), path: '/customer-risk/archive' },
    ...(viewOnly
      ? []
      : [{ title: t('navNewCase', { defaultValue: 'New Case' }), path: '/customer-risk/new-case' }]),
  ];

  if (settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex-1 min-w-0">
              <NavbarMenu items={items} />
            </div>
            {me?.status === 'resolved' && (
              <div className="shrink-0 text-xs text-muted-foreground truncate max-w-[40%]">
                {t('owningBrokerage', { defaultValue: 'Owning brokerage' })}:{' '}
                <span className="font-medium text-foreground">{brokerageLabel(me.filingBrokerage)}</span>
              </div>
            )}
          </div>
        </Container>
      </Navbar>
    );
  }
  return <></>;
};

export { PageNavbar };
