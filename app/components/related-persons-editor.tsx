'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/useTranslation';
import { languageIdFor, lookupName } from '@/lib/customer-risk/format';
import type { LookupItemDto } from '@/lib/customer-risk/types';
import { PersonEntry, type PersonEntryValue, type SexOptionsState } from './person-entry';

export interface RelatedPersonDraft {
  /** A React key for this row only. Never sent: the service issues every id. */
  key: string;
  /** 0 = nothing chosen. */
  relationTypeId: number;
  person: PersonEntryValue;
}

/**
 * Related persons, each found by national id first, the same way the customer
 * is. Rows are updated by key through a functional update, so a search still
 * in flight on one row cannot overwrite an edit made meanwhile on another.
 */
export function RelatedPersonsEditor({
  rows,
  setRows,
  relationTypes,
  sexOptions,
  personCreateEnabled,
  disabled,
}: {
  rows: RelatedPersonDraft[];
  setRows: (update: (prev: RelatedPersonDraft[]) => RelatedPersonDraft[]) => void;
  relationTypes: LookupItemDto[];
  sexOptions: SexOptionsState;
  personCreateEnabled: boolean | undefined;
  disabled?: boolean;
}) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);

  const patch = (key: string, next: Partial<RelatedPersonDraft>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...next } : r)));

  if (rows.length === 0) {
    return (
      <p className="text-center py-4 text-muted-foreground text-xs">
        {t('noRelatedPersons', { defaultValue: 'No related persons added yet.' })}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.key} className="rounded-lg border p-4 space-y-4">
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

          <div className="space-y-1 max-w-xs">
            <Label>
              {t('relatedPersonRelation', { defaultValue: 'Relation' })}
              <span className="text-destructive ms-1">*</span>
            </Label>
            <Select
              value={row.relationTypeId ? String(row.relationTypeId) : undefined}
              onValueChange={(v) => patch(row.key, { relationTypeId: Number(v) })}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('select', { defaultValue: 'Select' })} />
              </SelectTrigger>
              <SelectContent>
                {relationTypes.map((rt) => (
                  <SelectItem key={rt.id} value={String(rt.id)}>
                    {lookupName(rt.names, languageId) || rt.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <PersonEntry
            idPrefix={`related-${row.key}`}
            value={row.person}
            onChange={(next) => patch(row.key, { person: next })}
            sexOptions={sexOptions}
            personCreateEnabled={personCreateEnabled}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
