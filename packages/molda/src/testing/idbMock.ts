/**
 * Mock do `idb-keyval` para os testes (happy-dom não tem IndexedDB). Um Map
 * por banco/store, valores por `structuredClone` (o mesmo contrato do
 * IndexedDB de verdade: `Uint8Array` atravessa, função explode). Importar
 * este módulo ANTES do módulo em teste instala o mock; `clearIdbMock()` no
 * `beforeEach` zera tudo.
 */
import { mock } from 'bun:test'

interface StoreHandle {
  db: string
  name: string
}

const DEFAULT_KEY = 'keyval-store/keyval'
const stores = new Map<string, Map<IDBValidKey, unknown>>()

function keyOf(store?: StoreHandle): string {
  return store ? `${store.db}/${store.name}` : DEFAULT_KEY
}

function mapFor(store?: StoreHandle): Map<IDBValidKey, unknown> {
  const key = keyOf(store)
  let map = stores.get(key)
  if (!map) {
    map = new Map()
    stores.set(key, map)
  }
  return map
}

function clone<T>(value: T): T {
  return value === undefined ? value : structuredClone(value)
}

export function clearIdbMock(): void {
  stores.clear()
}

/** Inspeção direta de um banco (sem passar pela persistência). */
export function idbMockStore(db: string, name = 'assets'): Map<IDBValidKey, unknown> {
  return mapFor({ db, name })
}

export function idbMockDbNames(): string[] {
  return [...stores.keys()]
}

mock.module('idb-keyval', () => ({
  createStore: (db: string, name: string): StoreHandle => ({ db, name }),
  get: async (key: IDBValidKey, store?: StoreHandle) => clone(mapFor(store).get(key)),
  set: async (key: IDBValidKey, value: unknown, store?: StoreHandle) => {
    mapFor(store).set(key, clone(value))
  },
  setMany: async (entries: Array<[IDBValidKey, unknown]>, store?: StoreHandle) => {
    const map = mapFor(store)
    for (const [key, value] of entries) map.set(key, clone(value))
  },
  getMany: async (keys: IDBValidKey[], store?: StoreHandle) => {
    const map = mapFor(store)
    return keys.map((key) => clone(map.get(key)))
  },
  update: async (key: IDBValidKey, updater: (old: unknown) => unknown, store?: StoreHandle) => {
    const map = mapFor(store)
    map.set(key, clone(updater(clone(map.get(key)))))
  },
  del: async (key: IDBValidKey, store?: StoreHandle) => {
    mapFor(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: StoreHandle) => {
    const map = mapFor(store)
    for (const key of keys) map.delete(key)
  },
  clear: async (store?: StoreHandle) => {
    mapFor(store).clear()
  },
  keys: async (store?: StoreHandle) => [...mapFor(store).keys()],
  values: async (store?: StoreHandle) => [...mapFor(store).values()].map(clone),
  entries: async (store?: StoreHandle) =>
    [...mapFor(store).entries()].map(([key, value]) => [key, clone(value)]),
  promisifyRequest: () => {
    throw new Error('promisifyRequest não existe no mock')
  },
}))
