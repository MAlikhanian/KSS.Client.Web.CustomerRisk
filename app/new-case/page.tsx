'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { NewCaseContent } from './content';

export default function CustomerRiskNewCasePage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <NewCaseContent />
      </Container>
    </Fragment>
  );
}
