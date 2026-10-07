'use client';

/**
 * Terms acceptance card, shared by every system that asks its users to accept
 * terms. The system supplies the text (children), its version, its
 * application key and, optionally, its own wording for every label. The card
 * supplies the behaviour, which is the same everywhere:
 *
 *   - While the session or the service's answer is unknown, the control row
 *     keeps its space and shows neither the form nor "Accepted". The text
 *     itself is readable at once.
 *   - "Accepted" only for a confirmed record of the version on screen.
 *   - Whenever Accept cannot be pressed, a line says why, and the button is
 *     tied to it (aria-describedby). Failures offer a retry.
 *
 * The default labels are neutral (i18n/terms-acceptance); a product's own
 * wording goes in `labels`.
 */
import { ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useTranslation } from '@/hooks/useTranslation';
import { cn } from '@/lib/utils';
import { TermsAcceptanceAdapter, TermsRecord } from './terms-adapter';
import { TermsAcceptanceState, useTermsAcceptance } from './use-terms-acceptance';

export interface TermsAcceptanceLabels {
  title: string;
  checkbox: string;
  accept: string;
  accepted: string;
  hint: string;
  loading: string;
  unidentified: string;
  unavailable: string;
  loadFailed: string;
  acceptFailed: string;
  updated: string;
  reload: string;
  sessionTimeout: string;
  retry: string;
}

/** English defaults, identical to i18n/terms-acceptance/en.json; used when the namespace is not loaded. */
const DEFAULT_LABELS: TermsAcceptanceLabels = {
  title: 'Terms and conditions',
  checkbox: 'I have read and accept the terms and conditions.',
  accept: 'Accept',
  accepted: 'Accepted',
  hint: 'Select the option above first.',
  loading: 'Checking your acceptance…',
  unidentified: "Your acceptance can't be recorded for this account. Please contact support.",
  unavailable: "Accepting these terms isn't available for this system yet.",
  loadFailed: "We couldn't check whether you have accepted these terms.",
  acceptFailed: "Your acceptance wasn't recorded. Please try again.",
  updated: 'The terms have been updated. Please review and accept them again.',
  reload: 'These terms have been updated. Reload the page to see the current version.',
  sessionTimeout: "We couldn't confirm your sign-in.",
  retry: 'Try again',
};

export interface TermsAcceptanceProps {
  /** The application whose terms these are, as the service knows it. */
  applicationKey: string;
  /** The version of the text in `children`. Opaque; compared exactly with the service's. */
  version: string;
  /** The terms text. The card renders it and never changes it. */
  children: ReactNode;
  /** Defaults to the neutral title label. */
  title?: ReactNode;
  /** Defaults to the zone's terms route. */
  adapter?: TermsAcceptanceAdapter;
  /** The product's own wording, per label; anything not given uses the neutral default. */
  labels?: Partial<TermsAcceptanceLabels>;
  /** Default true: the text opens collapsed under a fade, and the title opens it. */
  collapsible?: boolean;
  /** 'full' (default) keeps the card after acceptance; 'compact' shrinks it to the title and "Accepted". */
  afterAccept?: 'full' | 'compact';
  /** How long to wait for the session before offering a retry (default 10 s). */
  sessionTimeoutMs?: number;
  /** Called once each time an acceptance is recorded. */
  onAccepted?: (record: TermsRecord) => void;
  className?: string;
}

function useLabels(overrides?: Partial<TermsAcceptanceLabels>): TermsAcceptanceLabels {
  const { t } = useTranslation('terms-acceptance');
  const out = {} as TermsAcceptanceLabels;
  for (const key of Object.keys(DEFAULT_LABELS) as (keyof TermsAcceptanceLabels)[]) {
    out[key] = overrides?.[key] ?? String(t(key, { defaultValue: DEFAULT_LABELS[key] }));
  }
  return out;
}

/** The line that explains why Accept cannot be pressed (or what went wrong), per state. */
function reasonFor(
  state: TermsAcceptanceState,
  staleNeedsReload: boolean,
  labels: TermsAcceptanceLabels,
): string | null {
  switch (state) {
    case 'unidentified':
      return labels.unidentified;
    case 'unavailable':
      return labels.unavailable;
    case 'load-failed':
      return labels.loadFailed;
    case 'accept-failed':
      return labels.acceptFailed;
    case 'session-timeout':
      return labels.sessionTimeout;
    case 'stale':
      return staleNeedsReload ? labels.reload : labels.updated;
    default:
      return null;
  }
}

