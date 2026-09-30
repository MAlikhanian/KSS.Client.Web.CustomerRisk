'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslation } from '@/hooks/useTranslation';
import { toEnglishDigits } from '@/app/components/person/format-utils';
import { CrsApiError, getLookups, searchByNationalId } from '@/lib/customer-risk/api';
import { companyName, formatDate, languageIdFor, lookupName } from '@/lib/customer-risk/format';
import { crsErrorMessage, isCrsCode } from '@/lib/customer-risk/messages';
import {
  COMPANY_NATIONAL_ID_LENGTH,
  PERSON_NATIONAL_ID_LENGTH,
  nationalIdKind,
} from '@/lib/customer-risk/national-id';
import {
  holdsCaseReadPermission,
  holdsSearchPermission,
  isOwnBrokerage,
  opensCasePage,
  searchBrokerageText,
} from '@/lib/customer-risk/search-access';
import { forgetSearchedNationalId, rememberSearchedNationalId } from '@/lib/customer-risk/search-memory';
import type { BrokerageRefDto, CaseSummaryDto, MeDto } from '@/lib/customer-risk/types';
import { CaseStatusBadge } from '../components/case-status-badge';
import { listCustomerName } from '../components/case-list';
import { CrsAccessGate, CrsNotice, seesAllBrokerages, useBrokerageLabel } from '../components/crs-access';
import { CrsPage } from '../components/crs-page';

/**
 * Cases by the CUSTOMER's national id, across every brokerage: a person's
 * 10-digit code or a company's 11-digit identifier, and nothing else to search
 * by. For holders of CustomerRisk.Search.Read.
 *
 * Nothing is shown or fetched until a complete id passes its checksum; an
 * incomplete or mistyped id never leaves the browser. A search that finds
 * nothing shows nothing.
 */
export function SearchContent() {
  const { t } = useTranslation('customer-risk');
  return (
    <CrsPage
      title={t('pageTitleSearch', { defaultValue: 'Search & Inquiry' })}
      description={t('descNationalIdSearch', {
        defaultValue: 'Enter a national ID or legal entity ID to search for a case.',
      })}
    >
      <CrsAccessGate admit={holdsSearchPermission}>{(me) => <NationalIdSearch me={me} />}</CrsAccessGate>
    </CrsPage>
  );
}

/** What the last search answered, for the id it was asked for. */
type Answer =
  | { kind: 'cases'; nationalId: string; cases: CaseSummaryDto[] }
  | { kind: 'invalid'; nationalId: string }
  | { kind: 'refused' }
  | { kind: 'error'; nationalId: string; message: string };

