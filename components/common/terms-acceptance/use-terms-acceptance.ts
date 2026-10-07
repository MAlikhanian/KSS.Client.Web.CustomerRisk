'use client';

/**
 * Terms acceptance: the state machine behind the card.
 *
 * Two inputs, one state value:
 *   - the session: who is signed in, and whether that is known yet;
 *   - the service's answer for that account, through the adapter.
 *
 * The rules it enforces, so every system using the card gets them:
 *   - Nothing is shown as "not accepted" or "accepted" until both inputs are
 *     known; until then the state is `loading`.
 *   - "Accepted" needs a confirmed record AND the record's version must equal
 *     the version of the text on screen. Any other answer shows the form.
 *   - Nothing is assumed or kept in browser storage. A failed or refused call
 *     never becomes "accepted".
 *   - Every state in which Accept cannot be pressed has its own reason, so the
 *     card can explain it.
 *
 * The query never throws: a failed read is a value. Query errors in this
 * estate raise a global toast and, for some messages, a sign-out; neither is
 * wanted here, where the card explains the failure itself.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createHttpTermsAdapter,
  TermsAcceptanceAdapter,
  TermsAcceptanceError,
  TermsErrorCode,
  termsErrorCode,
  TermsRecord,
} from './terms-adapter';

export type TermsAcceptanceState =
  /** The session or the service's answer is not known yet. */
  | 'loading'
  /** The session did not resolve in time. */
  | 'session-timeout'
  /** No account, or the account has no person: nothing can be recorded. */
  | 'unidentified'
  /** Terms acceptance is not enabled for this application. */
  | 'unavailable'
  /** The service's answer could not be read. */
  | 'load-failed'
  /** Confirmed: this account has not accepted the current version. */
  | 'not-accepted'
  /** The service's current version is not the version on screen. */
  | 'version-mismatch'
  /** An acceptance is being recorded. */
  | 'submitting'
  /** Recording the acceptance failed; it can be tried again. */
  | 'accept-failed'
  /** The version on screen was refused as no longer current. */
  | 'stale'
  /** Confirmed: this account has accepted the version on screen. */
  | 'accepted';

export interface UseTermsAcceptanceOptions {
  /** The application whose terms these are. Sent to the service as is. */
  applicationKey: string;
  /** The version of the text on screen. Opaque; compared exactly. */
  version: string;
  /** Defaults to the zone's terms route (createHttpTermsAdapter). */
  adapter?: TermsAcceptanceAdapter;
  /** How long to wait for the session before offering a retry (default 10 s). */
  sessionTimeoutMs?: number;
  /** Called once each time an acceptance is recorded. */
  onAccepted?: (record: TermsRecord) => void;
}

export interface TermsAcceptanceController {
  state: TermsAcceptanceState;
  /** For `stale`: the page holds older text than the service, so only a reload helps. */
  staleNeedsReload: boolean;
  /** The last confirmed record for this account, or null. */
  record: TermsRecord | null;
  /** The tick in the box. Never stands for an acceptance by itself. */
  checked: boolean;
  setChecked: (value: boolean) => void;
  /** Whether the box can be ticked in this state. */
  canTick: boolean;
  /** Whether Accept can be pressed now. */
  canAccept: boolean;
  /** Record the acceptance of the version on screen. Does nothing unless `canAccept`. */
  accept: () => void;
  /** Whether a retry is offered in this state. */
  canRetry: boolean;
  /** Retry what failed: the session, the read, or the acceptance. */
  retry: () => void;
}

type LoadResult = { ok: true; record: TermsRecord } | { ok: false; code: TermsErrorCode };

type SubmitPhase =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'failed' }
  | { phase: 'unidentified' }
  | { phase: 'unavailable' }
  | { phase: 'stale'; currentVersion?: string };

const IDLE: SubmitPhase = { phase: 'idle' };
const DEFAULT_SESSION_TIMEOUT_MS = 10_000;

/** The states in which the box may be ticked and Accept pressed. */
const ACCEPTING_STATES: ReadonlySet<TermsAcceptanceState> = new Set<TermsAcceptanceState>([
  'not-accepted',
  'version-mismatch',
  'load-failed',
  'stale',
]);

