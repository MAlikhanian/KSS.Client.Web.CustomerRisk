'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { LandingContent } from '../content';

export default function CustomerRiskOverviewPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <LandingContent />
      </Container>
    </Fragment>
  );
}
