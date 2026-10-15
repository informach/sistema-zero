import { afterEach, describe, expect, mock, spyOn, test } from 'bun:test'
import {
  createPensaJourney,
  type PensaJourneyTeam,
  type PensaJourneyView,
  type PensaProposal,
} from '@sistemazero/core/pensa'
import { MOLDA_TOOL_FAMILIES } from '@sistemazero/molda/tools'
import type {
  CreationDownloadTicketView,
  CreationSummaryView,
  PensaTeamCapabilitiesView,
  SessionUser,
} from '../src/lib/types'
import type { MembersClient } from '../src/server/clients'
import type { SessionModule } from '../src/server/session'

mock.module('server-only', () => ({}))
const { createPensaJourneyRoutes } = await import('../src/routes/pensa-journey')
const { loadJourneyContext } = await import('../src/server/pensa-journey/context')
const { JourneyChildError } = await import('../src/server/pensa-journey/errors')

/**
 * A equipe no Pensa v2 (14/10/2026), lado do BFF: as rotas novas (join devolvendo o plano, equipe,
 * funções, código, saída, artes da equipe com a descida assinada), a trava de quem programa nas
 * ações que usam o jogo do Estúdio, e o snapshot de recursos montado das DUAS pessoas (o Estúdio
 * de quem programa, as artes de quem desenha) sem ler os recursos da sessão.
 */
const PROJECT = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e01'
const TASK = '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e07'
const LEO = '1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8'
const BIA = '4fa0e474-1f0d-4a52-9a6a-3f2b8c85e010'
const STAGE = 'sz_g2d_setup_stage'
const KEY = 'sz_g2d_on_key'

const restorers: Array<() => void> = []
afterEach(() => {
  for (const restore of restorers.splice(0)) restore()
})
function quietConsole() {
  const error = spyOn(console, 'error').mockImplementation(() => undefined)
  restorers.push(() => error.mockRestore())
  return error
}

const student = (id: string, extra: Record<string, unknown> = {}) =>
  ({ id, role: 'student', kids: { kind: 'student' }, ...extra }) as unknown as SessionUser

function team(overrides: Partial<PensaJourneyTeam> = {}): PensaJourneyTeam {
  return {
    viewerProfileId: BIA,
    ownerProfileId: LEO,
    memberCount: 1,
    shareEnabled: true,
    roles: { code: LEO, art: [BIA] },
    ...overrides,
  }
}

function view(withTeam: PensaJourneyTeam | null = team()): PensaJourneyView {
  return {
    project: { id: PROJECT, name: 'Ninho', status: 'active' },
    journey: { ...createPensaJourney(PROJECT, 'cycle', '2026-10-14T12:00:00Z'), revision: 3 },
    cycles: [],
    operation: null,
    ...(withTeam ? { role: 'member' as const, team: withTeam } : {}),
  }
}

/** Uma leitura que, em equipe, NÃO pode acontecer: os recursos são os da equipe. */
const forbidden = (name: string) =>
  mock(async (..._args: unknown[]): Promise<never> => {
    throw new Error(`${name} não devia ser lido`)
  })

function routes(
  members: Record<string, unknown>,
  user: SessionUser = student(BIA),
  presignGet = mock(
    async (key: string, opts?: { expiresInSeconds?: number; responseContentType?: string }) =>
      `https://r2.test/${key}?ttl=${opts?.expiresInSeconds}&type=${opts?.responseContentType}`,
  ),
) {
  const created = createPensaJourneyRoutes({
    members: { pensaJourneyGet: async () => ({ status: 200, body: view() }), ...members } as never,
    session: { getSession: async () => user } as unknown as SessionModule,
    storage: { presignGet },
  })
  const call = (
    method: string,
    path: string[],
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    (created.pensaJourney as Record<string, (req: Request, ctx: unknown) => Promise<Response>>)[
      method
    ]!(
      new Request(`https://kids.test/api/pensa/v2/${path.join('/')}`, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }),
      { params: Promise.resolve({ path }) },
    )
  return { created, call, presignGet }
}
const json = async (res: Response) => (await res.json()) as any

