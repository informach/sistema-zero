import { describe, expect, test } from 'bun:test'
import { MAX_PROJECT_MEMBERS } from '../../src/domain/pensa/pensa'
import { buildApp, grantLifetime } from '../helpers'

/**
 * A EQUIPE do Pensa (26/09/2026): o dono gera um código, o colega entra por ele e passa a
 * ver e trabalhar no plano. Só o dono renomeia, apaga, gera/desliga o código e tira gente;
 * os dois lados precisam ter o Pensa na conta; código errado é 404 sem vazar o plano.
 */
const A = '11111111-1111-1111-1111-111111111111'
const B = '22222222-2222-2222-2222-222222222222'
const C = '33333333-3333-3333-3333-333333333333'
const ACCOUNT_A = 'aaaaaaaa-1111-1111-1111-111111111111'
const ACCOUNT_B = 'bbbbbbbb-2222-2222-2222-222222222222'
const ACCOUNT_C = 'cccccccc-3333-3333-3333-333333333333'

type Ctx = ReturnType<typeof buildApp>

const as = (profile: string, account: string) => ({
  'x-auth-user-id': profile,
  'x-auth-account-id': account,
  'content-type': 'application/json',
})
const asA = as(A, ACCOUNT_A)
const asB = as(B, ACCOUNT_B)
const asC = as(C, ACCOUNT_C)

