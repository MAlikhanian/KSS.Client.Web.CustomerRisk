'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { AuditLogContent } from './content';

export default function CustomerRiskAuditLogPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <AuditLogContent />
      </Container>
    </Fragment>
  );
}