describe('entrar pelo código: o v2 abre o jogo direto', () => {
  test('o corpo é validado aqui e o código vai como a criança digitou', async () => {
    const join = mock(async (_body: { code: string }) => ({
      status: 200,
      body: { project: { id: PROJECT, name: 'Ninho', role: 'member' } },
    }))
    const { call } = routes({
      pensaJoinProject: join,
      getGamification: async () => ({ status: 200, body: { level: { slug: 'hacker' } } }),
    })
    expect((await call('POST', ['projects', 'join'], { code: 'ab' })).status).toBe(400)
    expect((await call('POST', ['projects', 'join'], { code: 'ZAP-7K3Q', x: 1 })).status).toBe(400)
    expect(join).not.toHaveBeenCalled()
    const res = await call('POST', ['projects', 'join'], { code: ' zap-7k3q m2 ' })
    expect(res.status).toBe(200)
    // Só o id: a view clássica do projeto não viaja para o JourneyApp.
    expect(await json(res)).toEqual({ projectId: PROJECT })
    expect(join.mock.calls[0]?.[0]).toEqual({ code: 'zap-7k3q m2' })
  })

  test('a recusa do members atravessa inteira; abaixo de Inventor(a) nem chega lá', async () => {
    const message = 'Esse código não abriu nenhum plano. Confira com quem te chamou.'
    const join = mock(async () => ({
      status: 404,
      body: { error: { code: 'PENSA_INVITE_INVALID', message } },
    }))
    const level = { slug: 'hacker' }
    const { call } = routes({
      pensaJoinProject: join,
      getGamification: async () => ({ status: 200, body: { level } }),
    })
    const refused = await call('POST', ['projects', 'join'], { code: 'ZAP-7K3QM2' })
    expect(refused.status).toBe(404)
    expect((await json(refused)).error.message).toBe(message)
    level.slug = 'coder'
    const early = await call('POST', ['projects', 'join'], { code: 'ZAP-7K3QM2' })
    expect(early.status).toBe(403)
    expect(join).toHaveBeenCalledTimes(1)
    expect((await call('GET', ['projects', 'join'])).status).toBe(405)
  })

  test('resposta sem o plano não vira um projectId inventado', async () => {
    quietConsole()
    const { call } = routes({
      pensaJoinProject: async () => ({ status: 200, body: { project: { id: 'nao-e-uuid' } } }),
      getGamification: async () => ({ status: 200, body: { level: { slug: 'hacker' } } }),
    })
    expect((await call('POST', ['projects', 'join'], { code: 'ZAP-7K3QM2' })).status).toBe(502)
  })
})

