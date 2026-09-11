import { afterAll, describe, expect, it, mock } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { createEmptyProject } from '#core'
import {
  type FakeIdbTransaction,
  fakeIdbTransactions,
  fakeUseStore,
  resetFakeIdb,
} from '../testing/fakeIdbStore'

/**
 * A REGRA do banco dos projetos (`idbTransaction.ts`, 11/09/2026): toda transação faz todos os
 * pedidos de uma vez e termina com `commit()` explícito, então nenhuma depende da página continuar
 * viva para terminar. Uma leitura ou gravação em auto-commit aberta na saída da página trancava a
 * gravação do projeto (a escrita espera as transações anteriores do mesmo store) e as duas morriam
 * juntas. Este arquivo cobra a regra de dois jeitos: rodando cada operação que toca o banco e
 * olhando as transações que ela abriu, e proibindo quem voltar a ler ou gravar pelo idb-keyval
 * direto.
 */

// O `gameStorage` e o `settingsStore` saem cedo sem IndexedDB (o happy-dom não tem): com o stub,
// eles seguem pelo caminho de verdade (que aqui cai no mock abaixo).
const globalWithIdb = globalThis as { indexedDB?: unknown }
const hadIndexedDb = 'indexedDB' in globalWithIdb
globalWithIdb.indexedDB = globalWithIdb.indexedDB ?? {}

// Map por banco (o `.name` do store): as operações leem de volta o que gravaram, para as que
// decidem pelo que leram (renomear, a capa, a troca de desenho) chegarem a gravar.
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

const persistence = await import('./persistence')
const gameStorage = await import('./gameStorage')
const { useSettingsStore } = await import('./settingsStore')
// O store das preferências é um singleton da suíte inteira: o teste o carrega (tema escuro,
// vindo do lugar antigo) e o devolve como achou, para nenhum arquivo seguinte herdar isso.
const settingsBefore = { ...useSettingsStore.getState() }

afterAll(() => {
  persistence.setStorageNamespace('')
  useSettingsStore.setState(settingsBefore)
  if (!hadIndexedDb) delete globalWithIdb.indexedDB
})

/** O banco dos projetos: o do namespace padrão e os de perfil (`sistema-zero-studio-<perfil>`). */
const isProjectDatabase = (transaction: FakeIdbTransaction) =>
  transaction.db === 'sistema-zero-studio' || transaction.db.startsWith('sistema-zero-studio-')

/** As transações que NÃO terminam com um `commit()` explícito depois dos pedidos. */
function withoutExplicitCommit(
  transactions: readonly FakeIdbTransaction[],
): readonly FakeIdbTransaction[] {
  return transactions.filter((transaction) => {
    const commits = transaction.steps.filter((step) => step.type === 'commit').length
    return commits !== 1 || transaction.steps.at(-1)?.type !== 'commit'
  })
}

