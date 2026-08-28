'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import type { CrsOtherRisk } from '@/lib/customer-risk/types';
import { newOtherRiskId } from '@/lib/customer-risk/mock-store';

interface Props {
  rows: CrsOtherRisk[];
  onChange: (rows: CrsOtherRisk[]) => void;
  caseId: string;
  disabled?: boolean;
}

export function OtherRisksEditor({ rows, onChange, caseId, disabled }: Props) {
  const { t } = useTranslation('customer-risk');

  const update = (id: string, patch: Partial<CrsOtherRisk>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const add = () => {
    onChange([
      ...rows,
      {
        id: newOtherRiskId(),
        caseId,
        riskType: '',
        description: '',
        amount: undefined,
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('riskType', { defaultValue: 'Risk type' })}</TableHead>
              <TableHead>{t('riskDescription', { defaultValue: 'Description' })}</TableHead>
              <TableHead className="text-end">{t('riskAmount', { defaultValue: 'Amount' })}</TableHead>
              {!disabled && (
                <TableHead className="text-center w-12">{t('actions', { defaultValue: 'Actions' })}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Input
                    value={r.riskType ?? ''}
                    onChange={(e) => update(r.id, { riskType: e.target.value })}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <Textarea
                    rows={2}
                    value={r.description ?? ''}
                    onChange={(e) => update(r.id, { description: e.target.value })}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell className="text-end">
                  <Input
                    type="number"
                    min={0}
                    value={r.amount ?? ''}
                    onChange={(e) =>
                      update(r.id, {
                        amount: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                    disabled={disabled}
                  />
                </TableCell>
                {!disabled && (
                  <TableCell className="text-center">
                    <Button variant="ghost" mode="icon" size="sm" onClick={() => remove(r.id)}>
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={disabled ? 3 : 4} className="text-center py-4 text-muted-foreground text-xs">
                  {t('noOtherRisks', { defaultValue: 'No other risks added yet.' })}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!disabled && (
        <div className="flex justify-start">
          <Button variant="outline" size="sm" onClick={add}>
            + {t('addOtherRisk', { defaultValue: 'Add other risk' })}
          </Button>
        </div>
      )}
    </div>
  );
}
