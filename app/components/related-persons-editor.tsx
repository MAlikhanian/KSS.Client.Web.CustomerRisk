'use client';

import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePickerComponent } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import type { CrsRelatedPerson, RelationType } from '@/lib/customer-risk/types';
import { ALL_RELATION_TYPES } from '@/lib/customer-risk/types';

function relationKey(r: RelationType): string {
  return `relation${r}`;
}

interface Props {
  rows: CrsRelatedPerson[];
  onChange: (rows: CrsRelatedPerson[]) => void;
  caseId: string;
  disabled?: boolean;
}

export function RelatedPersonsEditor({ rows, onChange, disabled }: Props) {
  const { t } = useTranslation('customer-risk');

  const update = (id: string, patch: Partial<CrsRelatedPerson>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const remove = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-4">
      {rows.length === 0 && (
        <p className="text-center py-4 text-muted-foreground text-xs">
          {t('noRelatedPersons', { defaultValue: 'No related persons added yet.' })}
        </p>
      )}
      {rows.map((r, i) => (
        <RelatedPersonRow
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
  row: CrsRelatedPerson;
  index: number;
  disabled?: boolean;
  onUpdate: (patch: Partial<CrsRelatedPerson>) => void;
  onRemove: () => void;
}

/**
 * Apply a first/last name edit and recompute the composed `name` alongside it.
 * `name` stays the value the search predicate and every read site use, the same
 * way Person keeps a computed DisplayName next to its structured columns.
 */
function withComposedName(
  row: CrsRelatedPerson,
  patch: Partial<Pick<CrsRelatedPerson, 'firstName' | 'lastName'>>,
): Partial<CrsRelatedPerson> {
  const firstName = patch.firstName ?? row.firstName ?? '';
  const lastName = patch.lastName ?? row.lastName ?? '';
  return { ...patch, name: `${firstName.trim()} ${lastName.trim()}`.trim() };
}

function RelatedPersonRow({ row, index, disabled, onUpdate, onRemove }: RowProps) {
  const { t } = useTranslation('customer-risk');
  const [expanded, setExpanded] = useState(true);

  const summary = [
    row.name,
    row.relationType ? t(relationKey(row.relationType), { defaultValue: row.relationType }) : '',
  ]
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <Label>{t('relatedPersonFirstName', { defaultValue: 'First name' })}</Label>
              <Input
                dir="rtl"
                value={row.firstName ?? ''}
                onChange={(e) => onUpdate(withComposedName(row, { firstName: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('relatedPersonLastName', { defaultValue: 'Last name' })}</Label>
              <Input
                dir="rtl"
                value={row.lastName ?? ''}
                onChange={(e) => onUpdate(withComposedName(row, { lastName: e.target.value }))}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('relatedPersonNationalId', { defaultValue: 'National ID' })}</Label>
              <Input
                inputMode="numeric"
                maxLength={10}
                value={row.nationalId ?? ''}
                onChange={(e) =>
                  onUpdate({
                    nationalId: toEnglishDigits(e.target.value).replace(/[^0-9]/g, '').slice(0, 10),
                  })
                }
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('relatedPersonFatherName', { defaultValue: 'Father name' })}</Label>
              <Input value={row.fatherName ?? ''} onChange={(e) => onUpdate({ fatherName: e.target.value })} disabled={disabled} />
            </div>
            <div className="space-y-1">
              <Label>{t('relatedPersonDateOfBirth', { defaultValue: 'Date of birth' })}</Label>
              <DatePickerComponent
                value={row.dateOfBirth ? row.dateOfBirth.slice(0, 10) : ''}
                onChange={(value) => onUpdate({ dateOfBirth: value ? new Date(value).toISOString() : undefined })}
                disabled={disabled}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('relatedPersonRelation', { defaultValue: 'Relation' })}</Label>
              <Select
                value={row.relationType ?? undefined}
                onValueChange={(v) => onUpdate({ relationType: v as RelationType })}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('relatedPersonRelation', { defaultValue: 'Relation' })} />
                </SelectTrigger>
                <SelectContent>
                  {ALL_RELATION_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {t(relationKey(rt), { defaultValue: rt })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
