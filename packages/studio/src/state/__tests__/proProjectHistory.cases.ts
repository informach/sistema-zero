import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { fakeUseStore, resetFakeIdb } from '../../testing/fakeIdbStore'

// Proposta aprovada em 21/11/2026: o Histórico do projeto do Pro. Banco de mentira por Map (o
// IndexedDB não existe no happy-dom), num processo próprio (`proProjectHistory.test.ts`).
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
const kvOf = (store?: { name?: string }): KV => {
  const key = store?.name ?? ''
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
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
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) kvOf(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    kvOf(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kvOf(store).delete(key)
  },
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  update: async () => {},
}))

const history = await import('../proProjectHistory')
const scope = {
  namespace: 'teste',
  identity: 'teste-historico',
  store: fakeUseStore('historico'),
}
const ID = 'pro-historico'
const tree = (files: Record<string, string>, dirs: string[] = ['src']) => ({
  ...Object.fromEntries(dirs.map((dir) => [dir, { kind: 'dir' as const }])),
  ...Object.fromEntries(
    Object.entries(files).map(([path, content]) => [path, { kind: 'file' as const, content }]),
  ),
})

beforeEach(() => {
  dbs.clear()
  resetFakeIdb()
})

describe('o Histórico do projeto', () => {
  it('guarda a árvore, conta o que mudou e não repete versão igual', async () => {
    const first = await history.recordProHistoryVersion(
      scope,
      ID,
      tree({ 'src/main.ts': 'a', 'index.html': '<p>' }),
      'operation',
      { now: 1_000, label: 'Arquivo renomeado' },
    )
    expect(first?.changedFiles).toBe(2)
    expect(
      await history.recordProHistoryVersion(
        scope,
        ID,
        tree({ 'src/main.ts': 'a', 'index.html': '<p>' }),
        'zappy',
        { now: 2_000 },
      ),
    ).toBeNull()
    const second = await history.recordProHistoryVersion(
      scope,
      ID,
      tree({ 'src/main.ts': 'b', 'src/novo.ts': 'n' }),
      'zappy',
      { now: 3_000 },
    )
    // main.ts mudou, novo.ts nasceu, index.html saiu.
    expect(second?.changedFiles).toBe(3)
    const list = await history.listProHistory(scope, ID)
    expect(list.map((entry) => entry.trigger)).toEqual(['zappy', 'operation'])
    expect(list[1]?.label).toBe('Arquivo renomeado')
    expect(await history.readProHistoryTree(scope, ID, first!.id)).toEqual(
      tree({ 'src/main.ts': 'a', 'index.html': '<p>' }),
    )
  })

  it('ao Rodar, no máximo uma versão a cada 2 minutos', async () => {
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': '1' }), 'run', { now: 0 })
    expect(
      await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': '2' }), 'run', {
        now: history.PRO_HISTORY_RUN_INTERVAL_MS - 1,
      }),
    ).toBeNull()
    expect(
      await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': '2' }), 'run', {
        now: history.PRO_HISTORY_RUN_INTERVAL_MS,
      }),
    ).not.toBeNull()
  })

  it('só o que mudou ocupa espaço, e as mais antigas saem com os arquivos que só elas usavam', async () => {
    for (let index = 0; index < history.PRO_HISTORY_MAX_VERSIONS + 5; index++)
      await history.recordProHistoryVersion(
        scope,
        ID,
        tree({ 'fixo.ts': 'igual em todas', 'muda.ts': `versão ${index}` }),
        'operation',
        { now: index },
      )
    const list = await history.listProHistory(scope, ID)
    expect(list).toHaveLength(history.PRO_HISTORY_MAX_VERSIONS)
    expect(list.at(-1)?.createdAt).toBe(5)
    const keys = [...kvOf({ name: 'historico' }).keys()].map(String)
    // O arquivo igual é guardado uma vez; dos que mudam, só os das versões que ficaram.
    expect(keys.filter((key) => key.startsWith('sz:v4:history-file:'))).toHaveLength(
      history.PRO_HISTORY_MAX_VERSIONS + 1,
    )
    expect(await history.proHistoryStorageKeys(scope, ID)).toHaveLength(
      history.PRO_HISTORY_MAX_VERSIONS + 2,
    )
  })

  it('o teto de espaço tira versões antigas, mas nunca a nova', async () => {
    const big = 'x'.repeat(8 * 1024 * 1024)
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': `1${big}` }), 'operation', {
      now: 1,
    })
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': `2${big}` }), 'operation', {
      now: 2,
    })
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': `3${big}` }), 'operation', {
      now: 3,
    })
    const list = await history.listProHistory(scope, ID)
    expect(list.map((entry) => entry.createdAt)).toEqual([3, 2])
  })
})

describe('apagar o projeto leva o histórico junto', () => {
  it('as versões e os arquivos guardados saem na mesma transação do apagar', async () => {
    const { deleteProject } = await import('../persistence')
    const { projectMetaKey } = await import('../projectStorageKeys')
    kvOf({ name: 'historico' }).set(projectMetaKey(ID), {
      id: ID,
      name: 'Meu Pro',
      kind: 'pro',
      createdAt: 1,
      updatedAt: 1,
      mode: 'code',
    })
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': '1' }), 'operation')
    await history.recordProHistoryVersion(scope, ID, tree({ 'a.ts': '2' }), 'operation')
    const historyKeys = () =>
      [...kvOf({ name: 'historico' }).keys()].map(String).filter((key) => key.includes('history'))
    expect(historyKeys()).toHaveLength(3)
    await deleteProject(ID, scope, { notifyCloudMirror: false })
    expect(historyKeys()).toEqual([])
  })
})
