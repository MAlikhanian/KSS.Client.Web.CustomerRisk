'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';

/** One brokerage the caller may file for, already reduced to what the picker shows. */
export interface BrokerageOption {
  id: string;
  label: string;
}

/**
 * The brokerage list's state, as the parent loaded it. Three states, and they
 * are not interchangeable: still loading (nobody knows yet), could not be read
 * (the service did not answer), and read (possibly empty).
 */
export type BrokerageOptionsState =
  | { kind: 'pending' }
  | { kind: 'error'; message: string }
  | { kind: 'loaded'; options: BrokerageOption[] };

/**
 * Chooses the filing brokerage for a caller whose access covers every
 * company. Shown only in that state: a caller tied to one brokerage never
 * sees it, and that caller's case is filed for that brokerage as before.
 *
 * Nothing is preselected. A default would file the case for a brokerage the
 * operator never chose, and it would look exactly like a deliberate choice.
 *
 * This is the choice only. The service checks it again on every request: the
 * brokerage must be one the caller may file for, and a live brokerage.
 */
export function BrokeragePicker({
  state,
  value,
  onChange,
  disabled,
}: {
  state: BrokerageOptionsState;
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('customer-risk');
  const [open, setOpen] = useState(false);

  const options = state.kind === 'loaded' ? state.options : [];
  const selected = options.find((o) => o.id === value) ?? null;
  const unusable = state.kind !== 'loaded' || options.length === 0;

  const placeholder =
    state.kind === 'pending'
      ? t('loading', { defaultValue: 'Loading…' })
      : t('brokeragePickerPlaceholder', { defaultValue: 'Choose a brokerage' });

  return (
    <div className="space-y-2">
      <Label>
        {t('owningBrokerage', { defaultValue: 'Owning brokerage' })}
        <span className="text-destructive ms-1">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || unusable}
            className="w-full max-w-md justify-between"
          >
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {selected ? selected.label : placeholder}
            </span>
            <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        {/* Portal so the list renders on the body and keeps its own popover
            styling instead of inheriting the page's tint overrides. */}
        <PopoverPrimitive.Portal>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command>
              <CommandInput
                placeholder={t('brokeragePickerSearch', { defaultValue: 'Search brokerages' })}
              />
              <CommandList>
                <CommandEmpty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t('brokeragePickerNoMatch', { defaultValue: 'No brokerage matches.' })}
                </CommandEmpty>
                <CommandGroup>
                  {options.map((o) => (
                    <CommandItem
                      key={o.id}
                      // cmdk filters on this value; the id keeps two brokerages
                      // with the same name distinct.
                      value={`${o.label} ${o.id}`}
                      onSelect={() => {
                        onChange(o.id);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn('me-2 h-4 w-4', value === o.id ? 'opacity-100' : 'opacity-0')} />
                      <span className="flex-1">{o.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </PopoverPrimitive.Portal>
      </Popover>

      {state.kind === 'error' && <p className="text-sm text-destructive">{state.message}</p>}
      {state.kind === 'loaded' && options.length === 0 && (
        <p className="text-sm text-destructive">
          {t('brokeragePickerEmpty', { defaultValue: 'No brokerage is available to file for.' })}
        </p>
      )}
      {state.kind === 'loaded' && options.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t('brokeragePickerHint', {
            defaultValue: 'Your access covers all companies. Choose the brokerage this case is filed for.',
          })}
        </p>
      )}
    </div>
  );
}
