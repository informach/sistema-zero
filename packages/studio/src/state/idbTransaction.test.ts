import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import {
  failNextFakeIdbWrite,
  fakeIdbWrites,
  fakeUseStore,
  lastFakeIdbWrite,
  resetFakeIdb,
  throwOnNextFakeIdbPut,
} from '../testing/fakeIdbStore'

// Map por banco: é onde a transação de mentira aplica o que foi pedido (pelo setMany/delMany
// deste mock), e é daqui que o teste lê o "disco". O mock exporta a superfície INTEIRA que o
// src/ usa: o registro de mocks do bun é global e o primeiro mock da suíte congela os nomes.
const dbs = new Map<string, Map<IDBValidKey, unknown>>()
const kvOf = (store?: { name?: string }): Map<IDBValidKey, unknown> => {
  const name = store?.name ?? ''
  let kv = dbs.get(name)
  if (!kv) {
    kv = new Map()
    dbs.set(name, kv)
  }
  return kv
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => fakeUseStore(dbName),
  get: async (key: IDBValidKey, store?: { name?: string }) => kvOf(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => kvOf(store).get(key)),
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    kvOf(store).set(key, value)
  },
  setMany: async (entries: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of entries) kvOf(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    kvOf(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kvOf(store).delete(key)
  },
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const { writeInOneTransaction } = await import('./idbTransaction')

/** Deixa os eventos da transação (complete/abort) chegarem. */
const settle = () => Bun.sleep(0)

let store: UseStore
let disk: Map<IDBValidKey, unknown>

beforeEach(() => {
  dbs.clear()
  resetFakeIdb()
  store = fakeUseStore('banco-do-teste')
  disk = kvOf({ name: 'banco-do-teste' })
})

describe('writeInOneTransaction', () => {
  it('grava os put e apaga os delete numa transação SÓ, com o commit() explícito depois de todos os pedidos', async () => {
    disk.set('velha', 'apagar')

    await writeInOneTransaction(store, {
      puts: [
        ['a', 1],
        ['b', 2],
      ],
      deletes: ['velha'],
    })

    expect(fakeIdbWrites()).toHaveLength(1)
    const write = lastFakeIdbWrite()
    expect(write?.mode).toBe('readwrite')
    expect(write?.steps).toEqual([
      { type: 'put', key: 'a', value: 1 },
      { type: 'put', key: 'b', value: 2 },
      { type: 'delete', key: 'velha' },
      { type: 'commit' },
    ])
    expect(write?.outcome).toBe('complete')
    expect([...disk.entries()]).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  it('a transação nasce no MESMO turno de quem chama, e os pedidos com o commit saem na microtask seguinte', async () => {
    // É o que o flush de saída precisa: a transação existir antes de a página ir embora.
    const writing = writeInOneTransaction(store, { puts: [['a', 1]] })
    expect(fakeIdbWrites()).toHaveLength(1)
    expect(lastFakeIdbWrite()?.steps).toEqual([])

    await Promise.resolve()
    expect(lastFakeIdbWrite()?.steps).toEqual([
      { type: 'put', key: 'a', value: 1 },
      { type: 'commit' },
    ])

    await writing
    expect(disk.get('a')).toBe(1)
  })

  it('falha da transação (quota cheia) rejeita com o motivo de verdade e não aplica NADA, nem o delete', async () => {
    disk.set('blocos', 'os blocos da criança')
    const quota = new DOMException('Sem espaço.', 'QuotaExceededError')
    failNextFakeIdbWrite(quota)

    await expect(
      writeInOneTransaction(store, { puts: [['meta', 1]], deletes: ['blocos'] }),
    ).rejects.toBe(quota)

    expect(lastFakeIdbWrite()?.outcome).toBe('aborted')
    expect(disk.get('blocos')).toBe('os blocos da criança')
    expect(disk.has('meta')).toBe(false)
  })

  it('abort sem motivo guardado vira AbortError (nunca rejeita com null)', async () => {
    failNextFakeIdbWrite(null)

    const rejection = await writeInOneTransaction(store, { puts: [['a', 1]] }).catch(
      (error: unknown) => error,
    )

    expect(rejection).toBeInstanceOf(DOMException)
    expect((rejection as DOMException).name).toBe('AbortError')
  })

  it('um put que LANÇA aborta a transação: os pares pedidos antes dele não ficam gravados pela metade', async () => {
    const naoClona = new DOMException('Não dá para guardar isto.', 'DataCloneError')
    throwOnNextFakeIdbPut(naoClona, (key) => key === 'b')

    await expect(
      writeInOneTransaction(store, {
        puts: [
          ['a', 1],
          ['b', 2],
          ['c', 3],
        ],
      }),
    ).rejects.toBe(naoClona)
    await settle()

    expect(lastFakeIdbWrite()?.steps).toEqual([
      { type: 'put', key: 'a', value: 1 },
      { type: 'abort' },
    ])
    expect(lastFakeIdbWrite()?.outcome).toBe('aborted')
    expect(disk.size).toBe(0)
  })

  it('anti-vácuo: SEM o abort, o mesmo put que lança deixa o primeiro par gravado pela metade', async () => {
    // O callback do `setMany` do idb-keyval, que o `persistProject` usava até 11/09/2026: os
    // `put` em sequência e mais nada. Prova que o teste de cima enxergaria a gravação pela metade.
    const naoClona = new DOMException('Não dá para guardar isto.', 'DataCloneError')
    throwOnNextFakeIdbPut(naoClona, (key) => key === 'b')
    const entries: Array<[IDBValidKey, unknown]> = [
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]

    await expect(
      store('readwrite', (objectStore) => {
        for (const [key, value] of entries) objectStore.put(value, key)
      }),
    ).rejects.toBe(naoClona)
    await settle()

    expect(lastFakeIdbWrite()?.outcome).toBe('complete')
    expect([...disk.entries()]).toEqual([['a', 1]])
  })

  it('navegador sem commit() (Safari antigo) termina pelo auto-commit, como antes', async () => {
    // A mesma transação, sem o método: é o que um Safari anterior ao 15 entrega.
    const withoutCommit: UseStore = (mode, callback) =>
      store(mode, (objectStore) => {
        const transaction = new Proxy(objectStore.transaction, {
          get: (target, property) =>
            property === 'commit' ? undefined : Reflect.get(target, property),
        })
        const proxied = new Proxy(objectStore, {
          get: (target, property) =>
            property === 'transaction' ? transaction : Reflect.get(target, property),
        })
        return callback(proxied)
      })

    await writeInOneTransaction(withoutCommit, { puts: [['a', 1]], deletes: ['zzz'] })

    expect(lastFakeIdbWrite()?.steps).toEqual([
      { type: 'put', key: 'a', value: 1 },
      { type: 'delete', key: 'zzz' },
    ])
    expect(lastFakeIdbWrite()?.outcome).toBe('complete')
    expect(disk.get('a')).toBe(1)
  })

  it('escrita vazia não abre transação', async () => {
    await writeInOneTransaction(store, {})
    await writeInOneTransaction(store, { puts: [], deletes: [] })

    expect(fakeIdbWrites()).toHaveLength(0)
  })
})