describe('o banco dos projetos só vê transações com commit explícito', () => {
  it('toda operação que toca o banco pede tudo de uma vez e termina com commit()', async () => {
    dbs.clear()
    resetFakeIdb()
    persistence.setStorageNamespace('')
    const project = {
      ...createEmptyProject('01J0000000000000000000INVA', 'Invariante'),
      assets: [],
    }
    // As preferências antigas no lugar de antes, para a cópia única ler de lá.
    kvOf({ name: 'sistema-zero-studio' }).set('sz:settings', { theme: 'dark' })

    await persistence.persistProject(project)
    await persistence.loadProjectById(project.id)
    await persistence.loadProjectShellById(project.id)
    await persistence.loadProjectMetaById(project.id)
    await persistence.loadProjectBlocksById(project.id)
    await persistence.loadProjectAssetsById(project.id)
    await persistence.listAllProjects()
    await persistence.listProjectSummariesLight()
    await persistence.loadProjectSummaryById(project.id)
    await persistence.loadProjectSummariesByIds([project.id, 'nao-existe'])
    await persistence.renameProjectMeta(project.id, 'Renomeado')
    await persistence.persistProjectAssets(project.id, [])
    expect(await persistence.writeProjectThumb(project.id, 'data:image/jpeg;base64,AAA')).toBe(true)
    await gameStorage.writeGameStorage(project.id, { placar: '10' })
    await expect(gameStorage.loadGameStorage(project.id)).resolves.toEqual({ placar: '10' })
    await gameStorage.writeGameStorage(project.id, {})
    await gameStorage.deleteGameStorage(project.id)
    useSettingsStore.setState({ loaded: false })
    await useSettingsStore.getState().load()
    await persistence.deleteProject(project.id)
    // Um perfil (o Estúdio Completo do kids) tem o banco dele, com a mesma regra.
    persistence.setStorageNamespace('perfil-invariante')
    await persistence.persistProject({ ...project, id: '01J0000000000000000000INVB' })
    await persistence.listAllProjects()

    const projectDb = fakeIdbTransactions().filter(isProjectDatabase)
    // Anti-vácuo: as operações de fato abriram leituras E escritas (inclusive a cópia das
    // preferências, que lê o banco antigo) e chegaram ao fim.
    expect(projectDb.length).toBeGreaterThan(20)
    expect(
      projectDb.filter((transaction) => transaction.mode === 'readonly').length,
    ).toBeGreaterThan(10)
    expect(
      projectDb.filter((transaction) => transaction.mode === 'readwrite').length,
    ).toBeGreaterThan(5)
    expect(
      projectDb.some((transaction) =>
        transaction.steps.some((step) => step.type === 'get' && step.key === 'sz:settings'),
      ),
    ).toBe(true)
    expect(projectDb.every((transaction) => transaction.outcome === 'complete')).toBe(true)
    expect(useSettingsStore.getState().theme).toBe('dark')

    expect(withoutExplicitCommit(projectDb)).toEqual([])
  })

  it('anti-vácuo: a régua acusa a transação em auto-commit (o jeito do idb-keyval)', async () => {
    resetFakeIdb()
    const store = fakeUseStore('sistema-zero-studio')

    // O `get` do idb-keyval: pede e devolve, sem commit; a transação só termina quando a
    // página processar o resultado.
    await store('readonly', (objectStore) => {
      objectStore.get('sz:project-meta:x')
    })

    expect(withoutExplicitCommit(fakeIdbTransactions())).toHaveLength(1)
  })
})

/** O que cada módulo do `src/` importa do idb-keyval, por arquivo (caminho relativo ao `src/`). */
function idbKeyvalImports(root: string): Record<string, string[]> {
  const found: Record<string, string[]> = {}
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(path)
        continue
      }
      if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) continue
      const source = readFileSync(path, 'utf8')
      const pattern = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]idb-keyval['"]/g
      for (const match of source.matchAll(pattern)) {
        const typeOnly = Boolean(match[1])
        const names = (match[2] ?? '')
          .split(',')
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => (typeOnly && !name.startsWith('type ') ? `type ${name}` : name))
        const file = relative(root, path).split(sep).join('/')
        found[file] = [...(found[file] ?? []), ...names].sort()
      }
    }
  }
  walk(root)
  return found
}

describe('ninguém lê nem grava o banco dos projetos pelo idb-keyval direto', () => {
  it('os imports do idb-keyval no src/ são exatamente estes', () => {
    // Quem chega aqui com um import novo: o banco dos projetos se lê e se grava pelo
    // `idbTransaction.ts` (`readValue`, `readValues`, `readAllKeys`, `writeInOneTransaction`).
    // O `get`/`set`/`update` do idb-keyval ficam em auto-commit, e é isso que a regra proíbe.
    expect(idbKeyvalImports(join(import.meta.dir, '..'))).toEqual({
      // Abre o banco (o store que só o `idbTransaction.ts` usa).
      'state/projectStorageRuntime.ts': ['createStore'],
      'state/idbTransaction.ts': ['type UseStore'],
      'testing/fakeIdbStore.ts': ['type UseStore'],
      // Bancos PRÓPRIOS, fora do banco dos projetos: a biblioteca pessoal do perfil e as
      // preferências do editor (que moravam no banco dos projetos até 11/09/2026).
      'asset-library/personal.ts': ['createStore', 'del', 'get', 'getMany', 'keys', 'set'],
      'state/settingsStore.ts': ['createStore', 'get', 'update'],
    })
  })
})
