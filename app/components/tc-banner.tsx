'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';

const ACCEPTED_KEY = 'customer-risk:tc-accepted';

export function TcBanner() {
  const { t } = useTranslation('customer-risk');
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setAccepted(window.localStorage.getItem(ACCEPTED_KEY) === '1');
  }, []);

  if (accepted) {
    return (
      <Card>
        <CardContent className="py-3 flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="size-4 mt-0.5 shrink-0" />
          <span>{t('tcBody1', { defaultValue: 'Self-declaration only — not a basis for legal decisions.' })}</span>
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
        <h3 className="text-sm font-semibold">
          {t('tcTitle', { defaultValue: 'Terms & Regulations' })}
        </h3>
        <ul className="text-sm space-y-2 list-disc ps-5">
          <li>{t('tcBody1')}</li>
          <li>{t('tcBody2')}</li>
          <li>{t('tcBody3')}</li>
        </ul>
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
