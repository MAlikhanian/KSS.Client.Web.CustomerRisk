'use client';

import { RiErrorWarningFill } from '@remixicon/react';
import { Container } from '@/components/common/container';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Tells the viewer that the records on screen are not a real customer's.
 *
 * Every case, person and risk in this zone comes from lib/customer-risk/mock-store.ts
 * — generated rows in the browser's own localStorage, never a customer record.
 *
 * WHY IT IS MOUNTED IN app-shell.tsx AND NOT ON EACH PAGE. Per-page markers would
 * satisfy this today and fail silently the first time a route is added, and a
 * partly-marked app is worse than an unmarked one: it tells the reader the
 * unmarked screens are the real ones. Mounting it in the single branch that
 * renders content makes an unmarked screen unreachable rather than unlikely.
 *
 * NOT DISMISSIBLE, deliberately — <Alert> defaults to close={false} and no close
 * handler is passed. A disclosure the viewer can close is absent for everyone who
 * has closed it.
 *
 * NO defaultValue ON THE t() CALL, deliberately, and it is the one place in this
 * zone that omits one. The wording is approved text held as bytes elsewhere; a
 * defaultValue would be a hand-copied second original of it, and the two Persian
 * hazards — a ZWNJ inside the first word, and an em-dash rather than a hyphen —
 * are both invisible on screen if a copy gets them wrong. The key is present in
 * every locale, so it always resolves.
 */
export function MockDataBanner() {
  const { t } = useTranslation('customer-risk');

  return (
    <Container>
      <Alert variant="warning" appearance="light" className="mb-5">
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{t('mockDataBanner')}</AlertTitle>
      </Alert>
    </Container>
  );
}
