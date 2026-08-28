'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import type { CrsRiskCommon } from '@/lib/customer-risk/types';

interface Props {
  title?: string;
  value: CrsRiskCommon;
  onChange: (next: CrsRiskCommon) => void;
  disabled?: boolean;
  /** Render only the inner controls (no Card/title) — for embedding inside a merged "Risks" section behind a type combo box. */
  embedded?: boolean;
}

/**
 * Risk-state combo (Has risk / No risk) shown on one line with the amount,
 * used for the Credit Risk and Documents Risk sections. The
 * {@link CrsRiskCommon.hasRisk} flag is required on the parent case; the amount
 * and description only render when `hasRisk` is `true`. With `embedded`, the
 * outer Card/title is omitted.
 */
export function RiskToggleCard({ title, value, onChange, disabled, embedded }: Props) {
  const { t } = useTranslation('customer-risk');

  const inner = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>{t('riskState', { defaultValue: 'Risk state' })}</Label>
          <Select
            value={value.hasRisk ? 'has' : 'no'}
            onValueChange={(v) => onChange(v === 'has' ? { ...value, hasRisk: true } : { hasRisk: false })}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="has">{t('hasRisk', { defaultValue: 'Has risk' })}</SelectItem>
              <SelectItem value="no">{t('noRisk', { defaultValue: 'No risk' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {value.hasRisk && (
          <div className="space-y-1">
            <Label>{t('riskAmount', { defaultValue: 'Amount (Rial)' })}</Label>
            <Input
              type="number"
              min={0}
              value={value.amount ?? ''}
              onChange={(e) =>
                onChange({
                  ...value,
                  amount: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {value.hasRisk && (
        <div className="space-y-1">
          <Label>{t('riskDescription', { defaultValue: 'Risk description' })}</Label>
          <Textarea
            rows={3}
            value={value.description ?? ''}
            onChange={(e) => onChange({ ...value, description: e.target.value })}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );

  if (embedded) return inner;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{inner}</CardContent>
    </Card>
  );
}
