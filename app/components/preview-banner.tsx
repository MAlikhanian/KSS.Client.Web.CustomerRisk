'use client';

import { RiErrorWarningFill } from '@remixicon/react';
import { Container } from '@/components/common/container';
import { Alert, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * PREVIEW-ONLY. REMOVE BEFORE A PRODUCTION BUILD.
 *
 * Tells the viewer that this zone is a preview for review, not the released
 * system. It replaces the earlier sample-data banner: the screens now read the
 * real service, so "sample data" would be false.
 *
 * HOW IT IS KEPT OUT OF PRODUCTION. Every place it lives carries a mark a grep
 * finds: the tag PREVIEW-ONLY in this file and at its mount in app-shell.tsx,
 * and the key name `previewOnlyBanner` in both locale files (JSON has no
 * comments, so the key's own name is the mark). The production build steps in
 * deployment/docker-k8s-command.txt begin with that grep, and it must print
 * nothing before a production image is built. Remove all three together.
 *
 * MOUNTED IN app-shell.tsx, above the page, so one mount covers every screen,
 * including routes added later. NOT DISMISSIBLE: a notice the viewer can close
 * is absent for everyone who has closed it.
 *
 * NO defaultValue ON THE t() CALL, deliberately. The wording is approved text;
 * without a defaultValue each language's text exists in exactly one place
 * (i18n/customer-risk/{en,fa}.json), so a correction is one edit there. The key
 * is present in both locales, so it always resolves.
 */
export function PreviewBanner() {
  const { t } = useTranslation('customer-risk');

  return (
    <Container>
      <Alert variant="warning" appearance="light" className="mb-5">
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{t('previewOnlyBanner')}</AlertTitle>
      </Alert>
    </Container>
  );
}