describe('as rotas da equipe', () => {
  test('equipe, código, artes e saída chamam os clientes certos com o plano', async () => {
    const calls: unknown[][] = []
    const spy =
      (name: string, status = 200) =>
      async (...args: unknown[]) => {
        calls.push([name, ...args])
        return { status, body: { ok: true } }
      }
    const { call } = routes({
      pensaJourneyTeam: spy('team'),
      pensaShareProject: spy('share'),
      pensaUnshareProject: spy('unshare'),
      pensaRemoveProjectMember: spy('remove'),
      pensaJourneyTeamArt: spy('team-art'),
    })
    expect((await call('GET', ['projects', PROJECT, 'team'])).status).toBe(200)
    expect((await call('POST', ['projects', PROJECT, 'share'])).status).toBe(200)
    expect((await call('DELETE', ['projects', PROJECT, 'share'])).status).toBe(200)
    expect((await call('DELETE', ['projects', PROJECT, 'members', 'me'])).status).toBe(200)
    expect((await call('DELETE', ['projects', PROJECT, 'members', LEO])).status).toBe(200)
    expect((await call('GET', ['projects', PROJECT, 'team-art'])).status).toBe(200)
    expect(calls).toEqual([
      ['team', PROJECT],
      ['share', PROJECT],
      ['unshare', PROJECT],
      ['remove', PROJECT, 'me'],
      ['remove', PROJECT, LEO],
      ['team-art', PROJECT],
    ])
  })

  test('ids que não são uuid, caminhos tortos e método errado não chegam ao members', async () => {
    const reached = mock(async () => ({ status: 200, body: {} }))
    const { call } = routes({
      pensaJourneyTeam: reached,
      pensaRemoveProjectMember: reached,
      pensaJourneyTeamArtDownload: reached,
      pensaShareProject: reached,
      pensaJourneyRoles: reached,
    })
    expect((await call('DELETE', ['projects', PROJECT, 'members', 'bia'])).status).toBe(404)
    expect((await call('GET', ['projects', 'nao-e-uuid', 'team'])).status).toBe(404)
    expect((await call('GET', ['projects', PROJECT, 'team-art', 'x', 'download'])).status).toBe(404)
    expect((await call('GET', ['projects', PROJECT, 'team-art', TASK])).status).toBe(404)
    expect(
      (await call('GET', ['projects', PROJECT, 'team-art', TASK, 'download', 'mais'])).status,
    ).toBe(404)
    expect((await call('GET', ['projects', PROJECT, 'team', 'extra'])).status).toBe(404)
    expect((await call('PUT', ['projects', PROJECT, 'share'])).status).toBe(405)
    expect(
      (await call('POST', ['projects', PROJECT, 'roles'], { code: LEO, art: [] })).status,
    ).toBe(405)
    expect((await call('GET', ['projects', PROJECT, 'members', LEO])).status).toBe(405)
    expect(reached).not.toHaveBeenCalled()
  })

  test('PUT das funções: Zod estrito, uuid em cada id, até 6 nas artes', async () => {
    const roles = mock(async (_id: string, _body: unknown) => ({ status: 200, body: view() }))
    const { created, call } = routes({ pensaJourneyRoles: roles })
    expect(typeof created.pensaJourney.PUT).toBe('function')
    const path = ['projects', PROJECT, 'roles']
    for (const bad of [
      { code: LEO },
      { code: 'leo', art: [] },
      { code: LEO, art: ['bia'] },
      { code: LEO, art: [BIA], extra: true },
      { code: LEO, art: Array.from({ length: 7 }, () => BIA) },
    ])
      expect((await call('PUT', path, bad)).status).toBe(400)
    expect(roles).not.toHaveBeenCalled()
    const res = await call('PUT', path, { code: BIA, art: [LEO] })
    expect(res.status).toBe(200)
    expect(roles.mock.calls[0]).toEqual([PROJECT, { code: BIA, art: [LEO] }])
  })

  test('sessão de suporte só lê; aba de outro perfil é recusada', async () => {
    const write = mock(async () => ({ status: 200, body: {} }))
    const read = mock(async () => ({ status: 200, body: { people: [] } }))
    const { call } = routes(
      { pensaJourneyRoles: write, pensaShareProject: write, pensaJourneyTeam: read },
      student(BIA, { act: { mode: 'readonly' } }),
    )
    const res = await call('PUT', ['projects', PROJECT, 'roles'], { code: LEO, art: [] })
    expect(res.status).toBe(403)
    expect((await json(res)).error.code).toBe('IMPERSONATION_READONLY')
    expect((await call('POST', ['projects', PROJECT, 'share'])).status).toBe(403)
    expect(write).not.toHaveBeenCalled()
    expect((await call('GET', ['projects', PROJECT, 'team'])).status).toBe(200)

    const other = routes({ pensaJourneyTeam: read })
    const mismatch = await other.call('GET', ['projects', PROJECT, 'team'], undefined, {
      'x-sz-viewer': LEO,
    })
    expect(mismatch.status).toBe(409)
    expect((await json(mismatch)).error.code).toBe('VIEWER_MISMATCH')
  })
})

