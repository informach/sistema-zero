import { describe, expect, test } from 'bun:test'
import { buildApp, grantLifetime } from '../helpers'

const USER = '11111111-1111-1111-1111-111111111111'
const headers = { 'x-auth-user-id': USER, 'content-type': 'application/json' }
const adminHeaders = {
  'x-auth-user-id': USER,
  'x-auth-user-role': 'admin',
  'x-auth-user-status': 'active',
  'content-type': 'application/json',
}

type App = ReturnType<typeof buildApp>['app']
type Ctx = ReturnType<typeof buildApp>
const readJson = (r: Response): Promise<any> => r.json()

const req = (
  app: App,
  method: string,
  path: string,
  body?: unknown,
  h: Record<string, string> = headers,
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: h,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
  )

/** App com o entitlement do produto `pensa` concedido (gate de criação). */
function buildWithAccess() {
  const ctx = buildApp()
  grantLifetime(ctx.entitlements, { userId: USER, courseRef: 'pensa' })
  return ctx
}

async function createProject(ctx: Ctx, name = 'Meu Jogo', audience = 'kids') {
  const res = await req(ctx.app, 'POST', `/members/pensa/projects?audience=${audience}`, {
    name,
    kind: 'game',
  })
  expect(res.status).toBe(200)
  return (await readJson(res)).project
}

describe('Pensa — gate de produto na criação', () => {
  test('sem entitlement `pensa` → 403 ACCESS_DENIED', async () => {
    const { app } = buildApp()
    const res = await req(app, 'POST', '/members/pensa/projects?audience=kids', {
      name: 'Sem acesso',
      kind: 'game',
    })
    expect(res.status).toBe(403)
    expect((await readJson(res)).error.code).toBe('ACCESS_DENIED')
  })

  test('com matrícula do produto `pensa` → cria; demais rotas não re-checam', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    expect(project.currentCycle).toMatchObject({ number: 1, stage: 'z' })
    // GET do detail não passa pelo gate de produto (ownership basta).
    const res = await req(ctx.app, 'GET', `/members/pensa/projects/${project.id}?audience=kids`)
    expect(res.status).toBe(200)
  })

  test('equipe interna (privileged) pula o gate sem matrícula', async () => {
    const { app } = buildApp()
    const res = await req(
      app,
      'POST',
      '/members/pensa/projects?audience=kids',
      { name: 'De equipe', kind: 'webapp' },
      adminHeaders,
    )
    expect(res.status).toBe(200)
    expect((await readJson(res)).project.kind).toBe('webapp')
  })
})

