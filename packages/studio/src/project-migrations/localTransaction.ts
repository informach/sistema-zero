import { conditionalGeneration, conditionalWrite, type IdbWrite } from '../state/idbTransaction'
import type { ProjectStorageScope } from '../state/projectStorageRuntime'

function equal(a: unknown, b: unknown): boolean {
  const pending = [[a, b]]
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
    const entries = Object.entries(left)
    if (entries.length !== Object.keys(right).length) return false
    for (const [key, value] of entries) {
      const descriptor = Object.getOwnPropertyDescriptor(right, key)
      if (!descriptor || !('value' in descriptor)) return false
      pending.push([value, descriptor.value])
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
      const promoted = values.every((value, index) => equal(value, expected[index]![1]))
      return { write: promoted ? write : {}, result: promoted }
    },
  )
}
