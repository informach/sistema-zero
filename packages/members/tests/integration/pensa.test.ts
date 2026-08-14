import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime, seedSampleCourse } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const OTHER = '22222222-2222-2222-2222-222222222222'
const headers = { 'x-auth-user-id': USER, 'content-type': 'application/json' }
type Ctx = ReturnType<typeof buildApp>

const req = (
  app: Ctx['app'],
  method: string,
  path: string,
  body?: unknown,
  customHeaders: Record<string, string> = headers,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: customHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )

const json = (response: Response): Promise<any> => response.json()

function buildWithAccess() {
  const ctx = buildApp()
  grantLifetime(ctx.entitlements, { userId: USER, courseRef: 'pensa' })
  return ctx
}

async function createProject(ctx: Ctx) {
  const response = await req(ctx.app, 'POST', '/members/pensa/projects?audience=kids', {
    name: 'Nave Zero',
  })
  expect(response.status).toBe(200)
  return (await json(response)).project
}

const guide = {
  steps: [{ id: 'step-create', text: 'Criar o resultado', required: true }],
  criteria: [{ id: 'criterion-ready', text: 'Está pronto no jogo', required: true }],
}

const tasksBody = {
  tasks: [
    {
      key: 'nave',
      title: 'Desenhar a nave',
      destination: 'pinta',
      category: 'art',
      estimatedMinutes: 25,
      dependencies: [],
      guide,
      context: {
        kind: 'pinta',
        assetId: 'nave',
        artKind: 'sprite',
        style: 'pixel',
        palette: [{ role: 'principal', color: '#4f46e5' }],
        appearance: 'Nave triangular amigável',
        animations: ['voando'],
        states: ['normal'],
        usage: 'Personagem do jogador',
        requiresStudioUse: true,
      },
    },
    {
      key: 'movimento',
      title: 'Programar o movimento',
      destination: 'studio',
      category: 'gameplay',
      estimatedMinutes: 20,
      dependencies: ['nave'],
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

describe('Pensa planejador — HTTP', () => {
  test('mantém o gate do Pensa e cria apenas projetos de jogo', async () => {
    const noAccess = buildApp()
    const denied = await req(noAccess.app, 'POST', '/members/pensa/projects?audience=kids', {
      name: 'Sem acesso',
    })
    expect(denied.status).toBe(403)
    expect((await json(denied)).error.code).toBe('ACCESS_DENIED')

    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    expect(project).toMatchObject({ name: 'Nave Zero' })
    expect(project).not.toHaveProperty('buildEnv')
    const legacy = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/projects/${project.id}?audience=kids`,
      {
        buildEnv: 'embedded',
      },
    )
    expect(legacy.status).toBe(200)
    expect((await json(legacy)).project).not.toHaveProperty('buildEnv')
  })

  test('expõe os cinco artefatos e os gates Z/E do novo contrato', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const cycleId = project.currentCycle.id
    const base = `/members/pensa/cycles/${cycleId}`

    const gated = await req(ctx.app, 'POST', `${base}/advance?audience=kids`, { from: 'z' })
    expect(gated.status).toBe(409)
    expect((await json(gated)).details).toEqual({ gate: 'z', missing: ['idea'] })

    const saved = await req(ctx.app, 'POST', `${base}/artifacts?audience=kids`, {
      stage: 'z',
      type: 'idea',
      content: {
        title: 'Nave Zero',
        idea: 'Uma nave coleta estrelas',
        objective: 'Coletar todas as estrelas',
        controls: ['setas'],
        victory: 'todas coletadas',
        defeat: 'tempo acabou',
        dimension: '2d',
      },
    })
    expect(saved.status).toBe(200)
    await req(ctx.app, 'POST', `${base}/artifacts/idea/validate?audience=kids`)
    expect(
      (await json(await req(ctx.app, 'POST', `${base}/advance?audience=kids`, { from: 'z' }))).cycle
        .stage,
    ).toBe('e')

    const wrongStage = await req(ctx.app, 'POST', `${base}/artifacts?audience=kids`, {
      stage: 'e',
      type: 'plan_review',
      content: { approved: true },
    })
    expect(wrongStage.status).toBe(400)
  })

  test('faz handoff com ownership e explica entitlement bloqueado sem esconder o plano', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const cycleId = project.currentCycle.id
    const replaced = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${cycleId}/tasks?audience=kids`,
      tasksBody,
    )
    expect(replaced.status).toBe(200)
    const tasks = (await json(replaced)).tasks
    expect(tasks[1].dependencies).toEqual([tasks[0].id])

    const blocked = await json(
      await req(ctx.app, 'GET', `/members/pensa/tasks/${tasks[0].id}/handoff?audience=kids`),
    )
    expect(blocked.capability).toEqual({
      owned: false,
      blockedReason: 'O Pinta ainda não está liberado para esta conta.',
    })
    expect(blocked.task.context.artKind).toBe('sprite')

    grantLifetime(ctx.entitlements, { userId: USER, courseRef: 'pinta' })
    const allowed = await json(
      await req(ctx.app, 'GET', `/members/pensa/tasks/${tasks[0].id}/handoff?audience=kids`),
    )
    expect(allowed.capability).toEqual({ owned: true, blockedReason: null })

    // O Estúdio do Pensa exige produto E o primeiro desbloqueio da carreira.
    grantLifetime(ctx.entitlements, { userId: USER, courseRef: 'estudio-completo' })
    const studioLocked = await json(
      await req(ctx.app, 'GET', `/members/pensa/tasks/${tasks[1].id}/handoff?audience=kids`),
    )
    expect(studioLocked.capability).toEqual({
      owned: false,
      blockedReason: 'O Estúdio ainda não foi liberado pelo seu nível na carreira.',
    })

    // O curso de ENTRADA (degrau `primeiros-passos-2d`) é o que promove a Construtor(a),
    // que é o posto em que o Estúdio livre abre.
    const foundation = seedSampleCourse(
      ctx.courses,
      'base-pensa',
      'published',
      'kids',
      false,
      'primeiros-passos',
      '2d',
      1,
    )
    await ctx.gamification.award({
      userId: USER,
      accountId: USER,
      audience: 'kids',
      events: [
        { sourceType: 'course_complete', sourceId: foundation.courseId, amount: 0 },
        { sourceType: 'course_showcased', sourceId: foundation.courseId, amount: 0 },
      ],
      today: '2026-06-02',
      now: new Date('2026-06-02T12:00:00.000Z'),
      privileged: false,
    })
    const studioAllowed = await json(
      await req(ctx.app, 'GET', `/members/pensa/tasks/${tasks[1].id}/handoff?audience=kids`),
    )
    expect(studioAllowed.capability).toEqual({ owned: true, blockedReason: null })

    const hidden = await req(
      ctx.app,
      'GET',
      `/members/pensa/tasks/${tasks[0].id}/handoff?audience=kids`,
      undefined,
      {
        'x-auth-user-id': OTHER,
        'content-type': 'application/json',
      },
    )
    expect(hidden.status).toBe(404)
  })

  test('sincroniza transições e só conclui com output + itens obrigatórios', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const cycleId = project.currentCycle.id
    const tasks = (
      await json(
        await req(
          ctx.app,
          'PUT',
          `/members/pensa/cycles/${cycleId}/tasks?audience=kids`,
          tasksBody,
        ),
      )
    ).tasks

    const dependency = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/tasks/${tasks[1].id}/progress?audience=kids`,
      {
        status: 'in_progress',
      },
    )
    expect(dependency.status).toBe(409)
    expect((await json(dependency)).error.code).toBe('PENSA_TASK_DEPENDENCY_PENDING')

    expect(
      (
        await json(
          await req(
            ctx.app,
            'PATCH',
            `/members/pensa/tasks/${tasks[0].id}/progress?audience=kids`,
            {
              status: 'in_progress',
            },
          ),
        )
      ).task.progress.status,
    ).toBe('in_progress')

    const incomplete = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/tasks/${tasks[0].id}/progress?audience=kids`,
      {
        status: 'completed',
        completedStepIds: ['step-create'],
        completedCriteriaIds: ['criterion-ready'],
        outputRef: { kind: 'pinta_asset', assetId: 'asset-a' },
      },
    )
    expect(incomplete.status).toBe(409)

    const completed = await json(
      await req(ctx.app, 'PATCH', `/members/pensa/tasks/${tasks[0].id}/progress?audience=kids`, {
        status: 'completed',
        completedStepIds: ['step-create'],
        completedCriteriaIds: ['criterion-ready'],
        outputRef: {
          kind: 'pinta_asset',
          assetId: 'asset-a',
          usedInStudioAt: '2026-07-01T12:00:00.000Z',
        },
      }),
    )
    expect(completed.task.progress.status).toBe('completed')

    const stage = await json(
      await req(ctx.app, 'GET', `/members/pensa/cycles/${cycleId}/stages/z?audience=kids`),
    )
    expect(stage.nextTaskId).toBe(tasks[1].id)
  })

  test('remove explicitamente os endpoints legados de snapshot e checklist', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const snapshot = await req(
      ctx.app,
      'GET',
      `/members/pensa/projects/${project.id}/studio-snapshot?audience=kids`,
    )
    const checklist = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${project.currentCycle.id}/checklist?audience=kids`,
      { items: [] },
    )
    expect(snapshot.status).toBe(404)
    expect(checklist.status).toBe(404)
  })

  test('valida IDs na borda e exige autenticação', async () => {
    const ctx = buildWithAccess()
    expect(
      (await req(ctx.app, 'GET', '/members/pensa/projects/not-a-uuid?audience=kids')).status,
    ).toBe(400)
    const anonymous = await ctx.app.handle(new Request('http://localhost/members/pensa/projects'))
    expect(anonymous.status).toBe(401)
  })
})