describe('Trazer da equipe: a descida assinada', () => {
  const summary: CreationSummaryView = {
    formatVersion: 1,
    tool: 'pinta',
    itemId: 'heroi-123456',
    name: 'Herói',
    kind: 'pixel-sprite',
    itemUpdatedAt: '2026-10-14T12:00:00.000Z',
    revision: 3,
    bytes: 2048,
    thumb: null,
    syncedAt: '2026-10-14T12:00:01.000Z',
  }
  const ticket: CreationDownloadTicketView = {
    storageKey: `creations/${LEO}/pinta/heroi-123456/3.json.gz`,
    revision: 3,
    bytes: 2048,
    summary,
    parts: [{ hash: 'a'.repeat(64), bytes: 512, storageKey: `creations/${LEO}/parts/a` }],
  }

  test('o bilhete do members vira as URLs do R2 UGC, com os TTLs do Guardado na conta', async () => {
    const download = mock(async (_project: string, _task: string) => ({
      status: 200,
      body: ticket,
    }))
    const { call, presignGet } = routes({ pensaJourneyTeamArtDownload: download })
    const res = await call('GET', ['projects', PROJECT, 'team-art', TASK, 'download'])
    expect(res.status).toBe(200)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(download.mock.calls[0]).toEqual([PROJECT, TASK])
    const body = await json(res)
    expect(Object.keys(body).sort()).toEqual(
      ['bytes', 'downloadUrl', 'item', 'parts', 'revision', 'serverNow'].sort(),
    )
    expect(body.downloadUrl).toBe(
      `https://r2.test/${ticket.storageKey}?ttl=300&type=application/gzip`,
    )
    expect(body.parts).toEqual([
      {
        hash: 'a'.repeat(64),
        bytes: 512,
        url: `https://r2.test/creations/${LEO}/parts/a?ttl=600&type=application/gzip`,
      },
    ])
    expect(body.item).toEqual(summary)
    expect(body.revision).toBe(3)
    expect(Number.isFinite(Date.parse(body.serverNow))).toBe(true)
    expect(presignGet).toHaveBeenCalledTimes(2)
  })

  test('sem a autorização do members, nada é assinado', async () => {
    const { call, presignGet } = routes({
      pensaJourneyTeamArtDownload: async () => ({
        status: 404,
        body: { error: { code: 'NOT_FOUND', message: 'Arte não encontrada.' } },
      }),
    })
    const res = await call('GET', ['projects', PROJECT, 'team-art', TASK, 'download'])
    expect(res.status).toBe(404)
    expect(presignGet).not.toHaveBeenCalled()
  })

  test('falha ao assinar vai ao log só com o nome do erro', async () => {
    const error = quietConsole()
    const { call } = routes(
      { pensaJourneyTeamArtDownload: async () => ({ status: 200, body: ticket }) },
      student(BIA),
      mock(async () => {
        throw new TypeError(`segredo ${ticket.storageKey}`)
      }),
    )
    const res = await call('GET', ['projects', PROJECT, 'team-art', TASK, 'download'])
    expect(res.status).toBe(503)
    const logged = JSON.stringify(error.mock.calls)
    expect(logged).toContain('"name":"TypeError"')
    expect(logged).not.toContain('segredo')
  })
})

describe('só quem programa testa e guarda as versões', () => {
  const bodies: Record<string, Record<string, unknown>> = {
    test: { expectedRevision: 3, id: TASK, result: 'met' },
    close: { expectedRevision: 3, reason: 'met' },
    increment: { expectedRevision: 3 },
    restore: { expectedRevision: 3, checkpointId: TASK },
    revise: { expectedRevision: 3 },
  }

  test.each(Object.keys(bodies))('%s: quem faz as artes recebe 403 com a frase', async (action) => {
    const untouched = {
      getCreationDownload: forbidden('o jogo salvo'),
      pensaJourneyProtect: forbidden('a proteção'),
      pensaJourneyCommand: forbidden('o comando'),
      pensaJourneyCancel: forbidden('o cancelamento'),
    }
    const { call } = routes(untouched)
    const res = await call('POST', ['projects', PROJECT, action], bodies[action])
    expect(res.status).toBe(403)
    expect((await json(res)).error).toEqual({
      code: 'PENSA_NOT_PROGRAMMER',
      message: 'Quem testa e guarda as versões é quem programa o jogo.',
    })
    for (const fn of Object.values(untouched)) expect(fn).not.toHaveBeenCalled()
  })

  test('quem programa segue; plano de servidor anterior à equipe também', async () => {
    const protect = mock(async () => ({ status: 200, body: view() }))
    const leo = routes({ pensaJourneyProtect: protect }, student(LEO))
    expect(
      (await leo.call('POST', ['projects', PROJECT, 'increment'], bodies.increment)).status,
    ).toBe(200)
    const legacy = routes({
      pensaJourneyGet: async () => ({ status: 200, body: view(null) }),
      pensaJourneyProtect: protect,
    })
    expect(
      (await legacy.call('POST', ['projects', PROJECT, 'increment'], bodies.increment)).status,
    ).toBe(200)
    expect(protect).toHaveBeenCalledTimes(2)
  })
})

