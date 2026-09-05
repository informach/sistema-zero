import { afterEach, describe, expect, mock, test } from 'bun:test'

mock.module('server-only', () => ({}))

const { createCreationsRoutes } = await import('../src/routes/creations')

/**
 * O apagar no R2 é AGENDADO para depois da resposta (`after()` do Next na vida real; aqui uma
 * fila injetada): a criança não espera a ida ao R2 a cada autosave, e o apagar só roda quando
 * o Next roda os callbacks. Fora do Next (`after` lança) o BFF cai no fallback e apaga em
 * seguida — coberto pelo `creations-routes.test.ts`.
 */
const afterQueue: Array<() => Promise<void>> = []
const deleted: string[] = []
const storage = {
  presignPut: async (input: { key: string }) => `https://r2.test/put/${input.key}`,
  presignGet: async (key: string) => `https://r2.test/get/${key}`,
  deleteObject: async (key: string) => {
    deleted.push(key)
  },
  deleteObjects: async (keys: readonly string[]) => {
    deleted.push(...keys)
  },
  headObject: async () => true,
}
const USER = {
  id: 'user-1',
  email: 'a@b.c',
  firstName: 'A',
  lastName: 'B',
  role: 'customer',
  status: 'active',
}
const SUMMARY = {
  tool: 'studio',
  itemId: 'proj-1',
  name: 'Nave',
  kind: 'classic',
  itemUpdatedAt: '2026-08-18T12:00:00.000Z',
  revision: 2,
  bytes: 10,
  thumb: null,
  syncedAt: '2026-08-18T12:00:01.000Z',
}
const routes = createCreationsRoutes({
  session: { getSession: async () => USER },
  members: {
    commitCreationUpload: async () => ({
      status: 200,
      body: {
        item: SUMMARY,
        previousStorageKey: 'creations/user-1/studio/proj-1/1.json.gz',
        releasedStorageKeys: ['creations/user-1/studio/proj-1/1.json.gz'],
      },
    }),
    deleteCreation: async () => ({
      status: 200,
      body: { deleted: true, storageKey: 'k/2', storageKeys: ['k/2', 'k/p.1.gz'], revision: 2 },
    }),
  },
  storage,
  defer: (task: () => Promise<void>) => {
    afterQueue.push(task)
  },
} as never)
const item = { params: Promise.resolve({ tool: 'studio', itemId: 'proj-1' }) }

afterEach(() => {
  afterQueue.length = 0
  deleted.length = 0
})

describe('BFF das criações — o apagar no R2 fica para DEPOIS da resposta', () => {
  test('commit: a resposta sai SEM apagar; o apagar roda quando o agendador roda (o `after()` do Next)', async () => {
    const res = await routes.creationsCommit.POST(
      new Request('https://x/api', { method: 'POST', body: JSON.stringify({ revision: 2 }) }),
      item,
    )
    expect(res.status).toBe(200)
    expect(deleted).toEqual([])
    expect(afterQueue).toHaveLength(1)
    await afterQueue[0]?.()
    expect(deleted).toEqual(['creations/user-1/studio/proj-1/1.json.gz'])
  })

  test('lixeira: idem (manifesto + partes em lote, depois da resposta)', async () => {
    const res = await routes.creationsDelete.DELETE(
      new Request('https://x/api', {
        method: 'DELETE',
        body: JSON.stringify({ baseRevision: 2 }),
      }),
      item,
    )
    expect(res.status).toBe(200)
    expect(deleted).toEqual([])
    await afterQueue[0]?.()
    expect(deleted).toEqual(['k/2', 'k/p.1.gz'])
  })
})
