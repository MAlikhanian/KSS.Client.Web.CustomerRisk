'use client';

import { Fragment, use } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { CrossBrokerageDetailContent } from './content';

// The read-only view of a case the national-id search found in another
// brokerage. The URL carries the case id only; the national id it was found by
// is held in memory by the search.
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