// ── O snapshot de recursos do plano em equipe ──────────────────────────────────────────────

function summaryOf(tool: 'pinta' | 'molda', itemId: string, kind: string): CreationSummaryView {
  return {
    formatVersion: 1,
    tool,
    itemId,
    name: `Criação ${itemId}`,
    kind,
    itemUpdatedAt: '2026-10-14T12:00:00.000Z',
    revision: 1,
    bytes: 100,
    thumb: null,
    syncedAt: '2026-10-14T12:00:01.000Z',
    deletedAt: null,
  }
}

/** Leo programa (posto Inventor, dois blocos, Estúdio e Pinta); Bia (a sessão) faz as artes. */
function capabilities(
  overrides: { code?: Partial<PensaTeamCapabilitiesView['code']> } & {
    art?: PensaTeamCapabilitiesView['art']
  } = {},
): PensaTeamCapabilitiesView {
  return {
    code: {
      profileId: LEO,
      level: 'hacker',
      blocks: [STAGE, KEY],
      access: { studio: true, pinta: true, molda: false },
      creations: {
        pinta: [summaryOf('pinta', 'leo-gato-1234', 'pixel-sprite')],
        // Leo não tem o Molda: o modelo guardado não pode entrar no plano pelo Estúdio dele.
        molda: [summaryOf('molda', 'leo-nave-1234', 'model')],
      },
      ...overrides.code,
    },
    art: overrides.art ?? [
      { profileId: BIA, level: 'architect', access: { pinta: true, molda: true } },
    ],
  }
}

function teamMembers(
  caps: { status: number; body: PensaTeamCapabilitiesView | null },
  current: PensaJourneyView = view(),
) {
  const own = {
    getGamificationReadonly: forbidden('o posto da sessão'),
    getStudioUnlocksReadonly: forbidden('os blocos da sessão'),
    checkCreativeToolsAccessReadonly: forbidden('a posse da sessão'),
    listCreationsReadonly: forbidden('o inventário da sessão'),
  }
  const teamCaps = mock(async (_id: string) => caps)
  const journeyGet = mock(async (_id: string) => ({ status: 200, body: current }))
  const client = {
    ...own,
    zappyKnowledgeSearch: async () => ({ status: 200, body: { hits: [] } }),
    pensaJourneyGet: journeyGet,
    pensaJourneyTeamCapabilities: teamCaps,
  }
  return { client: client as unknown as MembersClient, own, teamCaps, journeyGet }
}

