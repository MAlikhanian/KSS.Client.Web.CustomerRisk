'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../page-navbar';
import { ArchiveListContent } from './content';

export default function CustomerRiskArchivePage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <ArchiveListContent />
      </Container>
    </Fragment>
  );
}
