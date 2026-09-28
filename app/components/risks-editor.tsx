'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import { languageIdFor, lookupName } from '@/lib/customer-risk/format';
import type { RiskTypeLookupDto } from '@/lib/customer-risk/types';

/** The service's limits on a risk item's text, in characters after trimming. */
export const RISK_TITLE_MAX = 100;
export const RISK_DESCRIPTION_MAX = 1000;

/**
 * One risk item as entered. Its existence means the customer has this risk;
 * leaving a type out means "no risk of this type".
 */
export interface RiskDraft {
  /** A React key for this row only. Never sent: the service issues every id. */
  key: string;
  /** 0 = nothing chosen. */
  riskTypeId: number;
  /** Digits only, in rials; '' = no amount. */
  amount: string;
  title: string;
  description: string;
}

/**
 * Risk items, typed by the service's own risk-type list. Whether a type may
 * appear more than once and whether it needs a title are the service's rules,
 * read from the list rather than written here.
 */
export function RisksEditor({
  rows,
  setRows,
  riskTypes,
  disabled,
}: {
  rows: RiskDraft[];
  setRows: (update: (prev: RiskDraft[]) => RiskDraft[]) => void;
  riskTypes: RiskTypeLookupDto[];
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const sorted = [...riskTypes].sort((a, b) => a.sortOrder - b.sortOrder);

  const patch = (key: string, next: Partial<RiskDraft>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));

  if (rows.length === 0) {
    return (
      <p className="text-center py-4 text-muted-foreground text-xs">
        {t('noRisks', { defaultValue: 'No risks added yet.' })}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const type = riskTypes.find((r) => r.id === row.riskTypeId);
        // A single-use type already taken by another row is not offered again.
        const takenElsewhere = new Set(
          rows.filter((r) => r.key !== row.key).map((r) => r.riskTypeId),
        );
        return (
          <div key={row.key} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-6 items-center justify-center rounded-md bg-rose-500 text-white text-xs font-bold shrink-0">
                {index + 1}
              </span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  title={t('delete', { defaultValue: 'Delete' })}
                  onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                >
                  <Trash2 className="size-4 text-rose-500" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>
                  {t('riskType', { defaultValue: 'Risk type' })}
                  <span className="text-destructive ms-1">*</span>
                </Label>
                <Select
                  value={row.riskTypeId ? String(row.riskTypeId) : undefined}
                  onValueChange={(v) => patch(row.key, { riskTypeId: Number(v) })}
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('select', { defaultValue: 'Select' })} />
                  </SelectTrigger>
                  <SelectContent>
                    {sorted.map((rt) => (
                      <SelectItem
                        key={rt.id}
                        value={String(rt.id)}
                        disabled={!rt.allowsMultiple && takenElsewhere.has(rt.id)}
                      >
                        {lookupName(rt.names, languageId) || rt.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>
                  {t('riskTitle', { defaultValue: 'Title' })}
                  {type?.requiresTitle && <span className="text-destructive ms-1">*</span>}
                </Label>
                <Input
                  value={row.title}
                  maxLength={RISK_TITLE_MAX}
                  disabled={disabled}
                  onChange={(e) => patch(row.key, { title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>{t('riskAmount', { defaultValue: 'Amount (Rial)' })}</Label>
                <Input
                  inputMode="numeric"
                  dir="ltr"
                  value={row.amount}
                  disabled={disabled}
                  onChange={(e) =>
                    patch(row.key, { amount: toEnglishDigits(e.target.value).replace(/[^0-9]/g, '') })
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>{t('riskDescription', { defaultValue: 'Risk description' })}</Label>
              <Textarea
                rows={3}
                maxLength={RISK_DESCRIPTION_MAX}
                value={row.description}
                disabled={disabled}
                onChange={(e) => patch(row.key, { description: e.target.value })}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
