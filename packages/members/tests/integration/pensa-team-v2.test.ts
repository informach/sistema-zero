import { describe, expect, test } from 'bun:test'
import type { CreationRecord } from '../../src/domain/creations/creation'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

/**
 * EQUIPE no Pensa v2 (14/10/2026), sobre o fake: a dona (Ana) chama a Bia e o Leo pelo código,
 * define quem programa e quem faz as artes, e cada missão é de quem tem a função. Contas
 * distintas (`x-auth-account-id`) para cada criança, como na vida real. O SQL que o fake não
 * alcança (o `accessible` da jornada, a trava das funções, a evidência pelo ator, o `team-art`)
 * mora em `tests/db/pensa-team-v2.test.ts`.
 */
const ANA = '11111111-1111-4111-8111-111111111111'
const BIA = '22222222-2222-4222-8222-222222222222'
const LEO = '33333333-3333-4333-8333-333333333333'
const EVA = '44444444-4444-4444-8444-444444444444'
const ACCOUNT = {
  [ANA]: 'aaaaaaaa-1111-4111-8111-111111111111',
  [BIA]: 'bbbbbbbb-2222-4222-8222-222222222222',
  [LEO]: 'cccccccc-3333-4333-8333-333333333333',
  [EVA]: 'dddddddd-4444-4444-8444-444444444444',
} as const
type Kid = keyof typeof ACCOUNT
type Ctx = ReturnType<typeof buildApp>

