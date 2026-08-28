'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { CasesListContent } from './content';

export default function CustomerRiskCasesPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CasesListContent />
      </Container>
    </Fragment>
  );
}
