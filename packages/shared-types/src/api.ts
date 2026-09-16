/**
 * The one response envelope every endpoint uses — a route never invents
 * its own success/error shape (api-and-agent-tools guideline). A caller,
 * human or agent, can always branch on `ok` and get a typed `data` or a
 * typed `error` back.
 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ApiError {
  message: string;
  /** A stable, machine-readable code for programmatic branching — optional
   * only because a handful of very generic 500s don't have one yet. */
  code?: string;
}

/** A cursor-paginated list response. `nextCursor` is opaque — callers pass
 * it straight back as `?cursor=`, never decode or construct it themselves. */
export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}