const as = (kid: Kid) => ({
  'x-auth-user-id': kid,
  'x-auth-account-id': ACCOUNT[kid],
  'content-type': 'application/json',
})
const req = (ctx: Ctx, kid: Kid, method: string, path: string, body?: unknown) =>
  ctx.app.handle(
    new Request(
      `http://localhost${path}${path.startsWith('/members/pensa/v2') ? '' : '?audience=kids'}`,
      {
        method,
        headers: as(kid),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    ),
  )
const json = (response: Response): Promise<any> => response.json()

const guide = {
  steps: [{ id: 'step-create', text: 'Criar o resultado', required: true }],
  criteria: [{ id: 'criterion-ready', text: 'Está pronto no jogo', required: true }],
}
const tasksBody = {
  tasks: [
    {
      key: 'gato',
      title: 'Desenhar o gato',
      destination: 'pinta',
      category: 'art',
      estimatedMinutes: 25,
      dependencies: [],
      guide,
      context: {
        kind: 'pinta',
        assetId: 'gato',
        artKind: 'sprite',
        style: 'pixel',
        palette: [{ role: 'principal', color: '#4f46e5' }],
        appearance: 'Um gato laranja',
        animations: [],
        states: ['normal'],
        usage: 'Personagem do jogador',
        requiresStudioUse: false,
      },
    },
    {
      key: 'mover',
      title: 'Programar o gato',
      destination: 'studio',
      category: 'gameplay',
      estimatedMinutes: 20,
      dependencies: ['gato'],
      guide,
      context: {
        kind: 'studio',
        dimension: '2d',
        visualAssetIds: [],
        blockIds: [],
        blocks: [],
        mechanicDocumentIds: [],
        extensionIds: [],
      },
    },
  ],
}

/** Libera Pinta/Estúdio/Molda pelo posto (o mesmo marco do teste do Pensa clássico). */
async function unlockTools(ctx: Ctx, kid: Kid, slug: string) {
  const foundation = seedSampleCourse(
    ctx.courses,
    slug,
    'published',
    'kids',
    false,
    'primeiros-passos',
    '2d',
    1,
  )
  await ctx.gamification.award({
    userId: kid,
    accountId: ACCOUNT[kid],
    audience: 'kids',
    events: [
      { sourceType: 'course_complete', sourceId: foundation.courseId, amount: 0 },
      { sourceType: 'course_showcased', sourceId: foundation.courseId, amount: 0 },
    ],
    today: '2026-06-02',
    now: new Date('2026-06-02T12:00:00Z'),
    privileged: false,
  })
}

function seedCreation(
  ctx: Ctx,
  kid: Kid,
  tool: 'pinta' | 'molda',
  itemId: string,
  over: Partial<CreationRecord> = {},
) {
  const record: CreationRecord = {
    id: crypto.randomUUID(),
    userId: kid,
    accountId: ACCOUNT[kid],
    tool,
    itemId,
    name: `Arte ${itemId}`,
    kind: tool === 'pinta' ? 'pixel-sprite' : 'model',
    itemUpdatedAt: new Date('2026-10-14T10:00:00.000Z'),
    revision: 4,
    formatVersion: 1,
    bytes: 321,
    thumb: null,
    syncedAt: new Date('2026-10-14T10:00:01.000Z'),
    pending: null,
    lastReservedRevision: 4,
    storageRef: `creations/${kid}/${tool}/${itemId}/4.json.gz`,
    parts: [],
    deletedAt: null,
    createdAt: new Date('2026-10-14T09:00:00.000Z'),
    ...over,
  }
  // A chave do fake de criações: perfil | ferramenta | item.
  ctx.creations.rows.set(`${kid}|${tool}|${itemId}`, record)
  return record
}

/**
 * A dona cria o plano com uma missão do Pinta e uma do Estúdio, ele vira v2 (jornada ativa) e
 * a Bia e o Leo entram pelo código. Contas: Ana tem Pensa, Estúdio e Pinta; Bia, Pensa e
 * Pinta; Leo, Pensa, Estúdio e Molda. A Eva é de fora (tem o Pensa, não entrou).
 */
async function setup(options: { join?: Kid[] } = {}) {
  const ctx = buildApp()
  const refs: Record<Kid, string[]> = {
    [ANA]: ['pensa', 'estudio-completo', 'pinta'],
    [BIA]: ['pensa', 'pinta'],
    [LEO]: ['pensa', 'estudio-completo', 'molda'],
    [EVA]: ['pensa'],
  }
  for (const [kid, list] of Object.entries(refs) as Array<[Kid, string[]]>)
    for (const courseRef of list)
      grantLifetime(ctx.entitlements, { userId: ACCOUNT[kid], courseRef })
  ctx.authProfiles.set(ANA, { firstName: 'Ana', public: false })
  ctx.authProfiles.set(BIA, { firstName: 'Bia', public: true })
  ctx.authProfiles.set(LEO, { firstName: 'Leo', public: true })
  for (const [index, kid] of ([ANA, BIA, LEO] as Kid[]).entries())
    await unlockTools(ctx, kid, `base-equipe-${index}`)
  const created = await req(ctx, ANA, 'POST', '/members/pensa/projects', { name: 'Gato na lua' })
  expect(created.status).toBe(200)
  const plan = (await json(created)).project
  const replaced = await req(
    ctx,
    ANA,
    'PUT',
    `/members/pensa/cycles/${plan.currentCycle.id}/tasks`,
    tasksBody,
  )
  expect(replaced.status).toBe(200)
  const [art, studio] = (await json(replaced)).tasks as Array<{ id: string }>
  ctx.pensa.journeyProjects.add(plan.id)
  const shared = await req(ctx, ANA, 'POST', `/members/pensa/projects/${plan.id}/share`)
  expect(shared.status).toBe(200)
  const { code } = (await json(shared)) as { code: string }
  for (const kid of options.join ?? [BIA, LEO]) {
    const joined = await req(ctx, kid, 'POST', '/members/pensa/projects/join', { code })
    expect(joined.status).toBe(200)
  }
  return {
    ctx,
    id: plan.id as string,
    cycleId: plan.currentCycle.id as string,
    code,
    art: art!.id,
    studio: studio!.id,
  }
}

const v2 = (id: string, rest = '') => `/members/pensa/v2/projects/${id}${rest}`
const roles = (ctx: Ctx, kid: Kid, id: string, body: unknown) =>
  req(ctx, kid, 'PUT', v2(id, '/roles'), body)
const progress = (ctx: Ctx, kid: Kid, taskId: string, body: unknown) =>
  req(ctx, kid, 'PATCH', `/members/pensa/tasks/${taskId}/progress`, body)
const done = (assetId: string) => ({
  status: 'completed',
  completedStepIds: ['step-create'],
  completedCriteriaIds: ['criterion-ready'],
  outputRef: { kind: 'pinta_asset', assetId },
})

describe('Pensa v2 em equipe — HTTP', () => {
  test('equipe pelo código num plano v2: entrar devolve o projectId, a equipe com nomes, o código só para a dona, desligar e sair', async () => {
    const { ctx, id, code } = await setup({ join: [] })
    const joined = await req(ctx, BIA, 'POST', '/members/pensa/projects/join', {
      code: `zap-${code.toLowerCase()}`,
    })
    expect(joined.status).toBe(200)
    expect((await json(joined)).project).toMatchObject({ id, role: 'member' })

    const mine = await json(await req(ctx, ANA, 'GET', v2(id, '/team')))
    expect(mine).toEqual({
      viewerProfileId: ANA,
      role: 'owner',
      shareCode: code,
      maxMembers: 5,
      roles: { code: ANA, art: [ANA] },
      people: [
        { profileId: ANA, firstName: 'Ana', photoUrl: null, owner: true, joinedAt: null },
        {
          profileId: BIA,
          firstName: 'Bia',
          photoUrl: null,
          owner: false,
          joinedAt: expect.any(String),
        },
      ],
      codeLocked: false,
    })
    const theirs = await json(await req(ctx, BIA, 'GET', v2(id, '/team')))
    expect(theirs).toMatchObject({ viewerProfileId: BIA, role: 'member', shareCode: null })
    expect((await req(ctx, EVA, 'GET', v2(id, '/team'))).status).toBe(404)
    // As rotas clássicas da equipe valem para o v2.
    expect((await req(ctx, BIA, 'GET', `/members/pensa/projects/${id}/members`)).status).toBe(200)
    expect((await req(ctx, ANA, 'DELETE', `/members/pensa/projects/${id}/share`)).status).toBe(200)
    expect((await json(await req(ctx, ANA, 'GET', v2(id, '/team')))).shareCode).toBeNull()
    expect((await req(ctx, BIA, 'DELETE', `/members/pensa/projects/${id}/members/me`)).status).toBe(
      200,
    )
    expect((await req(ctx, BIA, 'GET', v2(id, '/team'))).status).toBe(404)
  })

  test('funções: só a dona define, só gente da equipe, DTO estrito; devolve a jornada e tranca quem programa', async () => {
    const { ctx, id } = await setup()
    const notOwner = await roles(ctx, BIA, id, { code: BIA, art: [] })
    expect(notOwner.status).toBe(403)
    expect((await json(notOwner)).error).toEqual({
      code: 'PENSA_NOT_OWNER',
      message: 'Só quem criou o plano pode fazer isso.',
    })
    expect((await roles(ctx, EVA, id, { code: EVA, art: [] })).status).toBe(404)
    const outsider = await roles(ctx, ANA, id, { code: ANA, art: [EVA] })
    expect(outsider.status).toBe(400)
    expect((await json(outsider)).error.code).toBe('VALIDATION_ERROR')
    // (Campo a mais o `normalize` do Elysia descarta, como em toda rota da casa.)
    expect((await roles(ctx, ANA, id, { code: ANA })).status).toBe(400)
    expect((await roles(ctx, ANA, id, { code: ANA, art: Array(7).fill(BIA) })).status).toBe(400)
    expect((await roles(ctx, ANA, id, { code: 'nao-e-uuid', art: [] })).status).toBe(400)

    const updated = await roles(ctx, ANA, id, { code: LEO, art: [BIA] })
    expect(updated.status).toBe(200)
    const view = await json(updated)
    expect(view).toMatchObject({
      project: { id },
      role: 'owner',
      team: {
        viewerProfileId: ANA,
        ownerProfileId: ANA,
        memberCount: 2,
        shareEnabled: true,
        roles: { code: LEO, art: [BIA] },
      },
    })
    // A revisão sobe: as telas das colegas percebem a troca.
    expect(view.journey.revision).toBe(1)
    expect((await json(await req(ctx, LEO, 'GET', v2(id, '/team')))).roles).toEqual({
      code: LEO,
      art: [BIA],
    })
    // Com uma versão guardada, quem programa não muda mais; as artes, sim.
    ctx.pensa.checkpointProjects.add(id)
    expect((await json(await req(ctx, ANA, 'GET', v2(id, '/team')))).codeLocked).toBe(true)
    const locked = await roles(ctx, ANA, id, { code: ANA, art: [BIA] })
    expect(locked.status).toBe(409)
    expect((await json(locked)).error).toEqual({
      code: 'PENSA_CODE_LOCKED',
      message:
        'O jogo já começou no Estúdio de quem programa. Essa função não muda mais neste plano.',
    })
    expect((await roles(ctx, ANA, id, { code: LEO, art: [] })).status).toBe(200)
    // Plano clássico (sem jornada v2) não tem funções.
    ctx.pensa.journeyProjects.delete(id)
    expect((await roles(ctx, ANA, id, { code: LEO, art: [] })).status).toBe(409)
  })

  test('missões: cada uma é de quem tem a função; com duas artistas, quem começa fica com ela', async () => {
    const { ctx, id, cycleId, art, studio } = await setup()
    expect((await roles(ctx, ANA, id, { code: LEO, art: [BIA, ANA] })).status).toBe(200)
    const handoff = async (kid: Kid, taskId: string) =>
      json(await req(ctx, kid, 'GET', `/members/pensa/tasks/${taskId}/handoff`))

    expect((await handoff(BIA, studio)).capability).toEqual({
      owned: false,
      blockedReason: 'Essa missão é de quem programa o jogo.',
    })
    expect((await handoff(LEO, art)).capability).toEqual({
      owned: false,
      blockedReason: 'Essa missão é de quem cuida das artes.',
    })
    expect((await handoff(BIA, art)).capability).toEqual({ owned: true, blockedReason: null })

    const wrong = await progress(ctx, LEO, art, { status: 'in_progress' })
    expect(wrong.status).toBe(403)
    expect((await json(wrong)).error).toEqual({
      code: 'PENSA_NOT_YOUR_MISSION',
      message: 'Essa missão é de outra pessoa da equipe.',
    })
    const started = await progress(ctx, BIA, art, { status: 'in_progress' })
    expect(started.status).toBe(200)
    expect((await json(started)).task).toMatchObject({
      assigneeProfileId: BIA,
      completedByProfileId: null,
    })
    const taken = await progress(ctx, ANA, art, { status: 'in_progress' })
    expect(taken.status).toBe(409)
    expect((await json(taken)).error).toEqual({
      code: 'PENSA_MISSION_TAKEN',
      message: 'Outra pessoa da equipe já está fazendo essa missão.',
    })
    expect((await handoff(ANA, art)).capability.blockedReason).toBe(
      'Outra pessoa da equipe já está fazendo essa missão.',
    )
    const finished = await progress(ctx, BIA, art, done('gato-da-bia'))
    expect(finished.status).toBe(200)
    expect((await json(finished)).task).toMatchObject({
      assigneeProfileId: BIA,
      completedByProfileId: BIA,
      progress: { status: 'completed' },
    })
    // A etapa mostra quem fez cada missão.
    const stage = await json(
      await req(ctx, LEO, 'GET', `/members/pensa/cycles/${cycleId}/stages/r`),
    )
    expect(stage.tasks.find((task: { id: string }) => task.id === art)).toMatchObject({
      assigneeProfileId: BIA,
      completedByProfileId: BIA,
    })
    // O Leo começa a programar: o jogo começou e quem programa fica trancado.
    expect((await progress(ctx, LEO, studio, { status: 'in_progress' })).status).toBe(200)
    expect((await roles(ctx, ANA, id, { code: ANA, art: [BIA] })).status).toBe(409)
    // O Leo sai: a programação volta para a dona e a missão começada fica livre para ela.
    expect(
      (await req(ctx, ANA, 'DELETE', `/members/pensa/projects/${id}/members/${LEO}`)).status,
    ).toBe(200)
    expect((await json(await req(ctx, ANA, 'GET', v2(id, '/team')))).roles.code).toBe(ANA)
    const resumed = await progress(ctx, ANA, studio, { status: 'in_progress' })
    expect(resumed.status).toBe(200)
    expect((await json(resumed)).task.assigneeProfileId).toBe(ANA)
  })

  test('team-capabilities: o Estúdio e o inventário de quem programa, o posto e a posse de cada artista', async () => {
    const { ctx, id } = await setup()
    seedCreation(ctx, LEO, 'pinta', 'p1')
    seedCreation(ctx, LEO, 'pinta', 'apagado', { deletedAt: new Date('2026-10-14T11:00:00Z') })
    seedCreation(ctx, LEO, 'molda', 'm1')
    seedCreation(ctx, BIA, 'pinta', 'da-bia')
    // Sem funções: a dona programa e desenha.
    const solo = await json(await req(ctx, BIA, 'GET', v2(id, '/team-capabilities')))
    expect(solo.code).toMatchObject({
      profileId: ANA,
      access: { studio: true, pinta: true, molda: false },
      creations: { pinta: [], molda: [] },
    })
    expect(solo.art).toEqual([
      { profileId: ANA, level: expect.any(String), access: { pinta: true, molda: false } },
    ])
    expect((await roles(ctx, ANA, id, { code: LEO, art: [BIA] })).status).toBe(200)
    const body = await json(await req(ctx, BIA, 'GET', v2(id, '/team-capabilities')))
    expect(body.code).toMatchObject({
      profileId: LEO,
      level: expect.any(String),
      blocks: expect.any(Array),
      access: { studio: true, pinta: false, molda: true },
    })
    expect(body.code.creations.pinta.map((item: { itemId: string }) => item.itemId)).toEqual(['p1'])
    expect(body.code.creations.molda[0]).toMatchObject({
      tool: 'molda',
      itemId: 'm1',
      name: 'Arte m1',
      kind: 'model',
      revision: 4,
    })
    // O formato é o do índice das criações: nada de conta, perfil ou chave do R2.
    expect(body.code.creations.molda[0]).not.toHaveProperty('storageRef')
    expect(body.code.creations.molda[0]).not.toHaveProperty('accountId')
    expect(body.art).toEqual([
      { profileId: BIA, level: expect.any(String), access: { pinta: true, molda: false } },
    ])
    expect((await req(ctx, EVA, 'GET', v2(id, '/team-capabilities'))).status).toBe(404)
  })

  test('artes da equipe: a arte entregue pela Bia aparece para os outros e baixa da conta dela', async () => {
    const { ctx, id, art, studio } = await setup()
    expect((await roles(ctx, ANA, id, { code: LEO, art: [BIA] })).status).toBe(200)
    expect((await progress(ctx, BIA, art, done('gato-da-bia'))).status).toBe(200)
    // Antes de a criação existir na conta dela, nada para trazer.
    expect((await json(await req(ctx, LEO, 'GET', v2(id, '/team-art')))).items).toEqual([])
    const record = seedCreation(ctx, BIA, 'pinta', 'gato-da-bia')
    const listed = await json(await req(ctx, LEO, 'GET', v2(id, '/team-art')))
    expect(listed.items).toEqual([
      {
        taskId: art,
        title: 'Desenhar o gato',
        tool: 'pinta',
        assetId: 'gato-da-bia',
        assetName: 'Arte gato-da-bia',
        assetKind: 'pixel-sprite',
        byProfileId: BIA,
        completedAt: expect.any(String),
        updatedAt: '2026-10-14T10:00:00.000Z',
        revision: 4,
      },
    ])
    // Quem desenhou não traz a própria arte.
    expect((await json(await req(ctx, BIA, 'GET', v2(id, '/team-art')))).items).toEqual([])
    const download = await req(ctx, LEO, 'GET', v2(id, `/team-art/${art}/download`))
    expect(download.status).toBe(200)
    expect(await json(download)).toEqual({
      storageKey: record.storageRef,
      revision: 4,
      bytes: 321,
      summary: expect.objectContaining({ tool: 'pinta', itemId: 'gato-da-bia', revision: 4 }),
      parts: [],
    })
    // Missão sem arte, tarefa de fora do plano e pessoa de fora: 404.
    expect((await req(ctx, LEO, 'GET', v2(id, `/team-art/${studio}/download`))).status).toBe(404)
    expect(
      (await req(ctx, LEO, 'GET', v2(id, `/team-art/${crypto.randomUUID()}/download`))).status,
    ).toBe(404)
    expect((await req(ctx, EVA, 'GET', v2(id, `/team-art/${art}/download`))).status).toBe(404)
    // A Bia apagou o desenho na conta dela: some da lista e o download é 404.
    seedCreation(ctx, BIA, 'pinta', 'gato-da-bia', {
      deletedAt: new Date('2026-10-14T11:00:00Z'),
      storageRef: null,
    })
    expect((await json(await req(ctx, LEO, 'GET', v2(id, '/team-art')))).items).toEqual([])
    expect((await req(ctx, LEO, 'GET', v2(id, `/team-art/${art}/download`))).status).toBe(404)
  })
})
