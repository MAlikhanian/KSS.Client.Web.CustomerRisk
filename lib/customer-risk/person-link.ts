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
export const PERSIAN_LANGUAGE_ID = 12;
export const ENGLISH_LANGUAGE_ID = 10;

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
  /**
   * The sex the operator chose. Declared `number | undefined` rather than
   * optional on purpose: the property must be PASSED, so a caller cannot
   * quietly leave it out, but it may be undefined when the operator could not
   * be offered the choice. A create is then refused rather than defaulted —
   * see linkOrCreatePerson.
   */
  sexId: number | undefined;
}

interface SexTranslationRow {
  sexId: number;
  languageId: number;
  name: string;
}

/** One selectable sex, already narrowed to the caller's language. */
export interface SexOption {
  sexId: number;
  name: string;
}

interface PersonListRow {
  id: string;
  nationalId?: string;
}

/**
 * The sexes an operator may choose from, in one language.
 *
 * This replaces a resolveMaleSexId() that picked Male for every customer
 * without asking. The form had no sex field at all, so every Individual
 * customer was written to Person with a sex nobody supplied — and when the
 * lookup failed the field was omitted instead, which lands on
 * CreatePersonWithTranslationDto's `SexId = 1` and asserts one anyway.
 *
 * That default is Male in every database we have, but note what that rests on:
 * Sex.Id is `TINYINT IDENTITY(1,1)` and the seed MERGEs from
 * `(VALUES ('Male'),('Female'))` with no explicit id, so Male = 1 follows from
 * insert order, not from anything the schema states. Which value it is does not
 * actually matter to the defect — the point is that it is a value the operator
 * never supplied. The fix is a field with no preselected answer, so this
 * returns the options rather than a choice.
 *
 * Returns [] on any failure — including a reachable service that answered with
 * nothing, which is indistinguishable here: the reference route fans out its
 * lookups under Promise.allSettled and maps a rejected one to an empty array
 * with HTTP 200, so `res.ok` is true either way. Callers must treat [] as
 * "cannot ask", never as "no options exist".
 *
 * The timeout is load-bearing, not defensive tidiness. A caller has to be able
 * to distinguish "Person said nothing" from "Person has not answered yet", and
 * it can only do that if the second state is guaranteed to END. Without a
 * ceiling a hung request stays unsettled forever, and any UI that waits for a
 * settled answer waits forever with it. Ten seconds is generous for this route
 * even though it fans out 23 upstream lookups.
 */
export async function listSexOptions(languageId: number): Promise<SexOption[]> {
  try {
    const res = await fetch('/api/person/reference', {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows: SexTranslationRow[] = json?.sexTranslations ?? [];
    return rows
      .filter((r) => r.languageId === languageId && !!r.name?.trim())
      .map((r) => ({ sexId: r.sexId, name: r.name.trim() }));
  } catch {
    return [];
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

  // Refuse to CREATE without a sex the operator actually chose. Omitting the
  // field does not mean "unset" at the other end — CreatePersonWithTranslationDto
  // declares `public byte SexId { get; set; } = 1`, so an absent value becomes a
  // real, wrong assertion about a real person, indistinguishable afterwards from
  // one somebody entered. Failing the link is recoverable; that is not.
  //
  // Linking above is unaffected: matching an existing person needs no sex, and
  // this must not overwrite one already recorded.
  if (!input.sexId) return { status: 'failed' };

  try {
    // Same payload shape the canonical person/create page posts.
    const res = await fetch('/api/person', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sexId: input.sexId,
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