describe('Pensa — rotas e shapes do contrato', () => {
  test('lista por vitrine: kids não aparece em adult; projeto de outra vitrine → 404', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx, 'Kids Only', 'kids')

    const kids = await readJson(await req(ctx.app, 'GET', '/members/pensa/projects?audience=kids'))
    expect(kids.projects).toHaveLength(1)
    expect(kids.projects[0]).toMatchObject({ name: 'Kids Only', cycleNumber: 1, stage: 'z' })

    // Ausente → adult (default das demais rotas) → não enxerga o projeto kids.
    const adult = await readJson(await req(ctx.app, 'GET', '/members/pensa/projects'))
    expect(adult.projects).toEqual([])
    const cross = await req(ctx.app, 'GET', `/members/pensa/projects/${project.id}`)
    expect(cross.status).toBe(404)
    expect((await readJson(cross)).error.code).toBe('PENSA_NOT_FOUND')
  })

  test('fluxo: conversa → artefato → validate → advance (e os 409 do contrato)', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const cycleId = project.currentCycle.id
    const base = `/members/pensa/cycles/${cycleId}`

    // Turno de conversa (PUT upsert) devolve { state, messageCount }.
    const turn = await req(ctx.app, 'PUT', `${base}/stages/z/conversation?audience=kids`, {
      userMessage: { content: 'quero um jogo de nave' },
      assistantMessage: { content: 'quem vai jogar?' },
      state: { ready: false },
    })
    expect(turn.status).toBe(200)
    expect(await readJson(turn)).toEqual({ state: { ready: false }, messageCount: 2 })

    // Stage view traz conversa + state + artifacts.
    const stage = await readJson(await req(ctx.app, 'GET', `${base}/stages/z?audience=kids`))
    expect(stage.stage).toBe('z')
    expect(stage.conversation.messages).toHaveLength(2)
    expect(stage.state).toEqual({ ready: false })
    expect(stage.artifacts).toEqual([])

    // advance com from errado → 409 PENSA_STAGE_MISMATCH.
    const mismatch = await req(ctx.app, 'POST', `${base}/advance?audience=kids`, { from: 'e' })
    expect(mismatch.status).toBe(409)
    expect((await readJson(mismatch)).error.code).toBe('PENSA_STAGE_MISMATCH')

    // advance sem idea validated → 409 com details.gate/missing.
    const gated = await req(ctx.app, 'POST', `${base}/advance?audience=kids`, { from: 'z' })
    expect(gated.status).toBe(409)
    const gatedBody = await readJson(gated)
    expect(gatedBody.error.code).toBe('PENSA_GATE_NOT_READY')
    expect(gatedBody.details).toEqual({ gate: 'z', missing: ['idea'] })

    // Salva + valida o artefato → advance passa.
    const saved = await req(ctx.app, 'POST', `${base}/artifacts?audience=kids`, {
      stage: 'z',
      type: 'idea',
      content: { titulo: 'Nave Zero' },
    })
    expect(saved.status).toBe(200)
    expect((await readJson(saved)).artifact).toMatchObject({
      version: 1,
      status: 'draft',
      type: 'idea',
    })
    const validated = await req(ctx.app, 'POST', `${base}/artifacts/idea/validate?audience=kids`)
    expect((await readJson(validated)).artifact.status).toBe('validated')

    const advanced = await req(ctx.app, 'POST', `${base}/advance?audience=kids`, { from: 'z' })
    expect(advanced.status).toBe(200)
    const { cycle, gamification } = await readJson(advanced)
    expect(cycle.stage).toBe('e')
    expect(cycle.zCompletedAt).not.toBeNull()
    // Gamificação NA RESPOSTA (aditivo, fail-open): etapa = 15 XP + 5 coins; a 1ª
    // etapa concluída (sempre a Z) destrava a badge da 1ª Carta da Ideia.
    expect(gamification).toMatchObject({ xpAwarded: 15, coinsAwarded: 5 })
    expect(gamification.badgesUnlocked.map((b: { slug: string }) => b.slug)).toContain(
      'pensa-first-idea',
    )

    // Criar ciclo 2 antes do done → 409 PENSA_CYCLE_NOT_DONE.
    const early = await req(
      ctx.app,
      'POST',
      `/members/pensa/projects/${project.id}/cycles?audience=kids`,
      { goal: 'Versão 2' },
    )
    expect(early.status).toBe(409)
    expect((await readJson(early)).error.code).toBe('PENSA_CYCLE_NOT_DONE')
  })

  test('tasks: PUT replace + PATCH move; checklist: PUT replace + PATCH toggle', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const cycleId = project.currentCycle.id
    const mission = { steps: [{ text: 'Fazer a nave' }], doneWhen: ['Nave na tela'] }

    const replaced = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${cycleId}/tasks?audience=kids`,
      {
        tasks: [
          { title: 'T0', mission },
          { title: 'T1', mission },
        ],
      },
    )
    expect(replaced.status).toBe(200)
    const { tasks } = await readJson(replaced)
    expect(tasks.map((t: any) => [t.title, t.column, t.position])).toEqual([
      ['T0', 'backlog', 0],
      ['T1', 'backlog', 1],
    ])

    const moved = await req(ctx.app, 'PATCH', `/members/pensa/tasks/${tasks[1].id}?audience=kids`, {
      column: 'doing',
      notes: 'começando',
    })
    expect(moved.status).toBe(200)
    expect((await readJson(moved)).task).toMatchObject({
      column: 'doing',
      position: 0,
      notes: 'começando',
    })

    const checklist = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${cycleId}/checklist?audience=kids`,
      { items: [{ category: 'test', title: 'Testar tudo' }] },
    )
    expect(checklist.status).toBe(200)
    const { items } = await readJson(checklist)
    expect(items[0]).toMatchObject({ category: 'test', required: true, done: false })

    const toggled = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/checklist/${items[0].id}?audience=kids`,
      { done: true },
    )
    expect(toggled.status).toBe(200)
    const { item } = await readJson(toggled)
    expect(item.done).toBe(true)
    expect(item.doneAt).not.toBeNull()
  })

  test('validação de borda: uuid inválido → 400; body inválido → 400/422', async () => {
    const ctx = buildWithAccess()
    const bad = await req(ctx.app, 'GET', '/members/pensa/projects/nao-e-uuid?audience=kids')
    expect(bad.status).toBe(400)
    const badStage = await req(
      ctx.app,
      'GET',
      '/members/pensa/cycles/11111111-1111-1111-1111-111111111111/stages/x?audience=kids',
    )
    expect(badStage.status).toBe(400)
    const badKind = await req(ctx.app, 'POST', '/members/pensa/projects?audience=kids', {
      name: 'Ok',
      kind: 'outro',
    })
    expect(badKind.status).toBe(400)
  })

  test('sem x-auth-user-id → 401', async () => {
    const { app } = buildApp()
    const res = await app.handle(new Request('http://localhost/members/pensa/projects'))
    expect(res.status).toBe(401)
  })
})

describe('Pensa — buildEnv + snapshot do Estúdio na nuvem', () => {
  const otherHeaders = {
    'x-auth-user-id': '99999999-9999-9999-9999-999999999999',
    'content-type': 'application/json',
  }

  test('PATCH buildEnv faz round-trip no detail; valor inválido → 400', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    expect(project.buildEnv).toBeNull()

    const patched = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/projects/${project.id}?audience=kids`,
      { buildEnv: 'studio' },
    )
    expect(patched.status).toBe(200)
    expect((await readJson(patched)).project.buildEnv).toBe('studio')

    const detail = await readJson(
      await req(ctx.app, 'GET', `/members/pensa/projects/${project.id}?audience=kids`),
    )
    expect(detail.project.buildEnv).toBe('studio')

    // Fora da union embedded|studio|external → 400 na borda (validado no app, não no pg).
    const invalid = await req(
      ctx.app,
      'PATCH',
      `/members/pensa/projects/${project.id}?audience=kids`,
      { buildEnv: 'banana' },
    )
    expect(invalid.status).toBe(400)
  })

  test('snapshot: GET vazio → nulls; PUT grava; GET devolve; detail traz snapshotAt SEM o blob', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const base = `/members/pensa/projects/${project.id}/studio-snapshot?audience=kids`

    const empty = await req(ctx.app, 'GET', base)
    expect(empty.status).toBe(200)
    expect(await readJson(empty)).toEqual({ project: null, updatedAt: null })

    const game = { name: 'Nave Zero', scenes: [{ id: 'main' }] }
    const saved = await req(ctx.app, 'PUT', base, { project: game })
    expect(saved.status).toBe(200)
    const { updatedAt } = await readJson(saved)
    expect(typeof updatedAt).toBe('string')

    const got = await readJson(await req(ctx.app, 'GET', base))
    expect(got).toEqual({ project: game, updatedAt })

    // O detail expõe SÓ o carimbo — o blob nunca sai na view.
    const detailRes = await req(
      ctx.app,
      'GET',
      `/members/pensa/projects/${project.id}?audience=kids`,
    )
    const detail = (await readJson(detailRes)).project
    expect(detail.studioSnapshotAt).toBe(updatedAt)
    expect('studioSnapshot' in detail).toBe(false)
    expect(JSON.stringify(detail)).not.toContain('"scenes"')
  })

  test('ownership: outro usuário → 404 PENSA_NOT_FOUND no GET e no PUT', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const base = `/members/pensa/projects/${project.id}/studio-snapshot?audience=kids`
    await req(ctx.app, 'PUT', base, { project: { scenes: [] } })

    const got = await req(ctx.app, 'GET', base, undefined, otherHeaders)
    expect(got.status).toBe(404)
    expect((await readJson(got)).error.code).toBe('PENSA_NOT_FOUND')
    const put = await req(ctx.app, 'PUT', base, { project: { rouba: true } }, otherHeaders)
    expect(put.status).toBe(404)
  })

  test('project não-objeto → 400; serializado acima do cap de 1.8M chars → 400 (não 413: teto de corpo = 2MB)', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const base = `/members/pensa/projects/${project.id}/studio-snapshot?audience=kids`

    const asArray = await req(ctx.app, 'PUT', base, { project: [1, 2, 3] })
    expect(asArray.status).toBe(400)
    expect((await readJson(asArray)).error.code).toBe('VALIDATION_ERROR')

    // ~1.8MB de corpo PASSA no teto de 2MB da rota (64KB/1MB barrariam com 413)
    // e cai no cap de NEGÓCIO do use case → 400.
    const oversized = await req(ctx.app, 'PUT', base, {
      project: { blob: 'x'.repeat(1_800_100) },
    })
    expect(oversized.status).toBe(400)
    expect((await readJson(oversized)).error.code).toBe('VALIDATION_ERROR')
  })
})

