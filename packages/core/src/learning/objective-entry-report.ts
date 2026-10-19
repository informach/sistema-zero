/** Authoring diagnostics only. This never awards progress or judges lesson completion. */
export type ProjectObjectiveVerdict = boolean | 'pending' | 'error' | 'inconclusive' | null

export interface ProjectObjectiveVerdictRow {
  id: string
  optional: boolean
  verdict: ProjectObjectiveVerdict
}

export type ProjectEntryReport =
  | { kind: 'no-required-objectives' }
  | { kind: 'has-unmet-objectives'; unmetIds: string[] }
  | { kind: 'already-satisfied'; satisfiedIds: string[] }
  | { kind: 'inconclusive'; inconclusiveIds: string[] }

/**
 * A prepared prerequisite is legitimate when another required objective is still missing.
 * Even an already-satisfied project does not complete its video's, quiz's or submission's gates.
 */
export function projectEntryReport(
  rows: readonly ProjectObjectiveVerdictRow[],
): ProjectEntryReport {
  const required = rows.filter((row) => !row.optional)
  if (!required.length) return { kind: 'no-required-objectives' }
  const unmetIds = required.filter((row) => row.verdict === false).map((row) => row.id)
  if (unmetIds.length) return { kind: 'has-unmet-objectives', unmetIds }
  const inconclusiveIds = required.filter((row) => row.verdict !== true).map((row) => row.id)
  if (inconclusiveIds.length) return { kind: 'inconclusive', inconclusiveIds }
  return { kind: 'already-satisfied', satisfiedIds: required.map((row) => row.id) }
}
