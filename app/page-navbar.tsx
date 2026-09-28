'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslation } from '@/hooks/useTranslation';
import { useBrokerageLabel, useCrsMe } from './components/crs-access';

/**
 * The zone's own tabs. This version has four screens; the cross-brokerage
 * search, the audit log and the administration screens are not in it, and are
 * not offered here. Their routes still answer with a "not in this version"
 * card, because the estate sidebar (a kit-synced file this zone does not own)
 * still links to them.
 *
 * On the right, the filing brokerage the service resolved for the caller.
 * There is no brokerage chooser: the service decides, on every request.
 */
const PageNavbar = () => {
  const { settings } = useSettings();
  const { t } = useTranslation('customer-risk');
  const { data: me } = useCrsMe();
  const brokerageLabel = useBrokerageLabel();

  const items = [
    { title: t('navLanding', { defaultValue: 'Overview' }), path: '/customer-risk/overview' },
    { title: t('navCases', { defaultValue: 'My Cases' }), path: '/customer-risk/cases' },
    { title: t('navArchive', { defaultValue: 'Archive' }), path: '/customer-risk/archive' },
    { title: t('navNewCase', { defaultValue: 'New Case' }), path: '/customer-risk/new-case' },
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
