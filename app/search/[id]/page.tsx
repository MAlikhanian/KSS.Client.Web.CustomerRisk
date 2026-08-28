'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { CrossBrokerageDetailContent } from './content';

export default function CustomerRiskCrossBrokerageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CrossBrokerageDetailContent id={id} />
      </Container>
    </Fragment>
  );
}
