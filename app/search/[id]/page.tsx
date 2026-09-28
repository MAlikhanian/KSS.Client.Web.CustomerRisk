'use client';

import { Fragment } from 'react';
import { Container } from '@/components/common/container';
import { PageNavbar } from '../../page-navbar';
import { CrossBrokerageDetailContent } from './content';

// The inquiry view of another brokerage's case is not in this version. The id
// in the URL is deliberately not read: nothing on this route calls the service.
export default function CustomerRiskCrossBrokerageDetailPage() {
  return (
    <Fragment>
      <PageNavbar />
      <Container>
        <CrossBrokerageDetailContent />
      </Container>
    </Fragment>
  );
}