describe('Pensa — teto de corpo das rotas pesadas (1 MB)', () => {
  test('conversa com turno > 64KB passa (o teto padrão barraria)', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const big = 'x'.repeat(90_000) // ~90KB > MAX_REQUEST_BODY_BYTES (64KB) do buildApp
    const res = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${project.currentCycle.id}/stages/z/conversation?audience=kids`,
      { userMessage: { content: big }, assistantMessage: { content: 'ok' } },
    )
    expect(res.status).toBe(200)
  })

  test('acima de 1 MB → 413 mesmo nas rotas pesadas', async () => {
    const ctx = buildWithAccess()
    const project = await createProject(ctx)
    const res = await req(
      ctx.app,
      'POST',
      `/members/pensa/cycles/${project.currentCycle.id}/artifacts?audience=kids`,
      { stage: 'z', type: 'idea', content: { blob: 'x'.repeat(1_100_000) } },
    )
    expect(res.status).toBe(413)
  })

  test('rota comum do pensa segue no teto pequeno (64KB) → 413', async () => {
    const ctx = buildWithAccess()
    const res = await req(ctx.app, 'POST', '/members/pensa/projects?audience=kids', {
      name: 'Grande',
      kind: 'game',
      lixo: 'x'.repeat(100_000),
    })
    expect(res.status).toBe(413)
  })
})
