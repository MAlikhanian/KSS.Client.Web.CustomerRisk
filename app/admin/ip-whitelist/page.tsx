'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { AdminIpsContent } from './content';

export default function CustomerRiskAdminIpsPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AdminIpsContent />
      </Container>
    </Fragment>
  );
}