export function useTermsAcceptance(options: UseTermsAcceptanceOptions): TermsAcceptanceController {
  const { applicationKey, version, onAccepted } = options;
  const sessionTimeoutMs = options.sessionTimeoutMs ?? DEFAULT_SESSION_TIMEOUT_MS;

  const adapter = useMemo(
    () => options.adapter ?? createHttpTermsAdapter({ applicationKey }),
    [options.adapter, applicationKey],
  );

  const { data: session, status, update } = useSession();
  const accountId = status === 'authenticated' ? session?.user?.id || null : null;

  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ['terms-acceptance', applicationKey.trim().toLowerCase(), accountId] as const,
    [applicationKey, accountId],
  );

  const query = useQuery<LoadResult>({
    queryKey,
    queryFn: async ({ signal }) => {
      try {
        return { ok: true, record: await adapter.load(signal) };
      } catch (error) {
        return { ok: false, code: termsErrorCode(error) };
      }
    },
    enabled: Boolean(accountId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const [checked, setCheckedState] = useState(false);
  const [submit, setSubmit] = useState<SubmitPhase>(IDLE);
  // A result that arrives after the account changed, or after a newer attempt, is dropped.
  const attempt = useRef(0);

  // Another account starts from nothing: no tick, no pending or failed acceptance.
  useEffect(() => {
    attempt.current += 1;
    setCheckedState(false);
    setSubmit(IDLE);
  }, [accountId, applicationKey]);

  // Session timeout: armed while the session is loading, re-armed by a retry.
  const [sessionTimedOut, setSessionTimedOut] = useState(false);
  const [sessionRetries, setSessionRetries] = useState(0);
  useEffect(() => {
    setSessionTimedOut(false);
    if (status !== 'loading') return;
    const timer = setTimeout(() => setSessionTimedOut(true), sessionTimeoutMs);
    return () => clearTimeout(timer);
  }, [status, sessionTimeoutMs, sessionRetries]);

  const data = query.data;
  const record = data && data.ok ? data.record : null;

  let state: TermsAcceptanceState;
  if (status === 'loading') {
    state = sessionTimedOut ? 'session-timeout' : 'loading';
  } else if (!accountId) {
    state = 'unidentified';
  } else if (submit.phase === 'submitting') {
    state = 'submitting';
  } else if (!data || (query.isFetching && !data.ok)) {
    state = 'loading';
  } else if (!data.ok) {
    state = data.code === 'unidentified' ? 'unidentified' : data.code === 'unavailable' ? 'unavailable' : 'load-failed';
  } else if (data.record.accepted === true && data.record.version === version) {
    state = 'accepted';
  } else if (submit.phase === 'unidentified') {
    state = 'unidentified';
  } else if (submit.phase === 'unavailable') {
    state = 'unavailable';
  } else if (submit.phase === 'stale') {
    state = 'stale';
  } else if (submit.phase === 'failed') {
    state = 'accept-failed';
  } else if (data.record.version !== version) {
    state = 'version-mismatch';
  } else {
    state = 'not-accepted';
  }

  const staleNeedsReload = submit.phase === 'stale' && submit.currentVersion !== version;
  const canTick = (ACCEPTING_STATES.has(state) && !(state === 'stale' && staleNeedsReload)) || state === 'accept-failed';
  const canAccept = checked && canTick;

  const setChecked = useCallback((value: boolean) => setCheckedState(value), []);

  const accept = useCallback(async () => {
    if (!canAccept) return;
    const id = ++attempt.current;
    const key = queryKey;
    setSubmit({ phase: 'submitting' });
    let result: TermsRecord;
    try {
      result = await adapter.accept(version);
    } catch (error) {
      if (id !== attempt.current) return;
      const code = termsErrorCode(error);
      if (code === 'stale') {
        setCheckedState(false);
        setSubmit({ phase: 'stale', currentVersion: (error as TermsAcceptanceError).currentVersion });
        void query.refetch();
      } else if (code === 'unidentified' || code === 'unavailable') {
        setSubmit({ phase: code });
      } else {
        setSubmit({ phase: 'failed' });
      }
      return;
    }
    if (id !== attempt.current) return;
    // A 200 is not enough: it must say accepted, for the version on screen.
    if (result.accepted !== true || result.version !== version) {
      setSubmit({ phase: 'failed' });
      return;
    }
    // A read still in flight was asked before this acceptance; its answer must not replace it.
    await queryClient.cancelQueries({ queryKey: key });
    if (id !== attempt.current) return;
    const confirmed: LoadResult = { ok: true, record: result };
    queryClient.setQueryData<LoadResult>(key, confirmed);
    setSubmit(IDLE);
    onAccepted?.(result);
  }, [canAccept, queryKey, adapter, version, query, queryClient, onAccepted]);

  const canRetry = state === 'session-timeout' || state === 'load-failed' || state === 'accept-failed';

  const retry = useCallback(() => {
    if (state === 'session-timeout') {
      setSessionTimedOut(false);
      setSessionRetries((n) => n + 1);
      void update?.();
    } else if (state === 'load-failed') {
      setSubmit(IDLE);
      void query.refetch();
    } else if (state === 'accept-failed') {
      void accept();
    }
  }, [state, update, query, accept]);

  return {
    state,
    staleNeedsReload,
    record,
    checked,
    setChecked,
    canTick,
    canAccept,
    accept: () => void accept(),
    canRetry,
    retry,
  };
}