const req = (
  app: Ctx['app'],
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: unknown,
) =>
  app.handle(
    new Request(`http://localhost${path}?audience=kids`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
  )
const json = (response: Response): Promise<any> => response.json()

/** A e B têm o Pensa na CONTA; C não. */
function buildTeam() {
  const ctx = buildApp()
  grantLifetime(ctx.entitlements, { userId: ACCOUNT_A, courseRef: 'pensa' })
  grantLifetime(ctx.entitlements, { userId: ACCOUNT_B, courseRef: 'pensa' })
  ctx.authProfiles.set(A, { firstName: 'Ana', public: false })
  ctx.authProfiles.set(B, { firstName: 'Beto', public: true })
  return ctx
}

async function createPlan(ctx: Ctx, name = 'Nave Zero') {
  const response = await req(ctx.app, 'POST', '/members/pensa/projects', asA, { name })
  expect(response.status).toBe(200)
  return (await json(response)).project
}

async function share(ctx: Ctx, projectId: string) {
  const response = await req(ctx.app, 'POST', `/members/pensa/projects/${projectId}/share`, asA)
  expect(response.status).toBe(200)
  return (await json(response)) as { code: string; display: string }
}

async function join(ctx: Ctx, code: string, headers = asB) {
  return req(ctx.app, 'POST', '/members/pensa/projects/join', headers, { code })
}

describe('equipe do Pensa — HTTP', () => {
  test('sem convite, o perfil B não vê o plano de A (detalhe 404, lista vazia, etapa 404)', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    expect((await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}`, asB)).status).toBe(404)
    expect(
      (await json(await req(ctx.app, 'GET', '/members/pensa/projects', asB))).projects,
    ).toEqual([])
    const stage = await req(
      ctx.app,
      'GET',
      `/members/pensa/cycles/${plan.currentCycle.id}/stages/z`,
      asB,
    )
    expect(stage.status).toBe(404)
    // O detalhe do dono já diz o papel e que ainda não há equipe nem código.
    expect(plan).toMatchObject({ role: 'owner', team: { memberCount: 0, shareEnabled: false } })
  })

  test('o dono gera o código (exibido com o prefixo), B entra e passa a ver e trabalhar no plano', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code, display } = await share(ctx, plan.id)
    expect(code).toBe('AAAAAB')
    expect(display).toBe('ZAP-AAAAAB')
    // A entrada tolera o prefixo, minúsculas e espaços.
    const joined = await join(ctx, ` zap-${code.toLowerCase()} `)
    expect(joined.status).toBe(200)
    const detail = (await json(joined)).project
    expect(detail).toMatchObject({
      id: plan.id,
      name: 'Nave Zero',
      role: 'member',
      team: { memberCount: 1, shareEnabled: true },
    })
    // B lê a etapa, a lista (com o 1º nome do dono) e mexe no plano.
    expect(
      (await req(ctx.app, 'GET', `/members/pensa/cycles/${plan.currentCycle.id}/stages/z`, asB))
        .status,
    ).toBe(200)
    const list = (await json(await req(ctx.app, 'GET', '/members/pensa/projects', asB))).projects
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      id: plan.id,
      role: 'member',
      team: { memberCount: 1, ownerFirstName: 'Ana' },
    })
    const turn = await req(
      ctx.app,
      'PUT',
      `/members/pensa/cycles/${plan.currentCycle.id}/stages/z/conversation`,
      asB,
      {
        userMessage: { content: 'Um jogo de nave.' },
        assistantMessage: { content: 'Legal! Como o jogador ganha?' },
      },
    )
    expect(turn.status).toBe(200)
    // O dono vê a equipe crescer; para ele a lista não tem nome de dono.
    const mine = (await json(await req(ctx.app, 'GET', '/members/pensa/projects', asA))).projects
    expect(mine[0]).toMatchObject({ role: 'owner', team: { memberCount: 1, ownerFirstName: null } })
  })

  test('a rota de membros: o dono vê o código e a equipe (nomes e fotos best-effort); o membro vê o dono e NÃO vê o código', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    expect((await join(ctx, code)).status).toBe(200)
    const ownerView = await json(
      await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}/members`, asA),
    )
    expect(ownerView).toMatchObject({
      role: 'owner',
      viewerProfileId: A,
      shareCode: code,
      maxMembers: MAX_PROJECT_MEMBERS,
      owner: { profileId: A, firstName: 'Ana', photoUrl: null, joinedAt: null },
      members: [{ profileId: B, firstName: 'Beto', photoUrl: null }],
    })
    expect(typeof ownerView.members[0].joinedAt).toBe('string')
    const memberView = await json(
      await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}/members`, asB),
    )
    expect(memberView).toMatchObject({ role: 'member', viewerProfileId: B, shareCode: null })
    // Perfil de fora: 404.
    expect(
      (await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}/members`, asC)).status,
    ).toBe(404)
  })

  test('membro não renomeia, não arquiva, não apaga, não gera código e não tira gente (403 PENSA_NOT_OWNER)', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    expect((await join(ctx, code)).status).toBe(200)
    const base = `/members/pensa/projects/${plan.id}`
    for (const attempt of [
      req(ctx.app, 'PATCH', base, asB, { name: 'Outro' }),
      req(ctx.app, 'PATCH', base, asB, { status: 'archived' }),
      req(ctx.app, 'DELETE', base, asB),
      req(ctx.app, 'POST', `${base}/share`, asB),
      req(ctx.app, 'DELETE', `${base}/share`, asB),
      req(ctx.app, 'DELETE', `${base}/members/${A}`, asB),
    ]) {
      const response = await attempt
      expect(response.status).toBe(403)
      expect((await json(response)).error.code).toBe('PENSA_NOT_OWNER')
    }
    // O plano continua inteiro para o dono.
    const detail = (await json(await req(ctx.app, 'GET', base, asA))).project
    expect(detail).toMatchObject({ name: 'Nave Zero', status: 'active', team: { memberCount: 1 } })
  })

  test('código rotacionado ou desligado não entra; o desligado não tira quem já entrou', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const first = await share(ctx, plan.id)
    const second = await share(ctx, plan.id)
    expect(second.code).not.toBe(first.code)
    const stale = await join(ctx, first.code)
    expect(stale.status).toBe(404)
    expect((await json(stale)).error.code).toBe('PENSA_INVITE_INVALID')
    expect((await join(ctx, second.code)).status).toBe(200)
    // Desliga: C (se tivesse o Pensa) não entraria mais; B fica.
    const off = await req(ctx.app, 'DELETE', `/members/pensa/projects/${plan.id}/share`, asA)
    expect(off.status).toBe(200)
    const detail = (
      await json(await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}`, asA))
    ).project
    expect(detail.team).toEqual({ memberCount: 1, shareEnabled: false })
    expect((await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}`, asB)).status).toBe(200)
    const gone = await join(ctx, second.code)
    expect(gone.status).toBe(404)
  })

  test('convidado sem o Pensa na conta cai no gate (403 ACCESS_DENIED), mesmo com o código certo', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    const denied = await join(ctx, code, asC)
    expect(denied.status).toBe(403)
    expect((await json(denied)).error.code).toBe('ACCESS_DENIED')
  })

  test('o dono não entra no próprio plano; quem já entrou não entra de novo; a equipe cheia recusa o 6º', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    const self = await join(ctx, code, asA)
    expect(self.status).toBe(409)
    expect((await json(self)).error).toMatchObject({
      code: 'PENSA_ALREADY_MEMBER',
      message: 'Esse plano já é seu.',
    })
    expect((await join(ctx, code)).status).toBe(200)
    const again = await join(ctx, code)
    expect(again.status).toBe(409)
    expect((await json(again)).error.code).toBe('PENSA_ALREADY_MEMBER')
    for (let index = 2; index <= MAX_PROJECT_MEMBERS; index += 1) {
      const profile = `44444444-4444-4444-4444-44444444444${index}`
      const account = `dddddddd-4444-4444-4444-44444444444${index}`
      grantLifetime(ctx.entitlements, { userId: account, courseRef: 'pensa' })
      expect((await join(ctx, code, as(profile, account))).status).toBe(200)
    }
    const extraProfile = '55555555-5555-5555-5555-555555555555'
    const extraAccount = 'eeeeeeee-5555-5555-5555-555555555555'
    grantLifetime(ctx.entitlements, { userId: extraAccount, courseRef: 'pensa' })
    const full = await join(ctx, code, as(extraProfile, extraAccount))
    expect(full.status).toBe(409)
    expect((await json(full)).error.code).toBe('PENSA_TEAM_FULL')
  })

  test('o membro sai por `me`; o dono tira um membro; o dono não "sai"; quem saiu perde o acesso', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    expect((await join(ctx, code)).status).toBe(200)
    const base = `/members/pensa/projects/${plan.id}`
    const ownerLeaves = await req(ctx.app, 'DELETE', `${base}/members/me`, asA)
    expect(ownerLeaves.status).toBe(409)
    expect((await json(ownerLeaves)).error.code).toBe('PENSA_OWNER_CANNOT_LEAVE')
    expect((await req(ctx.app, 'DELETE', `${base}/members/me`, asB)).status).toBe(200)
    expect((await req(ctx.app, 'GET', base, asB)).status).toBe(404)
    // Entra de novo e o dono tira; tirar quem não está é 404.
    expect((await join(ctx, code)).status).toBe(200)
    expect((await req(ctx.app, 'DELETE', `${base}/members/${B}`, asA)).status).toBe(200)
    expect((await req(ctx.app, 'GET', base, asB)).status).toBe(404)
    expect((await req(ctx.app, 'DELETE', `${base}/members/${B}`, asA)).status).toBe(404)
  })

  test('apagar o plano leva a equipe junto (o membro cai em 404) e a cota de criar ignora os planos em que entrei', async () => {
    const ctx = buildTeam()
    const plan = await createPlan(ctx)
    const { code } = await share(ctx, plan.id)
    expect((await join(ctx, code)).status).toBe(200)
    // B entrou numa equipe mas não criou nada: a cota de criar continua zerada para B.
    expect(await ctx.pensa.countActiveProjects(B, 'kids')).toBe(0)
    expect(await ctx.pensa.countMemberships(B, 'kids')).toBe(1)
    expect((await req(ctx.app, 'DELETE', `/members/pensa/projects/${plan.id}`, asA)).status).toBe(
      200,
    )
    expect((await req(ctx.app, 'GET', `/members/pensa/projects/${plan.id}`, asB)).status).toBe(404)
    expect(await ctx.pensa.countMemberships(B, 'kids')).toBe(0)
  })

  test('`/projects/join` não colide com `/projects/:projectId`: código inválido é 404 de convite, não 422 de uuid', async () => {
    const ctx = buildTeam()
    const bad = await join(ctx, 'ZAP-000000')
    expect(bad.status).toBe(404)
    expect((await json(bad)).error.code).toBe('PENSA_INVITE_INVALID')
  })
})
