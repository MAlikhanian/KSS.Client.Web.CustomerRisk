'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';

// Versioned: a change to the terms asks everyone to accept them again. An
// earlier acceptance is left in storage and no longer read.
const ACCEPTED_KEY = 'customer-risk:tc-accepted:v2';

/**
 * The terms as numbered clauses, in the order of the source document. The
 * numbers are the list's own markers and are not part of the text. The clauses
 * exist in Persian only, so the block is marked Persian and right-to-left
 * whatever the screen's language.
 */
function TcTerms() {
  const { t } = useTranslation('customer-risk');
  return (
    <ol dir="rtl" lang="fa" className="text-sm space-y-2 list-decimal ps-5 text-justify">
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

export function TcBanner() {
  const { t } = useTranslation('customer-risk');
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAccepted(window.localStorage.getItem(ACCEPTED_KEY) === '1');
  }, []);

  const title = (
    <h3 className="text-sm font-semibold text-center">
      {t('tcTitle', { defaultValue: 'Terms & Regulations' })}
    </h3>
  );

  if (accepted) {
    return (
      <Card>
        <CardContent className="py-3 space-y-3">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-start gap-2">
              <Info className="size-4 mt-0.5 shrink-0" />
              <span>{t('tcTitle', { defaultValue: 'Terms & Regulations' })}</span>
            </span>
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
              {t('tcSeeMore', { defaultValue: 'See full terms' })}
            </Button>
          </div>
          {expanded && <TcTerms />}
        </CardContent>
      </Card>
    );
  }

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
        {title}
        <TcTerms />
        <label className="flex items-center gap-2 text-sm cursor-pointer pt-2">
          <Checkbox checked={checked} onCheckedChange={(v) => setChecked(!!v)} />
          {t('tcAccepted', { defaultValue: 'I have read and accept the terms and regulations.' })}
        </label>
        <div className="flex justify-end">
          <Button disabled={!checked} onClick={accept}>
            {t('tcAccepted')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
