'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RiErrorWarningFill, RiInformationFill } from '@remixicon/react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertContent, AlertDescription, AlertIcon, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from '@/hooks/useTranslation';
import { useCurrentCompany } from '@/providers/current-company-provider';
import { getMe } from '@/lib/customer-risk/api';
import { companyName, languageIdFor } from '@/lib/customer-risk/format';
import { crsErrorMessage } from '@/lib/customer-risk/messages';
import type { BrokerageRefDto, CrsPermissionCode, MeDto } from '@/lib/customer-risk/types';

/**
 * The caller's standing in CRS, from GET /Api/Me.
 *
 * Nothing is asked of the service until the active company is known: every
 * call carries X-Company-Id from the `x-company-id` cookie, and on a first
 * visit CurrentCompanyProvider writes that cookie only after its own request
 * returns. Asking earlier would be refused for a missing company that is about
 * to exist.
 */
export function useCrsMe() {
  const { loading: companyLoading, currentCompanyId } = useCurrentCompany();
  const hasCompany = !companyLoading && !!currentCompanyId;

  const query = useQuery({
    queryKey: ['customer-risk', 'me'],
    queryFn: getMe,
    enabled: hasCompany,
    staleTime: 60_000,
    retry: false,
  });

  return { ...query, companyLoading, hasCompany };
}

/** Whether the caller holds a CRS permission, or none is required. */
export function hasCrsPermission(me: MeDto, permission: CrsPermissionCode): boolean {
  return !me.permissionRequired || me.permissions.includes(permission);
}

/** A brokerage's name in the UI language, or a sentence saying only its id is known. */
export function useBrokerageLabel() {
  const { t, i18n } = useTranslation('customer-risk');
  const languageId = languageIdFor(i18n.language);
  return (ref: BrokerageRefDto | null | undefined): string => {
    if (!ref) return '—';
    const name = ref.resolved ? companyName(ref.names, languageId) : '';
    return (
      name ||
      t('brokerageNameUnavailable', {
        defaultValue: 'Name unavailable (id {{id}})',
        id: ref.id,
      })
    );
  };
}

export function CrsNotice({
  tone = 'warning',
  title,
  children,
}: {
  tone?: 'warning' | 'info' | 'destructive';
  title: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <Alert variant={tone === 'info' ? 'info' : tone} appearance="light">
          <AlertIcon>{tone === 'info' ? <RiInformationFill /> : <RiErrorWarningFill />}</AlertIcon>
          <AlertContent>
            <AlertTitle>{title}</AlertTitle>
            {children && <AlertDescription>{children}</AlertDescription>}
          </AlertContent>
        </Alert>
      </CardContent>
    </Card>
  );
}

/**
 * Explains every /Me state. `resolved` names the filing brokerage; the other
 * four say why there is none and who can change it. The page never picks a
 * brokerage: an ambiguous caller is shown the candidates, not a chooser.
 */
export function CrsStanding({ me }: { me: MeDto }) {
  const { t } = useTranslation('customer-risk');
  const label = useBrokerageLabel();

  switch (me.status) {
    case 'resolved':
      return (
        <CrsNotice
          tone="info"
          title={t('meResolved', {
            defaultValue: 'You file cases for: {{name}}',
            name: label(me.filingBrokerage),
          })}
        />
      );
    case 'noPerson':
      return (
        <CrsNotice
          title={t('meNoPerson', {
            defaultValue:
              'Your sign-in is not linked to a person record, so the system cannot tell which brokerage you file for. Ask your administrator to link your account to a person.',
          })}
        />
      );
    case 'estateWideNoFilingBrokerage':
      return (
        <CrsNotice
          title={t('meEstateWide', {
            defaultValue:
              'Your access covers every company, but a case is filed for one brokerage and you have no brokerage of your own. Ask your administrator for access to the brokerage you file for.',
          })}
        />
      );
    case 'ambiguous':
      return (
        <CrsNotice
          title={t('meAmbiguous', {
            defaultValue:
              'You have access to more than one brokerage, and the system will not choose one for you. Ask your administrator to leave you with access only to the brokerage you file for.',
          })}
        >
          <div className="mt-2">
            {t('meAmbiguousCandidates', { defaultValue: 'Brokerages found:' })}
            <ul className="list-disc ps-5 mt-1">
              {me.candidates.map((c) => (
                <li key={c.id}>{label(c)}</li>
              ))}
            </ul>
          </div>
        </CrsNotice>
      );
    case 'noFilingBrokerage':
    default:
      return (
        <CrsNotice
          title={t('meNoFilingBrokerage', {
            defaultValue:
              'You have no access to an active brokerage, so you cannot file or view risk cases. Ask your administrator for access to your brokerage.',
          })}
        />
      );
  }
}

/**
 * Renders its children only for a caller who may use the screen: an active
 * company, a resolved filing brokerage, and the named permission when the
 * service requires one. Every other outcome is explained in place.
 *
 * The service decides all of this again on every request; this gate only
 * keeps the page from offering what the service will refuse.
 */
export function CrsAccessGate({
  permission,
  children,
}: {
  permission: CrsPermissionCode;
  children: (me: MeDto) => ReactNode;
}) {
  const { t } = useTranslation('customer-risk');
  const { data: me, error, isPending, companyLoading, hasCompany } = useCrsMe();

  if (companyLoading) {
    return <CrsNotice tone="info" title={t('loading', { defaultValue: 'Loading…' })} />;
  }
  if (!hasCompany) {
    return (
      <CrsNotice
        title={t('errorNoActiveCompany', {
          defaultValue: 'No active company is selected. Choose a company from the company menu and try again.',
        })}
      />
    );
  }
  if (error) {
    return <CrsNotice tone="destructive" title={crsErrorMessage(t, error)} />;
  }
  if (isPending || !me) {
    return <CrsNotice tone="info" title={t('loading', { defaultValue: 'Loading…' })} />;
  }
  if (me.status !== 'resolved') {
    return <CrsStanding me={me} />;
  }
  if (!hasCrsPermission(me, permission)) {
    return (
      <CrsNotice
        title={t('meNotEnabled', {
          defaultValue: 'Customer risk is not enabled for your account. Ask your administrator for access.',
        })}
      />
    );
  }
  return <>{children(me)}</>;
}
