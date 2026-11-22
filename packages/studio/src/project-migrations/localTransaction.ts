import { conditionalGeneration, conditionalWrite, type IdbWrite } from '../state/idbTransaction'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'

/** Compare captured JSON snapshots without recursion or invoking accessors. */
export function localSnapshotsEqual(a: unknown, b: unknown): boolean {
  const pending = [[a, b]]
  const visited = new WeakMap<object, WeakSet<object>>()
  while (pending.length) {
    const [left, right] = pending.pop()!
    if (Object.is(left, right)) continue
    if (
      !left ||
      !right ||
      typeof left !== 'object' ||
      typeof right !== 'object' ||
      Array.isArray(left) !== Array.isArray(right)
    )
      return false
    for (const value of [left, right]) {
      const prototype = Object.getPrototypeOf(value)
      if (prototype !== Object.prototype && prototype !== null && prototype !== Array.prototype)
        return false
    }
    if (Array.isArray(left) && left.length !== (right as unknown[]).length) return false
    let peers = visited.get(left)
    if (peers?.has(right)) continue
    if (!peers) {
      peers = new WeakSet()
      visited.set(left, peers)
    }
    peers.add(right)
    const keys = Object.keys(left)
    if (keys.length !== Object.keys(right).length) return false
    for (const key of keys) {
      const before = Object.getOwnPropertyDescriptor(left, key)
      const after = Object.getOwnPropertyDescriptor(right, key)
      if (!before || !after || !('value' in before) || !('value' in after)) return false
      pending.push([before.value, after.value])
    }
  }
  return true
}

/**
 * Conversão e hash já terminaram: a promoção compara e escreve sincronicamente.
 * Usa o mesmo registro de transações condicionais do editor, interrompível na saída.
 */
export function promoteLocalMigration(
  store: ProjectStorageScope['store'],
  expected: ReadonlyArray<readonly [IDBValidKey, unknown]>,
  write: IdbWrite,
  identity = 'studio-project-migration',
): Promise<boolean> {
  return conditionalWrite(
    store,
    identity,
    conditionalGeneration(identity),
    expected.map(([key]) => key),
    (values) => {
      const promoted = values.every((value, index) =>
        localSnapshotsEqual(value, expected[index]![1]),
      )
      return { write: promoted ? write : {}, result: promoted }
    },
  )
}

/**
 * A gravação de saída da aba escondida (`interruptConditionalTransactions`, também com a página
 * VIVA) aborta as escritas condicionais em voo, e a promoção é uma delas. Abortada, ela é lida de
 * novo e tentada outra vez (22/11/2026): antes virava "pendente" e o card dizia "Preservado" até
 * a próxima carga. Com a página indo embora, a nova tentativa morre junto, sem efeito, porque a
 * promoção é uma transação só.
 */
export const INTERRUPTED = Symbol('promoção interrompida pela saída')
export function interruptedByExit(error: unknown): typeof INTERRUPTED {
  if ((error as { name?: unknown } | null)?.name === 'AbortError') return INTERRUPTED
  throw error
}
