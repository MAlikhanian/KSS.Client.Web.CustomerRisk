'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { useLanguage } from '@/providers/i18n-provider';
import type { CrsBrokerage } from '@/lib/customer-risk/types';
import {
  getActingBrokerageId,
  listBrokerages,
  setActingBrokerageId,
} from '@/lib/customer-risk/mock-store';

/**
 * Persona switcher for the Customer Risk demo. The chosen brokerage scope is
 * read by every CRS page via {@link useActingBrokerage}.
 */
export function ActingBrokeragePicker({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation('customer-risk');
  const { language } = useLanguage();
  const [brokerages, setBrokerages] = useState<CrsBrokerage[]>([]);
  const [currentId, setCurrentId] = useState<string>('');

  useEffect(() => {
    const all = listBrokerages();
    setBrokerages(all);
    const stored = getActingBrokerageId();
    if (stored && all.some((b) => b.id === stored)) {
      setCurrentId(stored);
    } else if (all.length > 0) {
      // Seed with the first active brokerage.
      const first = all.find((b) => b.isActive) ?? all[0];
      setCurrentId(first.id);
      setActingBrokerageId(first.id);
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) setCurrentId(detail);
    };
    window.addEventListener('customer-risk:acting-changed', handler);
    return () => window.removeEventListener('customer-risk:acting-changed', handler);
  }, []);

  const sorted = useMemo(
    () => brokerages.filter((b) => b.isActive).sort((a, b) => a.code.localeCompare(b.code)),
    [brokerages],
  );

  const handleChange = (id: string) => {
    setCurrentId(id);
    setActingBrokerageId(id);
  };

  const label = (b: CrsBrokerage) => (language.code === 'en' ? b.nameEn : b.nameFa);

  return (
    <Select value={currentId || undefined} onValueChange={handleChange}>
      <SelectTrigger className={compact ? 'h-8 text-xs min-w-[180px]' : 'min-w-[220px]'}>
        <SelectValue placeholder={t('pickActingBrokerage', { defaultValue: 'Pick an acting brokerage' })} />
      </SelectTrigger>
      <SelectContent>
        {sorted.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {label(b)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Hook returning the current acting brokerage id and a tick that increments on
 * every change — components can include `tick` in their effect deps to refresh
 * data when the persona switches.
 */
export function useActingBrokerage(): { brokerageId: string | null; tick: number } {
  const [brokerageId, setBrokerageId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setBrokerageId(getActingBrokerageId());

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setBrokerageId(detail ?? getActingBrokerageId());
      setTick((n) => n + 1);
    };
    window.addEventListener('customer-risk:acting-changed', handler);
    return () => window.removeEventListener('customer-risk:acting-changed', handler);
  }, []);

  return { brokerageId, tick };
}
