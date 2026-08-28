'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { AdminUsersContent } from './content';

export default function CustomerRiskAdminUsersPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AdminUsersContent />
      </Container>
    </Fragment>
  );
}
