/**
 * Bridges a CRS risk-case customer to a row in KSS.Service.Person.
 *
 * Every Person call the CRS UI makes lives in this one module. When the CRS
 * backend gains a `CrsCustomerManagementService`, the orchestration moves there
 * and this file is deleted outright rather than untangled from the page.
 *
 * Design rule: Person is a SOFT dependency. Nothing here throws — a risk case
 * must remain filable when Person is unreachable, when the customer already
 * exists under another company, or when anything else goes wrong. The as-filed
 * snapshot on the case is the record of what was asserted; the person link is
 * an enrichment on top of it.
 */

/** LanguageId 12 = Persian, 10 = English (KSS_Common.dbo.Language). */
const PERSIAN_LANGUAGE_ID = 12;
const ENGLISH_LANGUAGE_ID = 10;

export type PersonLinkStatus =
  | 'linked'      // matched an existing Person row
  | 'created'     // created a new Person row
  | 'duplicate'   // national id exists but is not visible in this company
  | 'failed';     // Person unreachable, or any other error

export interface PersonLinkResult {
  personId?: string;
  status: PersonLinkStatus;
}

export interface PersonLinkInput {
  nationalId: string;
  firstName: string;
  lastName: string;
  fatherName?: string;
  /** ISO date string, as held by the CRS form. */
  dateOfBirth?: string;
}

interface SexTranslationRow {
  sexId: number;
  languageId: number;
  name: string;
}

interface PersonListRow {
  id: string;
  nationalId?: string;
}

/**
 * Resolve the `Sex` row id for male.
 *
 * `SexTranslationDto` carries no `Code`, so the id cannot be matched on the
 * stable code from here — it is matched on the ENGLISH translation instead,
 * which is written by the same seed block that sets `Code = 'Male'` and so
 * cannot drift away from it independently.
 *
 * Returns undefined when the lookup fails; the caller then omits `sexId` and
 * lets Person's own DTO default apply.
 */
export async function resolveMaleSexId(): Promise<number | undefined> {
  try {
    const res = await fetch('/api/person/reference');
    if (!res.ok) return undefined;
    const json = await res.json();
    const rows: SexTranslationRow[] = json?.sexTranslations ?? [];
    const male = rows.find(
      (r) => r.languageId === ENGLISH_LANGUAGE_ID && r.name?.trim().toLowerCase() === 'male',
    );
    return male?.sexId;
  } catch {
    return undefined;
  }
}

/**
 * Find a person by national id.
 *
 * `/api/person` is tenant-scoped and matches by SUBSTRING, so the result is
 * narrowed to an exact national-id match here. A person belonging to another
 * company is invisible to this call by design and comes back as undefined.
 */
export async function findPersonByNationalId(nationalId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/person?query=${encodeURIComponent(nationalId)}&limit=50`);
    if (!res.ok) return undefined;
    const json = await res.json();
    const rows: PersonListRow[] = json?.data ?? [];
    return rows.find((p) => p.nationalId === nationalId)?.id;
  } catch {
    return undefined;
  }
}

/**
 * Link the customer to an existing Person row, or create one.
 *
 * Only ever called for Individual customers — a Legal entity has no Person row,
 * because Person models natural persons only.
 */
export async function linkOrCreatePerson(input: PersonLinkInput): Promise<PersonLinkResult> {
  const existing = await findPersonByNationalId(input.nationalId);
  if (existing) return { personId: existing, status: 'linked' };

  const sexId = await resolveMaleSexId();

  try {
    // Same payload shape the canonical person/create page posts.
    const res = await fetch('/api/person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(sexId ? { sexId } : {}),
        preferredLanguageId: PERSIAN_LANGUAGE_ID,
        nationalId: input.nationalId,
        dateOfBirth: input.dateOfBirth || undefined,
        translations: [
          {
            languageId: PERSIAN_LANGUAGE_ID,
            firstName: input.firstName,
            lastName: input.lastName,
            fatherName: input.fatherName || undefined,
          },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // The national id is unique service-wide while the lookup above is
      // tenant-scoped, so this is the expected answer for a customer who
      // already exists under a different company.
      const isDuplicate = String(err?.message ?? '').includes('DUPLICATE_NATIONAL_ID');
      return { status: isDuplicate ? 'duplicate' : 'failed' };
    }

    const created = await res.json();
    return created?.id
      ? { personId: created.id, status: 'created' }
      : { status: 'failed' };
  } catch {
    return { status: 'failed' };
  }
}
