/**
 * Mock FUNCIONAL do idb-keyval (Map por "DB") — o IndexedDB real não existe no
 * happy-dom. O registry de module mocks do bun é GLOBAL na suíte (não isolado
 * por arquivo), então o mock não é restaurado de propósito; todo arquivo que
 * toca persistência importa ESTE módulo antes de importar o código sob teste.
 */
import { mock } from 'bun:test'
import { isLocalAssetInventoryKey } from '../state/assetAuthorityKeys'

type KV = Map<IDBValidKey, unknown>

const dbs = new Map<string, KV>()
const transactions = new WeakMap<KV, Promise<unknown>>()
function serialized<T>(kv: KV, task: () => Promise<T>): Promise<T> {
  const before = transactions.get(kv) ?? Promise.resolve()
  const next = before.then(task, task)
  transactions.set(
    kv,
    next.then(
      () => undefined,
      () => undefined,
    ),
  )
  return next
}

// Gancho de teste: um guard chamado ANTES de cada `set`; se lançar, o write
// falha (simula disco cheio/quota p/ testar caminhos de erro). Default no-op.
let writeGuard: ((key: IDBValidKey, value: unknown) => void | Promise<void>) | null = null
let readGuard: ((key: IDBValidKey, database: string) => void | Promise<void>) | null = null

/** Pauses a captured read to exercise profile changes between dependent reads. */
export function setIdbReadGuard(guard: typeof readGuard): void {
  readGuard = guard
}

/** Contadores de chamadas (medições de desempenho: "quantas leituras completas por autosave?"). */
const stats = {
  get: 0,
  getMany: 0,
  getManyKeys: 0,
  set: 0,
  setMany: 0,
  keys: 0,
  del: 0,
  atomic: 0,
  atomicKeys: 0,
}

/** Fotografia dos contadores (zerados por `clearIdbMock`/`resetIdbMockStats`). */
export function idbMockStats(): Readonly<typeof stats> {
  return { ...stats }
}

export function resetIdbMockStats(): void {
  for (const key of Object.keys(stats) as Array<keyof typeof stats>) stats[key] = 0
}

/** Faz o próximo(s) `set` lançar quando o guard lançar. `null` desliga. */
export function setIdbWriteGuard(
  guard: ((key: IDBValidKey, value: unknown) => void | Promise<void>) | null,
): void {
  writeGuard = guard
}

function resolveKV(store?: { name?: string } | string): KV {
  const key =
    typeof store === 'string' ? store : ((store as { name?: string } | undefined)?.name ?? '')
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
  }
  return kv
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string, _storeName: string) => ({ name: dbName }),
  get: async (key: IDBValidKey, store?: { name?: string }) => {
    stats.get += 1
    const value = resolveKV(store).get(key)
    if (readGuard) await readGuard(key, store?.name ?? '')
    return value
  },
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    stats.getMany += 1
    stats.getManyKeys += keys.length
    return keys.map((key) => resolveKV(store).get(key))
  },
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    await writeGuard?.(key, value)
    stats.set += 1
    resolveKV(store).set(key, value)
  },
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) await writeGuard?.(key, value)
    stats.setMany += 1
    for (const [key, value] of pairs) resolveKV(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    stats.del += 1
    resolveKV(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) resolveKV(store).delete(key)
  },
  keys: async (store?: { name?: string }) => {
    stats.keys += 1
    return [...resolveKV(store).keys()]
  },
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = resolveKV(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

// The IndexedDB IO boundary only. Domain resolution, revisions and recovery run unchanged.
// Commit is all-or-nothing, including a failing put after the first queued put.
async function withMockAssetTransaction<T>(
  store: { name?: string },
  plan: (records: Map<string, unknown>) => T,
  select?: (records: ReadonlyMap<string, unknown>) => readonly string[] | null,
  _codec?: unknown,
  inspectKeys?: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
): Promise<T> {
  const kv = resolveKV(store)
  return serialized(kv, async () => {
    stats.atomic++
    const records = new Map<string, unknown>()
    const source = structuredClone(kv)
    inspectKeys?.([...source.keys()].filter(isLocalAssetInventoryKey), [...source.keys()])
    const visited = new Set<string>()
    while (true) {
      const keys = select?.(records) ?? [...source.keys()].filter(isLocalAssetInventoryKey)
      const pending = keys.filter((key) => !visited.has(key))
      if (!pending.length) break
      for (const key of pending) {
        visited.add(key)
        records.set(key, structuredClone(source.get(key)))
        stats.atomicKeys++
        await readGuard?.(key, store.name ?? '')
      }
    }
    const before = new Map(records)
    const result = plan(records)
    for (const [key, value] of records)
      if (value !== before.get(key)) await writeGuard?.(key, value)
    for (const key of before.keys()) if (!records.has(key)) kv.delete(key)
    for (const [key, value] of records)
      if (value !== before.get(key)) kv.set(key, structuredClone(value))
    return result
  })
}

mock.module('../state/assetAuthorityDb', () => ({
  withAssetTransaction: withMockAssetTransaction,
  withPhysicalAssetUpdate: <T>(
    store: { name?: string },
    plan: (records: Map<string, unknown>) => T,
    select: (records: ReadonlyMap<string, unknown>) => readonly string[] | null,
    inspectKeys: (keys: readonly string[], allKeys: readonly IDBValidKey[]) => void,
  ) => withMockAssetTransaction(store, plan, select, null, inspectKeys),
}))

/** Zera TODOS os "DBs" (chamar no beforeEach). */
export function clearIdbMock(): void {
  dbs.clear()
  writeGuard = null
  readGuard = null
  resetIdbMockStats()
}

/** Acesso direto a um DB (asserções de baixo nível). */
export function idbMockDb(name: string): KV {
  return resolveKV(name)
}
