/**
 * The national id of the last successful search, held in this tab's memory
 * ONLY: never in a URL, a query string, cookies or any storage. The read-only
 * view of another brokerage's case needs it, because the service serves that
 * view only for the id the case was found by.
 *
 * It survives a navigation inside the app and is gone after a reload or in a
 * new tab, which is intended: the view then shows its neutral "not available"
 * state and calls nothing.
 */
let searchedNationalId: string | null = null;

export function rememberSearchedNationalId(nationalId: string): void {
  searchedNationalId = nationalId;
}

export function forgetSearchedNationalId(): void {
  searchedNationalId = null;
}

export function searchedNationalIdInMemory(): string | null {
  return searchedNationalId;
}
