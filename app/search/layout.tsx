import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// The search shows cases by a person's or company's national id: never indexed.
// A server layout, because the page itself is a client component and cannot
// export metadata.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children;
}
