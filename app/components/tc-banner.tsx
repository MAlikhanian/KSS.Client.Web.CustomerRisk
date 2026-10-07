'use client';

import { TermsAcceptance } from '@/components/common/terms-acceptance';
import { useTranslation } from '@/hooks/useTranslation';

/** The application these terms belong to, as the terms service knows it. */
const TERMS_APPLICATION_KEY = 'customerrisk';

/**
 * The version of the clauses below. Change it only together with the clause
 * text, in the same release, and only then the service's configured version:
 * a new version asks everyone to accept again, on every device. A wording or
 * layout change elsewhere on the card is not a new version.
 */
const TERMS_VERSION = '2026-09-30';

/**
 * The terms as numbered clauses, in the order of the source document. The
 * numbers are the list's own markers and are not part of the text: Persian
 * digits wherever the browser supports the persian list style, decimal digits
 * otherwise. The clauses exist in Persian only, so the block is marked Persian
 * and right-to-left whatever the screen's language.
 */
function TcTerms() {
  const { t } = useTranslation('customer-risk');
  return (
    <ol
      dir="rtl"
      lang="fa"
      className="text-sm space-y-2 list-decimal supports-[list-style-type:persian]:[list-style-type:persian] ps-5 text-justify"
    >
      <li>{t('tcItem01')}</li>
      <li>{t('tcItem02')}</li>
      <li>{t('tcItem03')}</li>
      <li>{t('tcItem04')}</li>
      <li>{t('tcItem05')}</li>
      <li>{t('tcItem06')}</li>
      <li>{t('tcItem07')}</li>
      <li>{t('tcItem08')}</li>
      <li>{t('tcItem09')}</li>
      <li>{t('tcItem10')}</li>
      <li>{t('tcItem11')}</li>
      <li>{t('tcItem12')}</li>
      <li>{t('tcItem13')}</li>
      <li>{t('tcItem14')}</li>
      <li>{t('tcItem15')}</li>
      <li>{t('tcItem16')}</li>
      <li>{t('tcItem17')}</li>
      <li>{t('tcItem18')}</li>
      <li>{t('tcItem19')}</li>
      <li>{t('tcItem20')}</li>
    </ol>
  );
}

/**
 * The terms card. Acceptance is recorded by the terms service against the
 * signed-in person, so it holds on every browser and device; the shared card
 * supplies the behaviour (no answer shown until the service has answered, a
 * reason for every disabled state, a retry on failure). This system supplies
 * the clauses, their version and its own wording for the labels. Labels it
 * does not word use the shared card's neutral defaults.
 */
export function TcBanner() {
  const { t, i18n } = useTranslation('customer-risk');
  return (
    <TermsAcceptance
      applicationKey={TERMS_APPLICATION_KEY}
      version={TERMS_VERSION}
      labels={{
        title: t('tcTitle', { defaultValue: 'Terms & Regulations' }),
        checkbox: t('tcAccepted', { defaultValue: 'I have read and accept the terms and regulations.' }),
        accept: t('tcAcceptButton', { defaultValue: 'Accept' }),
        hint: t('tcAcceptHint', { defaultValue: 'Select the option above first.' }),
        accepted: t('tcAcceptedDone', { defaultValue: 'Accepted' }),
      }}
    >
      {/* The terms are in Persian only; the English page says so, in the owner's own
          words, above the clauses so that it shows in the collapsed preview. */}
      {i18n.language === 'en' && (
        <p className="text-xs text-muted-foreground mb-2">
          {t('tcPersianOnlyNote', { defaultValue: 'These terms are available in Persian only.' })}
        </p>
      )}
      <TcTerms />
    </TermsAcceptance>
  );
}
