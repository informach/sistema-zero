import { describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { buildApp, grantAllKidsCourses, grantCommunity, grantLifetime } from '../helpers'

const TOKEN = 'internal-token-16-chars!!'

/**
 * Rota do ALUNO `GET /members/access` (fronteada por JWT): o gateway injeta
 * `x-internal-token` (origem) + `x-auth-user-id`/`x-auth-account-id`. O acesso
 * resolve pela CONTA (`x-auth-account-id ?? x-auth-user-id`).
 */
function get(refs: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://local/members/access?refs=${encodeURIComponent(refs)}`, {
    method: 'GET',
    headers,
  })
}

const ok = (accountId: string) => ({
  'x-internal-token': TOKEN,
  'x-auth-user-id': accountId,
})

describe('GET /members/access', () => {
  test('matrícula de COMUNIDADE no ref → hasAccess true', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const accountId = randomUUID()
    grantCommunity(entitlements, { userId: accountId, communityKey: 'estudio-completo' })

    const res = await app.handle(get('estudio-completo', ok(accountId)))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(true)
  })

  test('matrícula de CURSO no ref → hasAccess true', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const accountId = randomUUID()
    grantLifetime(entitlements, { userId: accountId, courseRef: 'estudio-completo' })

    const res = await app.handle(get('estudio-completo', ok(accountId)))
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(true)
  })

  test('chave-mestra KIDS cobre o ref (audience=kids)', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const accountId = randomUUID()
    grantAllKidsCourses(entitlements, { userId: accountId })

    const res = await app.handle(
      get('estudio-completo', { ...ok(accountId), 'x-auth-account-id': accountId }),
    )
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(true)
  })

  test('sem matrícula → hasAccess false', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(get('estudio-completo', ok(randomUUID())))
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(false)
  })

  test('acesso resolve pela CONTA em sessão de perfil', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const accountId = randomUUID()
    const profileId = randomUUID()
    // O responsável (conta) comprou; a criança (perfil) navega.
    grantCommunity(entitlements, { userId: accountId, communityKey: 'estudio-completo' })

    const res = await app.handle(
      get('estudio-completo', {
        'x-internal-token': TOKEN,
        'x-auth-user-id': profileId,
        'x-auth-account-id': accountId,
      }),
    )
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(true)
  })

  test('sem x-internal-token quando exigido → 401', async () => {
    const { app } = buildApp({ internalToken: TOKEN })
    const res = await app.handle(get('estudio-completo', { 'x-auth-user-id': randomUUID() }))
    expect(res.status).toBe(401)
  })

  test('ref de formato inválido volta como false EXPLÍCITO (não some do mapa)', async () => {
    const { app, entitlements } = buildApp({ internalToken: TOKEN })
    const accountId = randomUUID()
    grantCommunity(entitlements, { userId: accountId, communityKey: 'estudio-completo' })

    // 'Estudio_Completo' tem maiúscula/underscore → não é slug válido (não vai à query).
    const res = await app.handle(get('estudio-completo,Estudio_Completo', ok(accountId)))
    const body = (await res.json()) as { access: Record<string, boolean> }
    expect(body.access['estudio-completo']).toBe(true)
    // A ref inválida AINDA aparece no mapa, como false (antes sumia → chamador não
    // distinguia "negado" de "descartado").
    expect(body.access).toHaveProperty('Estudio_Completo')
    expect(body.access.Estudio_Completo).toBe(false)
  })
})
