import { describe, expect, test } from 'bun:test'
import { challengeForMonth } from '../../src/domain/gamification/challenges'
import { buildApp } from '../helpers'

// Clock default do buildApp: 2026-06-02T12:00Z → SP 2026-06-02 → corrente m:2026-06.
const USER = '99999999-9999-4999-8999-999999999999'
const authHeaders = { 'x-auth-user-id': USER }
const adminHeaders = { 'x-auth-user-role': 'admin', 'x-auth-user-status': 'active' }
const staffHeaders = { 'x-auth-user-role': 'staff', 'x-auth-user-status': 'active' }

type App = ReturnType<typeof buildApp>['app']
const readJson = (res: Response): Promise<any> => res.json()

const get = (app: App, path: string, headers: Record<string, string> = {}) =>
  app.handle(new Request(`http://localhost${path}`, { headers }))
const send = (
  app: App,
  path: string,
  method: string,
  body: unknown | null,
  headers: Record<string, string> = {},
) =>
  app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...headers },
      body: body === null ? undefined : JSON.stringify(body),
    }),
  )

async function createTheme(app: App, patch: Partial<Record<string, unknown>> = {}) {
  const res = await send(
    app,
    '/members/admin/challenge/themes',
    'POST',
    {
      emoji: '🎄',
      title: 'Natal dos criadores',
      description: 'Crie um jogo natalino com presentes e neve.',
      suggestedKit: 'Jogo 2D',
      ...patch,
    },
    adminHeaders,
  )
  expect(res.status).toBe(201)
  return readJson(res)
}

describe('GET /members/admin/challenge/months', () => {
  test('12 meses a partir do corrente, todos sorteados por padrão', async () => {
    const { app } = buildApp()
    const res = await get(app, '/members/admin/challenge/months', adminHeaders)
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.months).toHaveLength(12)
    expect(body.months[0]).toMatchObject({
      monthKey: 'm:2026-06',
      month: '2026-06',
      current: true,
      source: 'sorteio',
    })
    expect(body.months[0].theme).toEqual(challengeForMonth('m:2026-06'))
    expect(body.months[1].current).toBe(false)
    expect(body.months[11].month).toBe('2027-05')
    expect(body.months.every((m: any) => m.source === 'sorteio')).toBe(true)
  })

  test('staff também lê (professor de hoje)', async () => {
    const { app } = buildApp()
    expect((await get(app, '/members/admin/challenge/months', staffHeaders)).status).toBe(200)
  })

  test('papel comum → 403 (com o gate de role ligado)', async () => {
    const { app } = buildApp({ requireAdmin: true })
    const res = await get(app, '/members/admin/challenge/months', {
      'x-auth-user-role': 'customer',
      'x-auth-user-status': 'active',
    })
    expect(res.status).toBe(403)
    // Papel administrativo segue passando.
    expect((await get(app, '/members/admin/challenge/months', adminHeaders)).status).toBe(200)
  })
})

