import { applicationBudget, journal, journalWrite } from './projectStorageCoordinator'
import { applicationBudgetKey, projectApplicationsKey } from './projectStorageKeys'
import type { ProApplicationRecord } from './projectStorageRevision'

/** Old V4 writers preserve these keys while charging their numeric values.
 * Project IDs cannot contain ':', so deleting an old project cannot release a
 * retained project's charge. Both authorities share the same atomic profile cap.
 */
export const retainedApplicationBudgetId = (id: string) => `sz:v5:${id}`
export interface RetainedApplicationBudget {
  previous: unknown
  next: Record<string, number>
}
export function retainedApplications(
  id: string,
  before: unknown,
  previous: unknown,
  additions: ProApplicationRecord[],
  reset = false,
): { records: ProApplicationRecord[]; budget: RetainedApplicationBudget } {
  if (reset) {
    const next = { ...applicationBudget(previous) }
    delete next[retainedApplicationBudgetId(id)]
    return { records: [], budget: { previous, next } }
  }
  const write = journalWrite(
    id,
    before,
    previous,
    additions,
    undefined,
    retainedApplicationBudgetId(id),
  )
  const records = write.puts?.find(([key]) => key === projectApplicationsKey(id))?.[1]
  const totals = write.puts?.find(([key]) => key === applicationBudgetKey())?.[1]
  return {
    records: journal(records ?? before),
    budget: { previous, next: applicationBudget(totals ?? previous) },
  }
}