function NationalIdSearch({ me }: { me: MeDto }) {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  const brokerageLabel = useBrokerageLabel();
  const allCompany = seesAllBrokerages(me);
  const caseRead = holdsCaseReadPermission(me);
  const ownBrokerageId = me.filingBrokerage?.id;
  const [nationalId, setNationalId] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);

  const kind = nationalIdKind(nationalId);
  const complete =
    nationalId.length === PERSON_NATIONAL_ID_LENGTH || nationalId.length === COMPANY_NATIONAL_ID_LENGTH;

  const { data: lookups } = useQuery({
    queryKey: ['customer-risk', 'lookups'],
    queryFn: getLookups,
    staleTime: 5 * 60 * 1000,
  });

  const search = useMutation({
    mutationFn: (id: string) => searchByNationalId({ nationalId: id }),
    onSuccess: (result, id) => {
      // The read-only view of another brokerage's case is served only for the
      // id it was found by; it is held in memory, never in the URL.
      rememberSearchedNationalId(id);
      setAnswer({ kind: 'cases', nationalId: id, cases: result.cases ?? [] });
    },
    onError: (error, id) => {
      if (isCrsCode(error, 'CRS_INVALID_NATIONAL_ID')) setAnswer({ kind: 'invalid', nationalId: id });
      else if (error instanceof CrsApiError && error.status === 403 && !isCrsCode(error, 'CRS_COMPANY_SEARCH_NOT_ALLOWED')) {
        setAnswer({ kind: 'refused' });
      } else setAnswer({ kind: 'error', nationalId: id, message: crsErrorMessage(t, error) });
    },
  });

  const onInput = (raw: string) => {
    const next = toEnglishDigits(raw).replace(/[^0-9]/g, '').slice(0, COMPANY_NATIONAL_ID_LENGTH);
    if (next === nationalId) return;
    // A result belongs to the id it was asked for; a changed id starts over.
    setNationalId(next);
    setAnswer(null);
    forgetSearchedNationalId();
  };

  const run = () => {
    if (!kind || search.isPending) return;
    // A new search starts from nothing: the previous answer, including an empty one, is cleared.
    setAnswer(null);
    search.mutate(nationalId);
  };

  if (answer?.kind === 'refused') {
    return (
      <CrsNotice
        title={t('meNotEnabled', {
          defaultValue: 'Customer risk is not enabled for your account. Ask your administrator for access.',
        })}
      />
    );
  }

  const current = answer && answer.nationalId === nationalId ? answer : null;
  const invalid = (complete && !kind) || current?.kind === 'invalid';
  const riskName = (code: string) => {
    const type = lookups?.riskTypes.find((r) => r.code === code);
    return (type && lookupName(type.names, languageId)) || code;
  };
  // Another brokerage whose name could not be read is named neutrally; the
  // caller's own keeps the list's usual wording.
  const brokerageCell = (ref: BrokerageRefDto | undefined, own: boolean) =>
    searchBrokerageText(
      ref?.resolved ? companyName(ref.names, languageId) : '',
      own,
      brokerageLabel(ref),
      t('brokerageOther', { defaultValue: 'Another brokerage' }),
    );

  return (
    <Card>
      <CardContent className="py-5 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1 w-full max-w-xs">
            <Label htmlFor="crs-search-nid">
              {t('searchNationalIdLabel', { defaultValue: 'National ID or legal entity ID' })}
            </Label>
            <Input
              id="crs-search-nid"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              maxLength={COMPANY_NATIONAL_ID_LENGTH}
              value={nationalId}
              disabled={search.isPending}
              aria-invalid={invalid || undefined}
              onChange={(e) => onInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  run();
                }
              }}
            />
          </div>
          <Button type="button" variant="outline" disabled={!kind || search.isPending} onClick={run}>
            <Search className="size-4" />
            {search.isPending
              ? t('searching', { defaultValue: 'Searching…' })
              : t('searchPerson', { defaultValue: 'Search' })}
          </Button>
        </div>

        {invalid && (
          <p className="text-sm text-destructive">
            {t('validationNationalIdInvalid', {
              defaultValue: 'This national ID or legal entity ID is not valid. Check the digits.',
            })}
          </p>
        )}

        {current?.kind === 'error' && <p className="text-sm text-destructive">{current.message}</p>}

        {current?.kind === 'cases' && current.cases.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {t('searchNoCaseForNationalId', { defaultValue: 'No case was found for this national ID.' })}
          </p>
        )}

        {current?.kind === 'cases' && current.cases.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('caseNumber', { defaultValue: 'Case #' })}</TableHead>
                <TableHead>{t('registeringBrokerage', { defaultValue: 'Registering brokerage' })}</TableHead>
                <TableHead>{t('customerName', { defaultValue: 'Customer' })}</TableHead>
                <TableHead>{t('filterStatus', { defaultValue: 'Status' })}</TableHead>
                <TableHead>{t('riskTypesColumn', { defaultValue: 'Risk types' })}</TableHead>
                <TableHead>{t('createdAt', { defaultValue: 'Created' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {current.cases.map((c) => {
                const own = isOwnBrokerage(ownBrokerageId, c.brokerage?.id);
                // Every hit opens: the regular case page when the caller could
                // open it anyway, otherwise the read-only view of this search.
                const href = opensCasePage(caseRead, allCompany, ownBrokerageId, c.brokerage?.id)
                  ? `/cases/${c.id}`
                  : `/search/${c.id}`;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={href} className="text-primary hover:underline">
                        {c.caseNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-xs">{brokerageCell(c.brokerage, own)}</TableCell>
                    <TableCell className="font-medium">
                      {listCustomerName(c.customer, languageId) || (
                        <span className="text-muted-foreground text-xs">
                          {t('customerNameUnavailable', { defaultValue: 'Name unavailable' })}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <CaseStatusBadge archived={c.isArchived} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {c.riskTypeCodes.length > 0 ? c.riskTypeCodes.map(riskName).join('، ') : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
