import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp } from '../helpers'

test('perfil adulto começa privado, exige conta própria e a opção pública é revogável imediatamente', async () => {
  const { app } = buildApp()
  const userId = randomUUID()
  const headers = { 'x-auth-user-id': userId, 'content-type': 'application/json' }
  const getPublic = () =>
    app.handle(
      new Request(`http://localhost/members/profiles/${userId}/public?audience=adult`, { headers }),
    )
  expect((await getPublic()).status).toBe(404)
  const initial = await app.handle(
    new Request('http://localhost/members/adult/profile', { headers }),
  )
  expect(await initial.json()).toEqual({
    displayName: 'Criador',
    publicEnabled: false,
    voiceEnabled: false,
  })
  const preferences = { displayName: 'Ana dos jogos', publicEnabled: true, voiceEnabled: false }
  const save = (extraHeaders = {}, body = preferences) =>
    app.handle(
      new Request('http://localhost/members/adult/profile', {
        method: 'PUT',
        headers: { ...headers, ...extraHeaders },
        body: JSON.stringify(body),
      }),
    )
  expect((await save({ 'x-auth-account-id': randomUUID() })).status).toBe(403)
  expect((await save({ 'x-auth-kids-context': 'parent' })).status).toBe(403)
  expect((await save({}, { ...preferences, displayName: '  ' })).status).toBe(400)
  expect((await save()).status).toBe(200)
  const publicResponse = await getPublic()
  expect(publicResponse.status).toBe(200)
  const publicView = await publicResponse.json()
  expect(publicView).toMatchObject({ displayName: preferences.displayName, xp: 0, games: [] })
  for (const field of ['email', 'phone', 'accountId']) expect(publicView).not.toHaveProperty(field)
  const identities = await app.handle(
    new Request(
      `http://localhost/members/adult/profiles/public-identities?ids=${userId},${randomUUID()}`,
      { headers },
    ),
  )
  expect(await identities.json()).toEqual({
    identities: [{ userId, displayName: preferences.displayName }],
  })
  expect((await save({}, { ...preferences, publicEnabled: false })).status).toBe(200)
  expect((await getPublic()).status).toBe(404)
  expect(
    await (
      await app.handle(
        new Request(`http://localhost/members/adult/profiles/public-identities?ids=${userId}`, {
          headers,
        }),
      )
    ).json(),
  ).toEqual({ identities: [] })
})

test('desafios adulto e Kids mantêm temas e meses independentes', async () => {
  const { app } = buildApp({ requireAdmin: true })
  const headers = {
    'x-auth-user-id': randomUUID(),
    'x-auth-user-role': 'admin',
    'x-auth-user-status': 'active',
    'content-type': 'application/json',
  }
  async function create(audience: string, title: string) {
    return app.handle(
      new Request(`http://localhost/members/admin/challenge/themes?audience=${audience}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ emoji: '🎮', title, description: 'Crie um jogo.' }),
      }),
    )
  }
  const kidsTheme = await (await create('kids', 'Tema infantil')).json()
  const adultTheme = await (await create('adult', 'Tema adulto')).json()
  const themeId = (value: unknown) => {
    if (!value || typeof value !== 'object' || !('id' in value) || typeof value.id !== 'string')
      throw new Error('Tema ausente')
    return value.id
  }
  async function setMonth(audience: string, customThemeId: string) {
    return app.handle(
      new Request(`http://localhost/members/admin/challenge/months/2026-06?audience=${audience}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ customThemeId }),
      }),
    )
  }
  expect((await setMonth('kids', themeId(kidsTheme))).status).toBe(200)
  expect((await setMonth('adult', themeId(kidsTheme))).status).toBe(404)
  expect((await setMonth('adult', themeId(adultTheme))).status).toBe(200)
  const getChallenge = (audience: string) =>
    app.handle(
      new Request(`http://localhost/members/gamification/challenge?audience=${audience}`, {
        headers,
      }),
    )
  expect(await (await getChallenge('kids')).json()).toMatchObject({
    challenge: { title: 'Tema infantil' },
  })
  expect(await (await getChallenge('adult')).json()).toMatchObject({
    challenge: { title: 'Tema adulto' },
  })
  expect(
    (
      await app.handle(
        new Request('http://localhost/members/admin/challenge/months/2026-06?audience=adult', {
          method: 'DELETE',
          headers,
        }),
      )
    ).status,
  ).toBe(200)
  expect(await (await getChallenge('kids')).json()).toMatchObject({
    challenge: { title: 'Tema infantil' },
  })
})