export function TermsAcceptance({
  applicationKey,
  version,
  children,
  title,
  adapter,
  labels: labelOverrides,
  collapsible = true,
  afterAccept = 'full',
  sessionTimeoutMs,
  onAccepted,
  className,
}: TermsAcceptanceProps) {
  const labels = useLabels(labelOverrides);
  const terms = useTermsAcceptance({ applicationKey, version, adapter, sessionTimeoutMs, onAccepted });
  const { state } = terms;
  const [expanded, setExpanded] = useState(!collapsible);
  const termsId = useId();
  const hintId = useId();
  const reasonId = useId();

  const compact = state === 'accepted' && afterAccept === 'compact';
  const reason = reasonFor(state, terms.staleNeedsReload, labels);
  const showHint = terms.canTick && !terms.checked;
  const describedBy = [reason ? reasonId : '', showHint ? hintId : ''].filter(Boolean).join(' ') || undefined;
  const heading = title ?? labels.title;

  const header = collapsible ? (
    <h3 className="text-sm font-semibold">
      {/* The only control that opens and closes the text, and the keyboard path;
          its accessible name is the title it contains. */}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={termsId}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md p-1 cursor-pointer hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex-1 text-center">{heading}</span>
        <ChevronDown className={cn('size-4 shrink-0 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>
    </h3>
  ) : (
    <h3 className="text-sm font-semibold text-center p-1">{heading}</h3>
  );

  if (compact) {
    return (
      <Card className={className} data-terms-state={state}>
        <CardContent className="py-3 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1">{header}</div>
            <p className="text-sm font-medium text-muted-foreground" data-slot="terms-accepted">
              {labels.accepted}
            </p>
          </div>
          {expanded && <div id={termsId}>{children}</div>}
        </CardContent>
      </Card>
    );
  }

  let controls: ReactNode;
  if (state === 'loading') {
    // Holds the row's space: neither the form nor "Accepted" until both answers are in.
    controls = (
      <div role="status" aria-busy="true" data-slot="terms-pending" className="flex h-full min-h-[4.75rem] flex-col justify-center gap-3 pt-2">
        <span className="sr-only">{labels.loading}</span>
        <div aria-hidden="true" className="h-5 w-2/3 rounded-md bg-muted animate-pulse" />
        <div aria-hidden="true" className="h-8 w-24 self-end rounded-md bg-muted animate-pulse" />
      </div>
    );
  } else {
    const accepted = state === 'accepted';
    const submitting = state === 'submitting';
    const retryReplacesAccept = state === 'accept-failed';
    controls = (
      <div data-slot="terms-controls" className="min-h-[4.75rem] space-y-3">
        <label className={cn('flex items-center gap-2 text-sm pt-2', terms.canTick && 'cursor-pointer')}>
          {/* A stronger outline than the kit default, which is too faint against the card
              to read as a control. Locked once accepted, and while recording. */}
          <Checkbox
            size="lg"
            className="border-2 border-primary"
            checked={accepted || submitting || terms.checked}
            disabled={!terms.canTick}
            onCheckedChange={(v) => terms.setChecked(v === true)}
          />
          {labels.checkbox}
        </label>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {accepted ? (
            // Plain text, not a control: nothing is left to press.
            <p className="text-sm font-medium text-muted-foreground" data-slot="terms-accepted">
              {labels.accepted}
            </p>
          ) : (
            <>
              {reason && (
                <p id={reasonId} role="alert" className="text-xs text-muted-foreground" data-slot="terms-reason">
                  {reason}
                </p>
              )}
              {showHint && (
                <p id={hintId} className="text-xs text-muted-foreground" data-slot="terms-hint">
                  {labels.hint}
                </p>
              )}
              {terms.canRetry && !retryReplacesAccept && (
                <Button variant="outline" onClick={terms.retry} data-slot="terms-retry">
                  {labels.retry}
                </Button>
              )}
              {retryReplacesAccept ? (
                <Button disabled={!terms.canAccept} onClick={terms.retry} aria-describedby={describedBy} data-slot="terms-retry">
                  {labels.retry}
                </Button>
              ) : (
                <Button
                  disabled={!terms.canAccept || submitting}
                  aria-busy={submitting || undefined}
                  onClick={terms.accept}
                  aria-describedby={describedBy}
                  data-slot="terms-accept"
                >
                  {labels.accept}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={className} data-terms-state={state}>
      <CardContent className="py-5 space-y-3">
        {header}
        <div id={termsId} className={cn('relative', !expanded && 'max-h-16 overflow-hidden')}>
          {children}
          {/* Collapsed, the faded preview opens the text on a click. It is hidden from
              assistive technology and takes no focus: the title is the keyboard path. */}
          {!expanded && (
            <div aria-hidden="true" className="absolute inset-0 cursor-pointer" onClick={() => setExpanded(true)}>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
            </div>
          )}
        </div>
        {controls}
      </CardContent>
    </Card>
  );
}
