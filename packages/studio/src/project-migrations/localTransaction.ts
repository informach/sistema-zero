import type { IdbWrite } from '../state/idbTransaction'
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
 * Só a migração, antes de abrir o editor, usa leitura e escrita condicionais na
 * mesma transação. O autosave/flush continua pedindo e confirmando sem leituras.
 * Conversão e hash já terminaram: este callback compara e promove sincronicamente.
 */
export function promoteLocalMigration(
  store: ProjectStorageScope['store'],
  expected: ReadonlyArray<readonly [IDBValidKey, unknown]>,
  write: IdbWrite,
): Promise<boolean> {
  return store(
    'readwrite',
    (objectStore) =>
      new Promise<boolean>((resolve, reject) => {
        const transaction = objectStore.transaction
        const requests = expected.map(([key]) => objectStore.get(key))
        let remaining = requests.length
        let promoted = false
        transaction.oncomplete = () => resolve(promoted)
        transaction.onabort = () =>
          reject(transaction.error ?? new Error('A conversão local foi interrompida.'))
        const finish = () => {
          try {
            if (requests.every((request, index) => equal(request.result, expected[index]![1]))) {
              for (const [key, value] of write.puts ?? []) objectStore.put(value, key)
              for (const key of write.deletes ?? []) objectStore.delete(key)
              promoted = true
            }
            transaction.commit()
          } catch (error) {
            transaction.abort()
            reject(error)
          }
        }
        for (const request of requests)
          request.onsuccess = () => {
            if (--remaining === 0) finish()
          }
        if (!remaining) finish()
      }),
  )
}
