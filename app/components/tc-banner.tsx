'use client';

import { useEffect, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

// Versioned: a change to the terms asks everyone to accept them again. An
// earlier acceptance is left in storage and no longer read.
const ACCEPTED_KEY = 'customer-risk:tc-accepted:v2';

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
 * The terms as an accordion. Collapsed, the clauses are clipped to about three
 * lines under a fade; the full text stays in the page either way, so nothing is
 * shortened, only hidden from view. Before acceptance it opens expanded, next to
 * the checkbox; after acceptance it opens collapsed.
 */
export function TcBanner() {
  const { t, i18n } = useTranslation('customer-risk');
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const titleId = useId();
  const termsId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const wasAccepted = window.localStorage.getItem(ACCEPTED_KEY) === '1';
    setAccepted(wasAccepted);
    setExpanded(!wasAccepted);
  }, []);

  const accept = () => {
    if (!checked) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCEPTED_KEY, '1');
    }
    setAccepted(true);
    setExpanded(false);
  };

  return (
    <Card>
      <CardContent className="py-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id={titleId} className="flex-1 text-sm font-semibold text-center">
            {t('tcTitle', { defaultValue: 'Terms & Regulations' })}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-labelledby={titleId}
            aria-expanded={expanded}
            aria-controls={termsId}
            onClick={() => setExpanded((v) => !v)}
          >
            <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
          </Button>
        </div>
        {/* The terms are in Persian only; the English page says so, in the owner's own words. */}
        {i18n.language === 'en' && (
          <p className="text-xs text-muted-foreground">
            {t('tcPersianOnlyNote', { defaultValue: 'These terms are available in Persian only.' })}
          </p>
        )}
        <div id={termsId} className={cn('relative', !expanded && 'max-h-16 overflow-hidden')}>
          <TcTerms />
          {!expanded && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
          )}
        </div>
        {!accepted && (
          <>
            <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
              <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
              {t('tcAccepted', { defaultValue: 'I have read and accept the terms and regulations.' })}
            </label>
            <div className="flex justify-end">
              <Button disabled={!checked} onClick={accept}>
                {t('tcAccepted')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
