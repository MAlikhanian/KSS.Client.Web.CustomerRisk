import type { ReactNode } from 'react';
import { pickCompanyName } from '@/lib/customer-risk/format';
import type { CaseCustomerDto } from '@/lib/customer-risk/types';

/**
 * A company customer as "Name (national ID)": the name in the screen's
 * language, else the one the company has.
 *
 * A company that was read but holds no name at all shows its national id
 * alone. When the read itself failed (`resolved` false) there is neither, and
 * the same `fallback` a person shows in that state is used.
 *
 * The id is set left-to-right in its own run, so its digits and brackets stay
 * in order on a right-to-left screen.
 */
export function CompanyCustomerName({
  customer,
  languageId,
  fallback,
}: {
  customer: CaseCustomerDto;
  languageId: number;
  fallback: ReactNode;
}) {
  const name = pickCompanyName(customer.companyNames, languageId)?.name;
  const nationalId = customer.nationalId?.trim();
  if (!name) {
    if (!customer.resolved || !nationalId) return <>{fallback}</>;
    return (
      <span dir="ltr" className="font-mono">
        {nationalId}
      </span>
    );
  }
  return (
    <>
      {name}
      {nationalId && (
        <>
          {' '}
          <span dir="ltr" className="font-mono text-xs">
            ({nationalId})
          </span>
        </>
      )}
    </>
  );
}