describe('PUT/DELETE /members/admin/challenge/months/:month', () => {
  test('define tema builtin para mês futuro e o painel reflete', async () => {
    const { app } = buildApp()
    const res = await send(
      app,
      '/members/admin/challenge/months/2026-08',
      'PUT',
      { builtinSlug: 'neve' },
      adminHeaders,
    )
    expect(res.status).toBe(200)
    const view = await readJson(res)
    expect(view).toMatchObject({ month: '2026-08', source: 'definido' })
    expect(view.theme.slug).toBe('neve')

    const months = (await readJson(await get(app, '/members/admin/challenge/months', adminHeaders)))
      .months
    const ago = months.find((m: any) => m.month === '2026-08')
    expect(ago.source).toBe('definido')
    expect(ago.theme.title).toBe('Mundo de gelo')
  })

  test('define tema CUSTOM no mês corrente e a rota do ALUNO reflete na hora', async () => {
    const { app } = buildApp()
    const theme = await createTheme(app)
    const res = await send(
      app,
      '/members/admin/challenge/months/2026-06',
      'PUT',
      { customThemeId: theme.id },
      adminHeaders,
    )
    expect(res.status).toBe(200)
    const view = await readJson(res)
    expect(view.source).toBe('definido')
    expect(view.customThemeId).toBe(theme.id)
    expect(view.theme.slug).toBe(theme.slug)

    const me = await readJson(
      await get(app, '/members/gamification/challenge?audience=kids', authHeaders),
    )
    expect(me.challenge.key).toBe('m:2026-06')
    expect(me.challenge.title).toBe('Natal dos criadores')
    expect(me.challenge.suggestedKit).toBe('Jogo 2D')
  })

  test('exatamente um: os dois ou nenhum → 400', async () => {
    const { app } = buildApp()
    const theme = await createTheme(app)
    expect(
      (
        await send(
          app,
          '/members/admin/challenge/months/2026-08',
          'PUT',
          { builtinSlug: 'neve', customThemeId: theme.id },
          adminHeaders,
        )
      ).status,
    ).toBe(400)
    expect(
      (await send(app, '/members/admin/challenge/months/2026-08', 'PUT', {}, adminHeaders)).status,
    ).toBe(400)
  })

  test('mês passado → 400 CHALLENGE_MONTH_PAST; fora da janela → 400 CHALLENGE_MONTH_INVALID', async () => {
    const { app } = buildApp()
    const past = await send(
      app,
      '/members/admin/challenge/months/2026-05',
      'PUT',
      { builtinSlug: 'neve' },
      adminHeaders,
    )
    expect(past.status).toBe(400)
    expect((await readJson(past)).error.code).toBe('CHALLENGE_MONTH_PAST')

    const far = await send(
      app,
      '/members/admin/challenge/months/2027-06',
      'PUT',
      { builtinSlug: 'neve' },
      adminHeaders,
    )
    expect(far.status).toBe(400)
    expect((await readJson(far)).error.code).toBe('CHALLENGE_MONTH_INVALID')
  })

  test('builtin inexistente → 404; custom inexistente → 404; custom arquivado → 409', async () => {
    const { app } = buildApp()
    expect(
      (
        await send(
          app,
          '/members/admin/challenge/months/2026-08',
          'PUT',
          { builtinSlug: 'nao-existe' },
          adminHeaders,
        )
      ).status,
    ).toBe(404)
    expect(
      (
        await send(
          app,
          '/members/admin/challenge/months/2026-08',
          'PUT',
          { customThemeId: '00000000-0000-4000-8000-000000000000' },
          adminHeaders,
        )
      ).status,
    ).toBe(404)

    const theme = await createTheme(app)
    await send(
      app,
      `/members/admin/challenge/themes/${theme.id}`,
      'PATCH',
      { archived: true },
      adminHeaders,
    )
    const archived = await send(
      app,
      '/members/admin/challenge/months/2026-08',
      'PUT',
      { customThemeId: theme.id },
      adminHeaders,
    )
    expect(archived.status).toBe(409)
    expect((await readJson(archived)).error.code).toBe('CHALLENGE_THEME_ARCHIVED')
  })

  test('mês definido em tema arquivado SEGUE valendo na resolução', async () => {
    const { app } = buildApp()
    const theme = await createTheme(app)
    await send(
      app,
      '/members/admin/challenge/months/2026-06',
      'PUT',
      { customThemeId: theme.id },
      adminHeaders,
    )
    await send(
      app,
      `/members/admin/challenge/themes/${theme.id}`,
      'PATCH',
      { archived: true },
      adminHeaders,
    )
    const me = await readJson(
      await get(app, '/members/gamification/challenge?audience=kids', authHeaders),
    )
    expect(me.challenge.title).toBe('Natal dos criadores')
  })

  test('DELETE volta ao sorteio e é idempotente', async () => {
    const { app } = buildApp()
    await send(
      app,
      '/members/admin/challenge/months/2026-08',
      'PUT',
      { builtinSlug: 'neve' },
      adminHeaders,
    )
    const res = await send(
      app,
      '/members/admin/challenge/months/2026-08',
      'DELETE',
      null,
      adminHeaders,
    )
    expect(res.status).toBe(200)
    const view = await readJson(res)
    expect(view.source).toBe('sorteio')
    expect(view.theme).toEqual(challengeForMonth('m:2026-08'))

    // Sem override nenhum: segue 200 (no-op).
    expect(
      (await send(app, '/members/admin/challenge/months/2026-08', 'DELETE', null, adminHeaders))
        .status,
    ).toBe(200)
  })
})

describe('biblioteca de temas custom', () => {
  test('POST cria (201), GET lista builtin + custom, PATCH edita e arquiva', async () => {
    const { app } = buildApp()
    const theme = await createTheme(app)
    expect(theme.slug).toBe(`custom-${theme.id.slice(0, 8)}`)
    expect(theme.archived).toBe(false)

    let body = await readJson(await get(app, '/members/admin/challenge/themes', adminHeaders))
    expect(body.builtin).toHaveLength(12)
    expect(body.custom).toHaveLength(1)

    const patched = await readJson(
      await send(
        app,
        `/members/admin/challenge/themes/${theme.id}`,
        'PATCH',
        { title: 'Festa de fim de ano', archived: true },
        adminHeaders,
      ),
    )
    expect(patched.title).toBe('Festa de fim de ano')
    expect(patched.archived).toBe(true)

    body = await readJson(await get(app, '/members/admin/challenge/themes', adminHeaders))
    expect(body.custom[0].archived).toBe(true)
  })

  test('validação do DTO: título vazio → 400; PATCH de tema inexistente → 404', async () => {
    const { app } = buildApp()
    const invalid = await send(
      app,
      '/members/admin/challenge/themes',
      'POST',
      { emoji: '🎯', title: '', description: 'x', suggestedKit: 'Jogo 2D' },
      adminHeaders,
    )
    expect(invalid.status).toBe(400)

    expect(
      (
        await send(
          app,
          '/members/admin/challenge/themes/00000000-0000-4000-8000-000000000000',
          'PATCH',
          { title: 'Novo título' },
          adminHeaders,
        )
      ).status,
    ).toBe(404)
  })
})
