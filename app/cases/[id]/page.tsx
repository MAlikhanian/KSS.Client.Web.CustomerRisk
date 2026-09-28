'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { CaseDetailContent } from './content';

export default function CustomerRiskCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CaseDetailContent id={id} />
      </Container>
    </Fragment>
  );
}
