/**
 * Medição sintética (19/08/2026): a lista "Meus Jogos" com CENTENAS de projetos —
 * quanto custa abrir (meta + thumbs) e digitar na busca. Registra os tempos e as
 * contagens de leitura no console (`[perf]`) e só ASSERTA corretude (cards,
 * resultado da busca): tempo nunca entra em `expect`. Mock de idb-keyval próprio
 * (registry global de mocks: um por arquivo).
 */
import { afterEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
const stats = { getMany: 0, getManyKeys: 0, keys: 0, get: 0 }
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
  get: async (key: IDBValidKey, store?: { name?: string }) => {
    stats.get += 1
    return kvOf(store).get(key)
  },
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    stats.getMany += 1
    stats.getManyKeys += keys.length
    return keys.map((key) => kvOf(store).get(key))
  },
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
  keys: async (store?: { name?: string }) => {
    stats.keys += 1
    return [...kvOf(store).keys()]
  },
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const { t, createEmptyProject } = await import('#core')
const { ProjectList } = await import('./ProjectList')
const { persistProject, writeProjectThumb } = await import('../state/persistence')

const PROJECTS = 500
/** Capa JPEG realista da lista (~15 KB de base64). */
const THUMB = `data:image/jpeg;base64,${'A'.repeat(15_000)}`

afterEach(() => {
  cleanup()
  dbs.clear()
})

function log(label: string, ms: number, extra: Record<string, unknown> = {}): void {
  console.log(`[perf] studio ${label}: ${ms.toFixed(0)}ms`, extra)
}

const cardButtons = (container: HTMLElement) =>
  container.querySelectorAll<HTMLButtonElement>('button[aria-label^="Abrir projeto "]')

describe('lista com centenas de projetos (medição)', () => {
  it(`${PROJECTS} projetos com capa: abre inteira e a busca acha um deles`, async () => {
    const seedStart = performance.now()
    for (let i = 0; i < PROJECTS; i += 1) {
      const id = `01J0000000000000000000${String(i).padStart(4, '0')}`.slice(-26)
      const project = createEmptyProject(id, `Jogo ${i}`)
      await persistProject(project)
      await writeProjectThumb(id, THUMB)
    }
    log('seed (persist + thumb)', performance.now() - seedStart)

    stats.getMany = 0
    stats.getManyKeys = 0
    stats.keys = 0
    stats.get = 0
    const renderStart = performance.now()
    const { container } = render(<ProjectList onOpenProject={() => {}} theme="light" />)
    await waitFor(
      () => {
        expect(cardButtons(container).length).toBe(PROJECTS)
      },
      { timeout: 60_000, interval: 50 },
    )
    log('abrir a lista até todos os cards', performance.now() - renderStart, {
      cards: PROJECTS,
      ...stats,
    })

    const searchStart = performance.now()
    fireEvent.change(screen.getByLabelText(t('projects.search')), {
      target: { value: 'Jogo 477' },
    })
    await waitFor(
      () => {
        expect(cardButtons(container).length).toBe(1)
      },
      { timeout: 30_000, interval: 20 },
    )
    log('busca até 1 resultado', performance.now() - searchStart)
    expect(cardButtons(container)[0]?.getAttribute('aria-label')).toContain('Jogo 477')
  }, 120_000)
})
