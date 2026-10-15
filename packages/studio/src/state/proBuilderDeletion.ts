import type { StudioProBuilderAdapter } from '@sistemazero/core/studio/pro-builder'
import { conditionalGeneration, conditionalWrite, readAllKeys, readValue } from './idbTransaction'
import { captureProjectStorageScope, type ProjectStorageScope } from './projectStorageRuntime'

const prefix = 'sz:builder-deletion:'
export const proBuilderDeletionKey = (projectId: string) => `${prefix}${projectId}`
export interface ProBuilderDeletion {
  version: 1
  projectId: string
  createdAt: number
}
const listeners = new Set<(scope: ProjectStorageScope) => void>()
export function subscribeProBuilderDeletion(
  listener: (scope: ProjectStorageScope) => void,
): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function notifyProBuilderDeletion(scope: ProjectStorageScope): void {
  for (const listener of listeners) listener(scope)
}
function isDeletion(value: unknown): value is ProBuilderDeletion {
  const item = value as ProBuilderDeletion | null
  return Boolean(
    item &&
      item.version === 1 &&
      /^[A-Za-z0-9_-]{1,128}$/.test(item.projectId) &&
      Number.isSafeInteger(item.createdAt),
  )
}

/** ACK removes only the corresponding outbox entry; failures remain for the next opening/online event. */
export async function drainProBuilderDeletions(
  scope: ProjectStorageScope,
  remove: NonNullable<StudioProBuilderAdapter['removeProject']>,
  signal: AbortSignal,
): Promise<number> {
  const valid = () => !signal.aborted && captureProjectStorageScope() === scope
  if (!valid()) return 0
  const keys = (await readAllKeys(scope.store))
    .filter((key) => typeof key === 'string' && key.startsWith(prefix))
    .slice(0, 20)
  let acknowledged = 0
  for (const key of keys) {
    if (!valid()) break
    const item = await readValue(scope.store, key)
    if (!valid()) break
    if (!isDeletion(item) || key !== proBuilderDeletionKey(item.projectId)) continue
    await remove(item.projectId, signal)
    if (!valid()) break
    await conditionalWrite(
      scope.store,
      scope.identity,
      conditionalGeneration(scope.identity),
      [key],
      ([current]) => ({
        result: undefined,
        write:
          isDeletion(current) && current.createdAt === item.createdAt ? { deletes: [key] } : {},
      }),
    )
    acknowledged++
  }
  return acknowledged
}
