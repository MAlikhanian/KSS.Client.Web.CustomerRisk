'use client';

import { Navbar } from '@/partials/navbar/navbar';
import { NavbarMenu } from '@/partials/navbar/navbar-menu';
import { useSettings } from '@/providers/settings-provider';
import { Container } from '@/components/common/container';
import { useTranslation } from '@/hooks/useTranslation';
import { ActingBrokeragePicker } from './components/acting-brokerage-picker';

const PageNavbar = () => {
  const { settings } = useSettings();
  const { t } = useTranslation('customer-risk');

  const items = [
    { title: t('navLanding', { defaultValue: 'Overview' }), path: '/customer-risk/overview' },
    { title: t('navCases', { defaultValue: 'My Cases' }), path: '/customer-risk/cases' },
    { title: t('navArchive', { defaultValue: 'Archive' }), path: '/customer-risk/archive' },
    { title: t('navNewCase', { defaultValue: 'New Case' }), path: '/customer-risk/new-case' },
    { title: t('navSearch', { defaultValue: 'Search' }), path: '/customer-risk/search' },
    { title: t('navAuditLog', { defaultValue: 'Audit Log' }), path: '/customer-risk/audit-log' },
    {
      title: t('navAdmin', { defaultValue: 'Admin' }),
      children: [
        {
          title: t('navAdminUsers', { defaultValue: 'Users' }),
          path: '/customer-risk/admin/users',
        },
        {
          title: t('navAdminIps', { defaultValue: 'IP Whitelist' }),
          path: '/customer-risk/admin/ip-whitelist',
        },
      ],
    },
  ];

  if (settings?.layout === 'demo1') {
    return (
      <Navbar>
        <Container>
          <div className="flex items-center justify-between w-full gap-3">
            <div className="flex-1 min-w-0">
              <NavbarMenu items={items} />
            </div>
            <div className="shrink-0">
              <ActingBrokeragePicker compact />
            </div>
          </div>
        </Container>
      </Navbar>
    );
  }
  return <></>;
};

export { PageNavbar };