describe('o contexto do plano em equipe', () => {
  test('o snapshot sai das DUAS pessoas: o Estúdio de quem programa e as artes de quem desenha', async () => {
    const { client, own, teamCaps } = teamMembers({ status: 200, body: capabilities() })
    const bia = student(BIA)
    const context = await loadJourneyContext(client, bia, 'Um gato na lua', {
      projectId: PROJECT,
      view: view(),
    })
    expect(teamCaps.mock.calls[0]?.[0]).toBe(PROJECT)
    for (const fn of Object.values(own)) expect(fn).not.toHaveBeenCalled()
    const caps = context.capabilities
    // O perfil é sempre o da sessão (o members confere com o ator).
    expect(caps.profileId).toBe(BIA)
    // Estúdio, posto e paleta: de quem programa.
    expect(caps.rank).toBe('hacker')
    expect(caps.studio).toBe(true)
    expect(caps.blockIds).toEqual([KEY, STAGE].sort())
    expect(caps.extensionIds).toEqual(['game-2d'])
    expect(caps.dimensions).toEqual(['2d'])
    // Pinta e Molda: de quem faz as artes, pelas faixas do posto DELA (Arquiteta: básico e intermediário).
    expect(caps.pinta).toBe(true)
    expect(caps.molda).toBe(true)
    expect(caps.moldaTools).toEqual(
      MOLDA_TOOL_FAMILIES.filter((tool) => tool.band !== 'professional').map((tool) => tool.id),
    )
    // Inventário: o de quem programa, com a posse DELE (sem Molda, o modelo fica de fora).
    expect(context.existingCreations).toEqual([
      { id: 'leo-gato-1234', name: 'Criação leo-gato-1234', kind: 'sprite', tool: 'pinta' },
    ])
    expect(context.team).toBe(true)
  })

  test('sem ninguém nas artes com o Molda, não há Molda; o passe da equipe não vaza para os outros', async () => {
    const { client } = teamMembers({
      status: 200,
      body: capabilities({
        // A sessão é da EQUIPE e faz as artes; outra artista não tem posse nenhuma.
        art: [
          { profileId: BIA, level: null, access: { pinta: false, molda: false } },
          {
            profileId: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
            level: 'god',
            access: { pinta: false, molda: false },
          },
        ],
      }),
    })
    const staff = student(BIA, { role: 'staff' })
    const context = await loadJourneyContext(client, staff, 'Gato', { projectId: PROJECT })
    // O passe livre vale para a própria sessão (as artes dela), nunca para quem programa.
    expect(context.capabilities.pinta).toBe(true)
    expect(context.capabilities.molda).toBe(true)
    expect(context.capabilities.moldaTools).toEqual(MOLDA_TOOL_FAMILIES.map((tool) => tool.id))
    expect(context.capabilities.blockIds).toEqual([KEY, STAGE].sort())
    expect(context.capabilities.extensionIds).toEqual(['game-2d'])

    const nobody = teamMembers({
      status: 200,
      body: capabilities({
        art: [{ profileId: LEO, level: 'hacker', access: { pinta: true, molda: false } }],
      }),
    })
    const solo = await loadJourneyContext(nobody.client, student(BIA), 'Gato', {
      projectId: PROJECT,
    })
    expect(solo.capabilities.molda).toBe(false)
    expect(solo.capabilities.moldaTools).toEqual([])
    expect(solo.moldaToolFamilies).toEqual([])
  })

  test('falha ao ler a equipe é a frase da criança; o nome do erro vai ao log', async () => {
    const error = quietConsole()
    const unavailable = teamMembers({ status: 503, body: null })
    await expect(
      loadJourneyContext(unavailable.client, student(BIA), 'Gato', { projectId: PROJECT }),
    ).rejects.toThrow(
      new JourneyChildError('Não consegui conferir os recursos da equipe. Tente de novo.'),
    )
    const broken = teamMembers({ status: 200, body: capabilities() })
    broken.journeyGet.mockImplementation(async () => {
      throw new TypeError('fetch failed')
    })
    const failure = await loadJourneyContext(broken.client, student(BIA), 'Gato', {
      projectId: PROJECT,
    }).catch((cause: unknown) => cause)
    expect(failure).toBeInstanceOf(JourneyChildError)
    expect(JSON.stringify(error.mock.calls)).toContain('"name":"TypeError"')
    const noLevel = teamMembers({ status: 200, body: capabilities({ code: { level: null } }) })
    await expect(
      loadJourneyContext(noLevel.client, student(BIA), 'Gato', { projectId: PROJECT }),
    ).rejects.toThrow('Não consegui conferir os recursos da equipe. Tente de novo.')
  })

  test('plano solo continua igual: os recursos são os da sessão, sem ler a equipe', async () => {
    const solo = {
      getGamificationReadonly: async () => ({ status: 200, body: { level: { slug: 'god' } } }),
      getStudioUnlocksReadonly: async () => ({ status: 200, body: { blocks: [STAGE, KEY] } }),
      checkCreativeToolsAccessReadonly: async () => ({
        status: 200,
        body: { access: { 'estudio-completo': true, pinta: true, molda: true } },
      }),
      listCreationsReadonly: async () => ({ status: 200, body: { items: [] } }),
      zappyKnowledgeSearch: async () => ({ status: 200, body: { hits: [] } }),
      pensaJourneyGet: mock(async () => ({ status: 200, body: view(team({ memberCount: 0 })) })),
      pensaJourneyTeamCapabilities: forbidden('a equipe'),
    }
    const client = solo as unknown as MembersClient
    const user = student(BIA)
    const plain = await loadJourneyContext(client, user, 'Gato')
    const withView = await loadJourneyContext(client, user, 'Gato', {
      projectId: PROJECT,
      view: view(team({ memberCount: 0 })),
    })
    const read = await loadJourneyContext(client, user, 'Gato', { projectId: PROJECT })
    const legacy = await loadJourneyContext(client, user, 'Gato', {
      projectId: PROJECT,
      view: view(null),
    })
    for (const context of [withView, read, legacy]) {
      expect(context.capabilities).toEqual(plain.capabilities)
      expect(context.team).toBe(false)
    }
    expect(plain.capabilities.rank).toBe('god')
    expect(solo.pensaJourneyGet).toHaveBeenCalledTimes(1)
    expect(solo.pensaJourneyTeamCapabilities).not.toHaveBeenCalled()
  })
})

