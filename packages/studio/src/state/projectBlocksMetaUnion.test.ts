import { afterAll, beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock FUNCIONAL de idb-keyval (Map único): o teste precisa que a leitura da
// partição de blocos E do meta devolvam registros reais. O registry de mocks é
// GLOBAL à suíte — o afterAll re-registra o no-op padrão (gotcha do
// projectThumbs.test.ts / BlocksMode.test.tsx).
const db = new Map<string, unknown>()
mock.module('idb-keyval', () => ({
  createStore: mock(() => ({ name: 'test-store' })),
  del: mock(async (k: string) => {
    db.delete(k)
  }),
  delMany: mock(async (ks: string[]) => {
    for (const k of ks) db.delete(k)
  }),
  get: mock(async (k: string) => db.get(k)),
  getMany: mock(async (ks: string[]) => ks.map((k) => db.get(k))),
  keys: mock(async () => [...db.keys()]),
  set: mock(async (k: string, v: unknown) => {
    db.set(k, v)
  }),
  setMany: mock(async (pairs: Array<[string, unknown]>) => {
    for (const [k, v] of pairs) db.set(k, v)
  }),
  update: mock(async () => undefined),
}))

const { loadSanitizedProjectBlocksStateById } = await import('./projectStore')

afterAll(() => {
  // Devolve o no-op padrão da suíte (mesma forma de persistence.test.ts).
  mock.module('idb-keyval', () => ({
    createStore: mock(() => ({ name: 'test-store' })),
    del: mock(async () => undefined),
    delMany: mock(async () => undefined),
    get: mock(async (): Promise<unknown> => undefined),
    getMany: mock(async (ks: unknown[]): Promise<unknown[]> => ks.map(() => undefined)),
    keys: mock(async (): Promise<unknown[]> => []),
    set: mock(async () => undefined),
    setMany: mock(async () => undefined),
    update: mock(async () => undefined),
  }))
})

// Bloco de EXTENSÃO (game-2d) na partição: fora da allowlist do núcleo, o
// sanitize tudo-ou-nada descarta o estado INTEIRO se avaliado sem a extensão.
const g2dBlocksState = {
  blocks: {
    languageVersion: 0,
    blocks: [{ type: 'sz_g2d_update_each_frame', x: 40, y: 40 }],
  },
}
const game2d = { id: 'game-2d', version: '0.20.0', installedAt: 1 }

describe('loadSanitizedProjectBlocksStateById — união com as extensões do META', () => {
  beforeEach(() => {
    db.clear()
    db.set('sz:project-blocks:p1', { id: 'p1', blocksState: g2dBlocksState })
  })

  it('caller com lista VAZIA: as extensões do meta persistido salvam o estado', async () => {
    db.set('sz:project-meta:p1', { id: 'p1', name: 'Jogo', installedExtensions: [game2d] })
    // Regressão do "jogo abre sem blocos": uma lista defasada/vazia do chamador
    // avaliaria os blocos g2d contra a allowlist só-núcleo → descarte total.
    expect(await loadSanitizedProjectBlocksStateById('p1', [])).toEqual(g2dBlocksState)
  })

  it('sem meta E sem extensões do caller, o tudo-ou-nada segue valendo (descarta)', async () => {
    expect(await loadSanitizedProjectBlocksStateById('p1', [])).toBeNull()
  })

  it('extensões do caller continuam bastando sozinhas (meta ausente)', async () => {
    expect(await loadSanitizedProjectBlocksStateById('p1', [game2d])).toEqual(g2dBlocksState)
  })

  it('meta legado (doc único sz:project:) também alimenta a união', async () => {
    db.set('sz:project:p1', { id: 'p1', name: 'Jogo', installedExtensions: [game2d] })
    expect(await loadSanitizedProjectBlocksStateById('p1', [])).toEqual(g2dBlocksState)
  })
})
