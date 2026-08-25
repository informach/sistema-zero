import { describe, expect, test } from 'bun:test'
import { buildApp } from '../helpers'

const ACCOUNT = 'a0000000-0000-4000-8000-000000000001'
const PROFILE_A = 'b0000000-0000-4000-8000-000000000002'
const PROFILE_B = 'c0000000-0000-4000-8000-000000000003'

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()
const get = (app: App, path: string) => app.handle(new Request(`http://localhost${path}`))

const usageOf = async (app: App, profileIds: string[] = []) => {
  const qs = profileIds.length > 0 ? `?profileIds=${profileIds.join(',')}` : ''
  return readJson(await get(app, `/members/admin/members/${ACCOUNT}/tool-usage${qs}`))
}

describe('admin tool-usage — uso por ferramenta na ficha', () => {
  test('sem uso e com hub fora: zeros nas ferramentas locais, clube/mural = null (nunca 500)', async () => {
    const { app } = buildApp()
    const body = await usageOf(app, [PROFILE_A, PROFILE_B])
    expect(body.learners).toHaveLength(3)
    const account = body.learners[0]
    expect(account.userId).toBe(ACCOUNT)
    expect(account.pensa).toEqual({ projects: 0, cyclesCompleted: 0, lastActivityAt: null })
    expect(account.pinta).toEqual({ drawings: 0, deliveries: 0, lastActivityAt: null })
    expect(account.estudio).toEqual({ creations: 0, deliveries: 0, lastActivityAt: null })
    // Hub indisponível: null (≠ zero — o painel mostra "indisponível agora").
    expect(account.clube).toBeNull()
    expect(account.mural).toBeNull()
  })

  test('Pensa: projetos + ciclos concluídos + última atividade, por PERFIL', async () => {
    const { app, pensa } = buildApp()
    const base = {
      accountId: ACCOUNT,
      audience: 'kids' as const,
      kind: 'game' as const,
      status: 'active' as const,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
    }
    pensa.projects.set('p1', {
      ...base,
      id: 'p1',
      userId: PROFILE_A,
      name: 'Jogo do Robô',
      updatedAt: new Date('2026-06-02T10:00:00.000Z'),
    })
    pensa.projects.set('p2', {
      ...base,
      id: 'p2',
      userId: PROFILE_A,
      name: 'Jogo da Nave',
      updatedAt: new Date('2026-06-03T10:00:00.000Z'),
    })
    pensa.cycles.set('c1', {
      id: 'c1',
      projectId: 'p1',
      number: 1,
      goal: null,
      stage: 'done',
      zCompletedAt: null,
      eCompletedAt: null,
      rCompletedAt: null,
      oCompletedAt: null,
      createdAt: base.createdAt,
      updatedAt: base.createdAt,
    })

    const body = await usageOf(app, [PROFILE_A, PROFILE_B])
    const a = body.learners.find((l: { userId: string }) => l.userId === PROFILE_A)
    expect(a.pensa.projects).toBe(2)
    expect(a.pensa.cyclesCompleted).toBe(1)
    expect(a.pensa.lastActivityAt).toBe('2026-06-03T10:00:00.000Z')
    // O irmão B não herda nada.
    const b = body.learners.find((l: { userId: string }) => l.userId === PROFILE_B)
    expect(b.pensa.projects).toBe(0)
  })

  test('criações na nuvem: só vivas E confirmadas contam; ferramenta certa', async () => {
    const { app, creations } = buildApp()
    const record = (over: Record<string, unknown>) => ({
      id: crypto.randomUUID(),
      userId: PROFILE_A,
      accountId: ACCOUNT,
      tool: 'pinta' as const,
      itemId: String(over.itemId ?? 'i1'),
      name: 'Desenho',
      kind: 'pixel-sprite',
      itemUpdatedAt: new Date('2026-06-02T09:00:00.000Z'),
      revision: 1,
      bytes: 100,
      thumb: null,
      syncedAt: new Date('2026-06-02T09:00:01.000Z'),
      pending: null,
      lastReservedRevision: 1,
      storageRef: 'r2ugc:x',
      parts: [],
      deletedAt: null,
      createdAt: new Date('2026-06-01T09:00:00.000Z'),
      ...over,
    })
    creations.rows.set('k1', record({ itemId: 'i1' }))
    creations.rows.set('k2', record({ itemId: 'i2', itemUpdatedAt: new Date('2026-06-05') }))
    // Apagada (lixeira) e reservada-nunca-confirmada NÃO contam.
    creations.rows.set('k3', record({ itemId: 'i3', deletedAt: new Date('2026-06-06') }))
    creations.rows.set('k4', record({ itemId: 'i4', storageRef: null }))
    // Outra ferramenta não vaza.
    creations.rows.set('k5', record({ itemId: 'i5', tool: 'studio' }))

    const body = await usageOf(app, [PROFILE_A])
    const a = body.learners.find((l: { userId: string }) => l.userId === PROFILE_A)
    expect(a.pinta.drawings).toBe(2)
    expect(a.pinta.lastActivityAt).toBe('2026-06-05T00:00:00.000Z')
    expect(a.estudio.creations).toBe(1)
  })

  test('hub disponível: clube/mural preenchidos por autor; sem atividade = zeros', async () => {
    const { app, hubActivityByAuthors } = buildApp()
    hubActivityByAuthors.items = [
      {
        authorId: PROFILE_A,
        clubThreads: 3,
        clubComments: 5,
        lastClubActivityAt: '2026-06-04T12:00:00.000Z',
        showcasePublished: 2,
        showcasePlays: 41,
        lastShowcaseAt: '2026-06-03T12:00:00.000Z',
      },
    ]
    const body = await usageOf(app, [PROFILE_A, PROFILE_B])
    const a = body.learners.find((l: { userId: string }) => l.userId === PROFILE_A)
    expect(a.clube).toEqual({
      posts: 3,
      comments: 5,
      lastActivityAt: '2026-06-04T12:00:00.000Z',
    })
    expect(a.mural).toEqual({
      published: 2,
      plays: 41,
      lastPublishedAt: '2026-06-03T12:00:00.000Z',
    })
    // B não tem atividade: hub VIVO → zeros (≠ null).
    const b = body.learners.find((l: { userId: string }) => l.userId === PROFILE_B)
    expect(b.clube).toEqual({ posts: 0, comments: 0, lastActivityAt: null })
  })

  test('userId com formato inválido → 400 (uuid validado na borda)', async () => {
    const { app } = buildApp()
    const res = await get(app, '/members/admin/members/nao-e-uuid/tool-usage')
    expect(res.status).toBe(400)
  })
})
