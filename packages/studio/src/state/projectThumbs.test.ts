import { afterAll, describe, expect, it, mock } from 'bun:test'

// Mock FUNCIONAL de idb-keyval (Map único): estes testes precisam ler de volta
// o que gravaram (o no-op padrão dos outros arquivos não serve aqui). O registry
// de mocks é GLOBAL à suíte e o mock.module troca o binding VIVO — por isso o
// afterAll abaixo re-registra o no-op padrão (senão os arquivos seguintes leem
// o estado deste Map e falham; ver gotcha em BlocksMode.test.tsx).
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

const { listAllProjects, MAX_PROJECT_THUMB_CHARS, writeProjectThumb } = await import(
  './persistence'
)

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

const meta = (id: string, name: string) => ({
  id,
  name,
  createdAt: 1,
  updatedAt: 2,
  mode: 'blocks',
})

describe('miniaturas de projeto (partição sz:project-thumb:)', () => {
  it('só grava com o meta existente (delete concorrente não ressuscita órfão) e a lista anexa', async () => {
    db.clear()
    await writeProjectThumb('p1', 'data:image/jpeg;base64,AAA')
    expect(db.has('sz:project-thumb:p1')).toBe(false)

    db.set('sz:project-meta:p1', meta('p1', 'Jogo'))
    await writeProjectThumb('p1', 'data:image/jpeg;base64,AAA')
    const list = await listAllProjects()
    expect(list[0]?.thumbDataUrl).toBe('data:image/jpeg;base64,AAA')
  })

  it('recusa data URL que não é imagem ou acima do teto', async () => {
    db.clear()
    db.set('sz:project-meta:p2', meta('p2', 'Jogo 2'))
    await writeProjectThumb('p2', 'data:text/html;base64,AAA')
    await writeProjectThumb('p2', `data:image/png;base64,${'A'.repeat(MAX_PROJECT_THUMB_CHARS)}`)
    expect(db.has('sz:project-thumb:p2')).toBe(false)
    const list = await listAllProjects()
    expect(list[0]?.thumbDataUrl).toBeUndefined()
  })
})
