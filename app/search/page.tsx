'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { SearchContent } from './content';

export default function CustomerRiskSearchPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <SearchContent />
      </Container>
    </Fragment>
  );
}