describe('aceitar em equipe confere a proposta contra os recursos da EQUIPE', () => {
  const proposal = {
    id: '0f5c2a8e-7d3b-4c1a-9e6f-2b8d4a6c1e06',
    dimension: '2d',
    missions: [
      {
        key: 'heroi',
        destination: 'pinta',
        title: 'Desenhar o herói',
        result: 'O herói existe',
        dependencies: [],
        blockIds: [],
        extensionIds: [],
        mechanicIds: [],
        toolIds: [],
        asset: {
          id: 'heroi',
          kind: 'sprite',
          source: 'new',
          creationId: null,
          description: 'Um gato astronauta',
        },
      },
      {
        key: 'walk',
        destination: 'studio',
        title: 'O herói anda',
        result: 'O gato anda',
        dependencies: ['heroi'],
        blockIds: [STAGE],
        extensionIds: ['game-2d'],
        mechanicIds: ['game-2d'],
        toolIds: [],
        asset: null,
      },
    ],
  } as unknown as PensaProposal

  function withProposal() {
    const current = view()
    current.journey = { ...current.journey, stage: 'proposal', proposal }
    return current
  }
  const accept = {
    expectedRevision: 3,
    command: { type: 'accept', proposalId: proposal.id },
  }

  test('a proposta com arte da Bia e o Estúdio do Leo passa sem ler os recursos da sessão', async () => {
    const current = withProposal()
    const { client, own } = teamMembers({ status: 200, body: capabilities() }, current)
    // 409 no comando: a resposta não dispara o `after` (que exige o escopo de pedido do Next).
    const command = mock(async () => ({ status: 409, body: { error: {} } }))
    const { call } = routes({
      ...(client as unknown as Record<string, unknown>),
      pensaJourneyCommand: command,
    })
    const res = await call('POST', ['projects', PROJECT, 'command'], accept)
    expect(res.status).toBe(409)
    expect(command).toHaveBeenCalledTimes(1)
    for (const fn of Object.values(own)) expect(fn).not.toHaveBeenCalled()
  })

  test('sem ler a equipe, o aceite para com a frase da equipe', async () => {
    quietConsole()
    const { client, own } = teamMembers({ status: 503, body: null }, withProposal())
    const command = forbidden('o comando')
    const { call } = routes({
      ...(client as unknown as Record<string, unknown>),
      pensaJourneyCommand: command,
    })
    const res = await call('POST', ['projects', PROJECT, 'command'], accept)
    expect(res.status).toBe(503)
    expect((await json(res)).error.message).toBe(
      'Não consegui conferir os recursos da equipe. Tente de novo. Sua proposta está guardada.',
    )
    expect(command).not.toHaveBeenCalled()
    for (const fn of Object.values(own)) expect(fn).not.toHaveBeenCalled()
  })
})
