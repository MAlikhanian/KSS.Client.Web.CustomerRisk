'use client';

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';

export type RiskType = 'credit' | 'documents' | 'other';

/** A single risk entry. Its existence means the customer has this risk — there
 * is no separate has/no-risk flag; not adding an entry means "no risk". */
export interface RiskEntry {
  id: string;
  type: RiskType;
  amount?: number;
  description?: string;
}

const RISK_TYPE_KEYS: Record<RiskType, string> = {
  credit: 'creditRiskCard',
  documents: 'documentsRiskCard',
  other: 'otherRisksCard',
};

interface Props {
  rows: RiskEntry[];
  onChange: (rows: RiskEntry[]) => void;
  disabled?: boolean;
}

export function RisksEditor({ rows, onChange, disabled }: Props) {
  const { t } = useTranslation('customer-risk');

  const update = (id: string, patch: Partial<RiskEntry>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };
  const remove = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="text-center py-4 text-muted-foreground text-xs">
          {t('noRisks', { defaultValue: 'No risks added yet.' })}
        </p>
      )}
      {rows.map((r, i) => (
        <RiskRow
          key={r.id}
          row={r}
          index={i}
          disabled={disabled}
          onUpdate={(patch) => update(r.id, patch)}
          onRemove={() => remove(r.id)}
        />
      ))}
    </div>
  );
}

interface RowProps {
  row: RiskEntry;
  index: number;
  disabled?: boolean;
  onUpdate: (patch: Partial<RiskEntry>) => void;
  onRemove: () => void;
}

function RiskRow({ row, index, disabled, onUpdate, onRemove }: RowProps) {
  const { t } = useTranslation('customer-risk');
  const [expanded, setExpanded] = useState(true);

  const typeLabel = t(RISK_TYPE_KEYS[row.type], { defaultValue: row.type });
  const summary = [typeLabel, row.amount != null ? String(row.amount) : '']
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="rounded-lg border overflow-hidden">
      <div
        className="flex items-center justify-between gap-2 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground shrink-0" />
          )}
          <span className="flex size-6 items-center justify-center rounded-md bg-rose-500 text-white text-xs font-bold shrink-0">
            {index + 1}
          </span>
          {!expanded && summary && <span className="truncate text-sm font-medium">{summary}</span>}
        </div>
        {!disabled && (
          <Button
            variant="ghost"
            mode="icon"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 className="size-4 text-rose-500" />
          </Button>
        )}
      </div>

      {expanded && (
        <div className="p-4 pt-0 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('riskType', { defaultValue: 'Risk type' })}</Label>
              <Select value={row.type} onValueChange={(v) => onUpdate({ type: v as RiskType })} disabled={disabled}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">{t('creditRiskCard', { defaultValue: 'Credit risk' })}</SelectItem>
                  <SelectItem value="documents">{t('documentsRiskCard', { defaultValue: 'Documents risk' })}</SelectItem>
                  <SelectItem value="other">{t('otherRisksCard', { defaultValue: 'Other risks' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{t('riskAmount', { defaultValue: 'Amount (Rial)' })}</Label>
              <Input
                type="number"
                min={0}
                value={row.amount ?? ''}
                onChange={(e) => onUpdate({ amount: e.target.value === '' ? undefined : Number(e.target.value) })}
                disabled={disabled}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t('riskDescription', { defaultValue: 'Risk description' })}</Label>
            <Textarea
              rows={3}
              value={row.description ?? ''}
              onChange={(e) => onUpdate({ description: e.target.value })}
              disabled={disabled}
            />
          </div>
          {!disabled && (
            <div className="flex justify-end">
              <Button type="button" size="sm" onClick={() => setExpanded(false)}>
                {t('save', { defaultValue: 'Save' })}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
