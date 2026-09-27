import { beforeEach, describe, expect, it, mock } from 'bun:test'
import type { UseStore } from 'idb-keyval'
import {
  failNextFakeIdbWrite,
  fakeIdbReads,
  fakeIdbTransactions,
  fakeIdbWrites,
  fakeUseStore,
  holdNextFakeIdbWrite,
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

// A chave que o "banco" não consegue ler (o erro chega depois dos pedidos, como no navegador).
const BROKEN_KEY = 'chave-que-o-banco-nao-le'
const brokenRead = new DOMException('O banco não conseguiu ler.', 'UnknownError')
const readOf = (key: IDBValidKey, store?: { name?: string }) => {
  if (key === BROKEN_KEY) throw brokenRead
  return kvOf(store).get(key)
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => fakeUseStore(dbName),
  get: async (key: IDBValidKey, store?: { name?: string }) => readOf(key, store),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => readOf(key, store)),
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

const { readAllKeys, readValue, readValues, writeInOneTransaction } = await import(
  './idbTransaction'
)

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

describe('leituras (readValues / readValue / readAllKeys)', () => {
  it('lê várias chaves numa transação de leitura SÓ, com o commit() explícito depois dos pedidos', async () => {
    // É o segundo mecanismo do flush: uma leitura em auto-commit só termina quando a página
    // processa o resultado, e a gravação da saída espera por ela.
    disk.set('a', 1)
    disk.set('c', 3)

    await expect(readValues(store, ['a', 'b', 'c'])).resolves.toEqual([1, undefined, 3])

    expect(fakeIdbTransactions()).toHaveLength(1)
    const read = fakeIdbReads()[0]
    expect(read?.mode).toBe('readonly')
    expect(read?.steps).toEqual([
      { type: 'get', key: 'a' },
      { type: 'get', key: 'b' },
      { type: 'get', key: 'c' },
      { type: 'commit' },
    ])
    expect(read?.outcome).toBe('complete')
  })

  it('readValue lê uma chave, e readAllKeys lista as chaves, cada um numa transação com commit', async () => {
    disk.set('meta', { nome: 'nave' })
    disk.set('outra', 2)

    await expect(readValue(store, 'meta')).resolves.toEqual({ nome: 'nave' })
    await expect(readValue(store, 'nao-existe')).resolves.toBeUndefined()
    await expect(readAllKeys(store)).resolves.toEqual(['meta', 'outra'])

    expect(fakeIdbReads().map((read) => read.steps)).toEqual([
      [{ type: 'get', key: 'meta' }, { type: 'commit' }],
      [{ type: 'get', key: 'nao-existe' }, { type: 'commit' }],
      [{ type: 'getAllKeys' }, { type: 'commit' }],
    ])
  })

  it('com commit(), o complete pode chegar ANTES do success (Chromium, valor grande): o helper espera os dois', async () => {
    // Medido em 11/09/2026: no Chromium, a partir de ~1,5 MB, o `complete` de uma leitura com
    // commit chega antes do `success`, e ler o `result` nesse instante lança. Foi o que fez o
    // editor não reabrir o projeto com o céu de 1,5 MB no e2e. O fake imita isso sempre.
    disk.set('ceu', 'x'.repeat(10))
    const lidoNoComplete = await store('readonly', (objectStore) => {
      const request = objectStore.get('ceu')
      objectStore.transaction.commit()
      return new Promise<string>((resolve) => {
        objectStore.transaction.oncomplete = () => {
          try {
            resolve(`leu ${String(request.result)}`)
          } catch (error) {
            resolve((error as DOMException).name)
          }
        }
      })
    })
    expect(lidoNoComplete).toBe('InvalidStateError')

    await expect(readValue(store, 'ceu')).resolves.toBe('x'.repeat(10))
  })

  it('lista vazia não abre transação', async () => {
    await expect(readValues(store, [])).resolves.toEqual([])
    expect(fakeIdbTransactions()).toHaveLength(0)
  })

  it('uma leitura que o banco não consegue fazer rejeita com o motivo do abort (nunca null)', async () => {
    await expect(readValues(store, ['a', BROKEN_KEY])).rejects.toBe(brokenRead)

    expect(fakeIdbReads()[0]?.outcome).toBe('aborted')
  })

  it('um pedido de leitura que LANÇA na hora aborta a transação e propaga o erro', async () => {
    const chaveInvalida = new DOMException('Chave inválida.', 'DataError')
    const throwing: UseStore = (mode, callback) =>
      store(mode, (objectStore) => {
        const proxied = new Proxy(objectStore, {
          get: (target, property) =>
            property === 'get'
              ? () => {
                  throw chaveInvalida
                }
              : Reflect.get(target, property),
        })
        return callback(proxied)
      })

    await expect(readValues(throwing, ['a', 'b'])).rejects.toBe(chaveInvalida)
    await settle()

    expect(fakeIdbReads()[0]?.steps).toEqual([{ type: 'abort' }])
    expect(fakeIdbReads()[0]?.outcome).toBe('aborted')
  })
})

describe('o fake escalona como o navegador (é nisso que os testes de ordem se apoiam)', () => {
  it('uma leitura nascida DEPOIS de uma escrita espera por ela e lê o que ela gravou', async () => {
    disk.set('meta', 'v1')
    const inFlight = holdNextFakeIdbWrite()

    const writing = writeInOneTransaction(store, { puts: [['meta', 'v2']] })
    const reading = readValue(store, 'meta')
    await settle()
    expect(fakeIdbReads()[0]?.outcome).toBe('pending')

    inFlight.release()
    await writing
    await expect(reading).resolves.toBe('v2')
  })

  it('uma escrita espera as transações anteriores, na ordem em que nasceram', async () => {
    const inFlight = holdNextFakeIdbWrite()

    const first = writeInOneTransaction(store, { puts: [['placar', 1]] })
    const second = writeInOneTransaction(store, { puts: [['placar', 2]] })
    await settle()
    // As duas já nasceram (os pedidos foram feitos), mas a segunda não começa antes da primeira.
    expect(fakeIdbWrites().map((write) => write.outcome)).toEqual(['pending', 'pending'])

    inFlight.release()
    await Promise.all([first, second])
    expect(disk.get('placar')).toBe(2)
  })

  it('bancos diferentes não se esperam', async () => {
    const other = fakeUseStore('outro-banco')
    const inFlight = holdNextFakeIdbWrite()

    const writing = writeInOneTransaction(store, { puts: [['a', 1]] })
    await expect(readValue(other, 'a')).resolves.toBeUndefined()

    inFlight.release()
    await writing
  })
})
