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
 * The terms as an accordion that always opens collapsed: the clauses are
 * clipped to about three lines under a fade. The whole header row, title and
 * arrow, is one button that opens and closes it; clicking the faded preview
 * also opens it. The full text stays in the page either way, so nothing is
 * shortened, only hidden from view. Before acceptance, the checkbox and the
 * accept button sit under the card whether it is open or not.
 */
export function TcBanner() {
  const { t, i18n } = useTranslation('customer-risk');
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const termsId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAccepted(window.localStorage.getItem(ACCEPTED_KEY) === '1');
  }, []);

  const accept = () => {
    if (!checked) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCEPTED_KEY, '1');
    }
    setAccepted(true);
  };

  return (
    <Card>
      <CardContent className="py-5 space-y-3">
        <h3 className="text-sm font-semibold">
          {/* The only control that opens and closes the terms, and the keyboard path;
              its accessible name is the title it contains. */}
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={termsId}
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-2 rounded-md p-1 cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex-1 text-center">{t('tcTitle', { defaultValue: 'Terms & Regulations' })}</span>
            <ChevronDown
              className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        </h3>
        {/* The terms are in Persian only; the English page says so, in the owner's own words. */}
        {i18n.language === 'en' && (
          <p className="text-xs text-muted-foreground">
            {t('tcPersianOnlyNote', { defaultValue: 'These terms are available in Persian only.' })}
          </p>
        )}
        <div id={termsId} className={cn('relative', !expanded && 'max-h-16 overflow-hidden')}>
          <TcTerms />
          {/* Collapsed, the faded preview opens the terms on a mouse click. It is hidden from
              assistive technology and takes no focus: the header button is the keyboard path,
              and the clauses underneath stay readable. */}
          {!expanded && (
            <div aria-hidden="true" className="absolute inset-0 cursor-pointer" onClick={() => setExpanded(true)}>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
            </div>
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
