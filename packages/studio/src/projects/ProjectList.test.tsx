import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen, waitFor } from '@testing-library/react'

/**
 * Fumaça da HOME do Estúdio ("Meus Jogos", padrão visual do Pinta): trava o
 * copy do cabeçalho E os nomes acessíveis que os specs e2e usam para entrar
 * ('+ Novo projeto', busca, ordenação). Arquivo próprio pelo mesmo motivo dos
 * irmãos: o mock de idb-keyval é por arquivo (registry global de mocks).
 */
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
  createStore: (dbName: string) => ({ name: dbName }),
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
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const { t } = await import('#core')
const { ProjectList } = await import('./ProjectList')

afterEach(() => {
  cleanup()
  dbs.clear()
})

describe('ProjectList — home "Meus Jogos" (padrão Pinta)', () => {
  it('abre com o cabeçalho novo e os nomes acessíveis dos e2e intactos', async () => {
    render(<ProjectList onOpenProject={() => {}} theme="light" />)
    // Copy do cabeçalho (decisão da usuária, imagem-modelo).
    expect(screen.getByRole('heading', { name: 'Meus Jogos' })).toBeTruthy()
    expect(screen.getByText('Dê vida aos seus jogos...')).toBeTruthy()
    expect(screen.getByRole('heading', { name: t('projects.title') })).toBeTruthy()
    // Nomes que os specs e2e usam para navegar — NÃO renomear.
    expect(screen.getByRole('button', { name: '+ Novo projeto' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Importar' })).toBeTruthy()
    expect(screen.getByLabelText(t('projects.sort'))).toBeTruthy()
    expect(screen.getByLabelText(t('projects.search'))).toBeTruthy()
    // Lista vazia carregada → estado de primeiro uso (sem exemplos p/ cliente).
    await waitFor(() => {
      expect(screen.getByText(t('projects.empty'))).toBeTruthy()
    })
  })
})
