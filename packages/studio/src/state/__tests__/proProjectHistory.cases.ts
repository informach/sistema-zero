import { beforeEach, describe, expect, it, mock } from 'bun:test'
import {
  failNextFakeIdbWrite,
  fakeIdbPuts,
  fakeIdbWrites,
  fakeUseStore,
  resetFakeIdb,
} from '../../testing/fakeIdbStore'

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

// Revisão do lote 7 (21/11/2026).
describe('o histórico depois da revisão', () => {
  it('uma falha ao gravar chega ao chamador e não vira rejeição sem dono', async () => {
    const soltas: unknown[] = []
    const ouvir = (reason: unknown) => soltas.push(reason)
    process.on('unhandledRejection', ouvir)
    try {
      failNextFakeIdbWrite(new Error('cota cheia'))
      await expect(
        history.recordProHistoryVersion(scope, 'pro-cota', tree({ 'a.ts': '1' }), 'operation'),
      ).rejects.toThrow('cota cheia')
      await new Promise((resolve) => setTimeout(resolve, 20))
      expect(soltas).toEqual([])
    } finally {
      process.off('unhandledRejection', ouvir)
    }
  })

  it('um índice de formato desconhecido não é regravado, e entradas corrompidas ficam de fora', async () => {
    const kv = kvOf({ name: 'historico' })
    const futuro = { version: 2, versions: [], sizes: {}, novo: true }
    kv.set(history.proHistoryIndexKey('pro-formato'), futuro)
    expect(
      await history.recordProHistoryVersion(
        scope,
        'pro-formato',
        tree({ 'a.ts': '1' }),
        'operation',
      ),
    ).toBeNull()
    expect(kv.get(history.proHistoryIndexKey('pro-formato'))).toEqual(futuro)
    kv.set(history.proHistoryIndexKey('pro-formato'), {
      version: 1,
      versions: [{ id: 'quebrada', createdAt: 1 }],
      sizes: {},
    })
    expect(await history.listProHistory(scope, 'pro-formato')).toEqual([])
    expect(
      await history.recordProHistoryVersion(
        scope,
        'pro-formato',
        tree({ 'a.ts': '1' }),
        'operation',
      ),
    ).not.toBeNull()
  })

  it('a volta guarda a data da versão de destino, não um texto com "hoje"', async () => {
    const saved = await history.recordProHistoryVersion(
      scope,
      'pro-volta',
      tree({ 'a.ts': '1' }),
      'restore',
      { restoredFrom: 12_345 },
    )
    expect(saved?.restoredFrom).toBe(12_345)
  })

  it('depois de apagar, uma gravação atrasada não recria o histórico', async () => {
    const other = 'pro-apagado'
    await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '1' }), 'operation')
    await history.quiesceProHistory(scope, other)
    expect(
      await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '2' }), 'operation'),
    ).toBeNull()
  })
})

// Full review final (21/11/2026).
describe('o histórico depois do full review final', () => {
  it('ler o índice, decidir e gravar acontecem numa transação só (outra aba não grava no meio)', async () => {
    const other = 'pro-atomico'
    await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '1' }), 'operation')
    resetFakeIdb()
    await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '2' }), 'operation')
    const write = fakeIdbWrites().at(-1)
    const index = history.proHistoryIndexKey(other)
    expect(write?.steps.some((step) => step.type === 'get' && step.key === index)).toBe(true)
    expect(fakeIdbPuts(write).has(index)).toBe(true)
  })

  it('o projeto apagado noutra aba (a lápide) não ganha histórico de volta', async () => {
    const { projectHeadKey } = await import('../projectStorageKeys')
    const other = 'pro-lapide'
    kvOf({ name: 'historico' }).set(projectHeadKey(other), { version: 1, deleted: true })
    expect(
      await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '1' }), 'operation'),
    ).toBeNull()
    expect(kvOf({ name: 'historico' }).has(history.proHistoryIndexKey(other))).toBe(false)
  })

  it('o limite de Rodar compara com a última versão de Rodar, mesmo com uma operação no meio', async () => {
    const other = 'pro-rodar'
    const run = (content: string, now: number, trigger: 'run' | 'operation' = 'run') =>
      history.recordProHistoryVersion(scope, other, tree({ 'a.ts': content }), trigger, { now })
    expect(await run('1', 0)).not.toBeNull()
    expect(await run('2', 30_000, 'operation')).not.toBeNull()
    expect(await run('3', 60_000)).toBeNull()
    expect(await run('3', history.PRO_HISTORY_RUN_INTERVAL_MS)).not.toBeNull()
  })

  it('apagar espera a gravação que já estava em voo, e ela desiste sem deixar nada', async () => {
    const other = 'pro-em-voo'
    let terminou = false
    const voo = history
      .recordProHistoryVersion(scope, other, tree({ 'a.ts': '1' }), 'operation')
      .then((saved) => {
        terminou = true
        return saved
      })
    await history.quiesceProHistory(scope, other)
    // As chaves do apagar só são lidas depois disto: nada do histórico pode estar a caminho.
    expect(terminou).toBe(true)
    expect(await voo).toBeNull()
    expect(kvOf({ name: 'historico' }).has(history.proHistoryIndexKey(other))).toBe(false)
  })

  it('uma versão sozinha maior que o teto de espaço fica', async () => {
    const other = 'pro-enorme'
    const enorme = 'x'.repeat(history.PRO_HISTORY_MAX_BYTES + 1)
    await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': '1' }), 'operation', {
      now: 1,
    })
    await history.recordProHistoryVersion(scope, other, tree({ 'a.ts': enorme }), 'operation', {
      now: 2,
    })
    expect((await history.listProHistory(scope, other)).map((entry) => entry.createdAt)).toEqual([
      2,
    ])
  })

  it('apagar leva os arquivos pelas chaves do banco, mesmo com o índice num formato desconhecido', async () => {
    const other = 'pro-orfao'
    const kv = kvOf({ name: 'historico' })
    const arquivo = history.proHistoryFileKey(other, 'a'.repeat(64))
    kv.set(history.proHistoryIndexKey(other), { version: 9 })
    kv.set(arquivo, 'conteúdo')
    kv.set(history.proHistoryFileKey(`${other}-vizinho`, 'b'.repeat(64)), 'de outro projeto')
    expect(await history.proHistoryStorageKeys(scope, other)).toEqual([
      history.proHistoryIndexKey(other),
      arquivo,
    ])
  })
})
