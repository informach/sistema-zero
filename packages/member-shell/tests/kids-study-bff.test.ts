import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import { SignJWT } from 'jose'

mock.module('server-only', () => ({}))
const jar = new Map<string, string>()
let requestHeaders = new Headers()
mock.module('next/headers', () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined),
    set: (name: string, value: string) => {
      cookieWrites.push(name)
      if (value) jar.set(name, value)
      else jar.delete(name)
    },
  }),
}))
process.env.GATEWAY_URL = 'http://gateway.test'
process.env.JWT_HS256_SECRET = 'segredo-de-teste-com-32-caracteres!'
delete process.env.JWT_JWKS_URL
const { getEnv } = await import('../src/lib/env')
const { createShell } = await import('../src/index')
const shell = createShell({ cookieBase: 'test_kids', audience: 'kids', serviceName: 'kids-test' })
const originalFetch = globalThis.fetch
const parentId = '11111111-1111-4111-8111-111111111111'
const profileId = '22222222-2222-4222-8222-222222222222'
const parentSession = '33333333-3333-4333-8333-333333333333'
const deviceId = '44444444-4444-4444-8444-444444444444'
const grantId = '55555555-5555-4555-8555-555555555555'
let valid = true
let logoutFails = false
let validationUnavailable = false
let gatewayRejectsSignature = false
const cookieWrites: string[] = []
const calls: string[] = []
const sent = new Map<string, { headers: Headers; body: string | null }>()

async function token(
  kids?: Record<string, unknown>,
  child = false,
  extra: Record<string, unknown> = {},
) {
  const env = getEnv()
  let jwt = new SignJWT({
    email: 'parent@example.test',
    firstName: 'Responsável',
    lastName: 'Teste',
    role: 'customer',
    status: 'active',
    typ: 'access',
    ...(kids ? { kids } : {}),
    ...(child ? { pfl: { accountId: parentId, name: 'Ana' } } : {}),
    ...extra,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(child ? profileId : parentId)
    .setIssuedAt()
    .setExpirationTime('15m')
  if (env.JWT_ISSUER) jwt = jwt.setIssuer(env.JWT_ISSUER)
  if (env.JWT_AUDIENCE) jwt = jwt.setAudience(env.JWT_AUDIENCE)
  return jwt.sign(new TextEncoder().encode(env.JWT_HS256_SECRET))
}
async function parent() {
  jar.set(
    shell.cookies.accessCookie,
    await token({
      kind: 'parent',
      sessionId: parentSession,
      authenticatedAt: Math.floor(Date.now() / 1000),
    }),
  )
  jar.set(shell.cookies.refreshCookie, crypto.randomUUID())
  requestHeaders.set('x-sz-session', parentSession)
}
function request(path: string, body: unknown) {
  return new Request(`http://kids.test/api/study/${path}`, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(body),
  })
}
beforeEach(() => {
  jar.clear()
  requestHeaders = new Headers({ 'content-type': 'application/json' })
  valid = true
  logoutFails = false
  validationUnavailable = false
  gatewayRejectsSignature = false
  cookieWrites.length = 0
  calls.length = 0
  sent.clear()
  globalThis.fetch = Object.assign(
    mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(input instanceof Request ? input.url : String(input)).pathname
      calls.push(path)
      sent.set(path, {
        headers: new Headers(init?.headers),
        body: typeof init?.body === 'string' ? init.body : null,
      })
      // O Gateway introspecta toda chamada Kids e devolve 503 quando o Auth não responde.
      if (path === '/auth/me' && validationUnavailable)
        return Response.json({ error: { code: 'AUTH_UNAVAILABLE' } }, { status: 503 })
      // Sessão de perfil: o Auth devolve só o próprio perfil, sem a ficha da conta.
      if (path === '/auth/me') {
        const bearer = new Headers(init?.headers).get('authorization') ?? ''
        const claims = JSON.parse(
          Buffer.from(bearer.split('.')[1] ?? 'e30', 'base64url').toString() || '{}',
        )
        return Response.json(
          claims.pfl
            ? {
                profile: {
                  id: profileId,
                  name: 'Ana',
                  avatarUrl: null,
                  whatsapp: null,
                  birthDate: '2016-05-01',
                  publicProfileEnabled: false,
                  sortOrder: 0,
                },
              }
            : { user: { id: parentId, email: 'parent@example.test' } },
        )
      }
      if (path === '/auth/kids/session/validate') {
        if (gatewayRejectsSignature)
          return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
        if (validationUnavailable) return Response.json({}, { status: 503 })
        return valid
          ? Response.json({ valid })
          : Response.json({ error: { code: 'KIDS_SESSION_INVALID' } }, { status: 401 })
      }
      if (path === '/auth/logout') return Response.json({}, { status: logoutFails ? 503 : 200 })
      if (path === '/auth/kids/device')
        return Response.json({
          profiles: [
            {
              id: profileId,
              name: 'Ana',
              available: true,
              expiresAt: '2099-01-01',
              revoked: false,
            },
          ],
        })
      if (path === '/members/internal/device-avatars') return Response.json({ photos: {} })
      if (path === '/auth/kids/enter')
        return Response.json({
          tokens: {
            accessToken: 'new-access',
            refreshToken: 'new-refresh',
            tokenType: 'Bearer',
            expiresIn: 900,
            refreshExpiresIn: 3600,
          },
        })
      if (path === `/auth/profiles/${profileId}/select`)
        return Response.json({
          tokens: {
            accessToken: 'support-access',
            refreshToken: 'support-refresh',
            tokenType: 'Bearer',
            expiresIn: 900,
            refreshExpiresIn: 3600,
          },
        })
      return Response.json({ ok: true })
    }),
    { preconnect: originalFetch.preconnect },
  )
})
afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('BFF Kids: autorização e entrega do aparelho', () => {
  test('não aceita sessão legada e consulta revogação mesmo com JWT válido', async () => {
    expect((await shell.session.verifyAccessToken(await token())).ok).toBe(false)
    await parent()
    expect(await shell.session.getSession()).toMatchObject({ kids: { kind: 'parent' } })
    valid = false
    expect(await shell.session.getSession()).toBeNull()
  })
  test('prepara o cookie antes do resgate e não o substitui numa repetição', async () => {
    const missing = await shell.routes.studyRedeem.POST(request('redeem', { code: 'ABCDE-FGHJK' }))
    expect(missing.status).toBe(409)
    expect(calls).not.toContain('/auth/kids/redeem')
    await shell.routes.studyPrepare.POST()
    const first = await shell.study.getDeviceToken()
    expect(first).toHaveLength(43)
    await shell.routes.studyPrepare.POST()
    expect(await shell.study.getDeviceToken()).toBe(first)
    expect(cookieWrites.filter((name) => name.endsWith('_device'))).toHaveLength(2)
    expect(jar.has(shell.cookies.accessCookie)).toBe(false)
  })
  test('só entrega a sessão infantil depois de revogar a sessão adulta', async () => {
    await parent()
    await shell.routes.studyPrepare.POST()
    const result = await shell.routes.studyEnter.POST(request('enter', { profileId }))
    expect(result.status).toBe(200)
    expect(calls.indexOf('/auth/logout')).toBeLessThan(calls.indexOf('/auth/kids/enter'))
    expect(jar.get(shell.cookies.accessCookie)).toBe('new-access')
    expect(await shell.study.getDeviceToken()).toHaveLength(43)
  })
  test('consulta de sessão distingue indisponibilidade de encerramento confirmado', async () => {
    await parent()
    validationUnavailable = true
    expect((await shell.routes.studySession.GET()).status).toBe(503)
    calls.length = 0
    expect((await shell.gateway.gatewayFetch('/auth/me')).status).toBe(503)
    // Uma introspecção só, a do Gateway: o BFF não confere de novo antes de chamar.
    expect(calls).toEqual(['/auth/me'])
    const upload = await shell.media.requireUploadSession(
      new Request('http://kids.test/api/members/avatar/snapshot', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin', 'x-sz-session': parentSession },
      }),
    )
    expect(upload instanceof Response && upload.status).toBe(503)
    const unavailable = await shell.session.getSession().then(
      () => null,
      (error: unknown) => error,
    )
    expect(unavailable instanceof Error).toBe(true)
    expect(jar.has(shell.cookies.accessCookie)).toBe(true)
    validationUnavailable = false
    valid = false
    const revoked = await shell.routes.studySession.GET()
    expect(revoked.status).toBe(200)
    expect(await revoked.json()).toEqual({ sessionId: null })
  })
  test('falha ao encerrar adulto impede emissão e mantém os cookies antigos', async () => {
    await parent()
    await shell.routes.studyPrepare.POST()
    logoutFails = true
    const old = jar.get(shell.cookies.accessCookie)
    const result = await shell.routes.studyEnter.POST(request('enter', { profileId }))
    expect(result.status).toBe(503)
    expect(calls).not.toContain('/auth/kids/enter')
    expect(jar.get(shell.cookies.accessCookie)).toBe(old)
  })
  test('página antiga não grava depois de troca, inclusive upload local', async () => {
    await parent()
    requestHeaders.set('x-sz-session', 'old-session')
    const result = await shell.gateway.gatewayFetch('/auth/profiles', {
      method: 'POST',
      body: { name: 'Ana' },
    })
    expect(result.status).toBe(409)
    expect(calls).not.toContain('/auth/profiles')
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId: crypto.randomUUID(), deviceId, grantId }, true),
    )
    const upload = await shell.media.requireUploadSession(
      new Request('http://kids.test/api/members/avatar/snapshot', {
        method: 'POST',
        headers: { 'sec-fetch-site': 'same-origin', 'x-sz-session': 'old-session' },
      }),
    )
    expect(upload).toBeInstanceOf(Response)
    if (upload instanceof Response) expect(upload.status).toBe(409)
  })
  test('criança não recebe lista de acessos da gestão', async () => {
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId: crypto.randomUUID(), deviceId, grantId }, true),
    )
    jar.set(shell.cookies.refreshCookie, crypto.randomUUID())
    const response = await shell.routes.studyGrants.GET(
      new Request(`http://kids.test/api/study/grants?profileId=${profileId}`),
    )
    expect(response.status).toBe(403)
    expect(calls).not.toContain('/auth/kids/grants/list')
  })
  test('conferência da sessão vai assinada como member-shell, sem o IP da criança', async () => {
    await parent()
    requestHeaders.set('x-forwarded-for', '203.0.113.50')
    expect(await shell.session.getSession()).toMatchObject({ kids: { kind: 'parent' } })
    const validate = sent.get('/auth/kids/session/validate')
    expect(validate?.headers.get('x-consumer-id')).toBe('member-shell')
    expect(validate?.headers.get('x-signature')).toMatch(/^t=\d+,v1=[0-9a-f]+$/)
    expect(validate?.headers.get('authorization')).toStartWith('Bearer ')
    expect(validate?.headers.get('x-forwarded-for')).toBeNull()
  })
  test('miniaturas pedem o teto por navegador sem mandar o segredo do aparelho', async () => {
    await shell.routes.studyPrepare.POST()
    const deviceToken = await shell.study.getDeviceToken()
    expect((await shell.routes.studyDevice.GET()).status).toBe(200)
    const body = JSON.parse(sent.get('/members/internal/device-avatars')?.body ?? '{}')
    const expected = new Bun.CryptoHasher('sha256')
      .update(`device-avatars:${deviceToken}`)
      .digest('hex')
    expect(body).toEqual({ profileIds: [profileId], rateLimitKey: expected })
    expect(JSON.stringify(body)).not.toContain(deviceToken ?? 'sem-token')
  })
  test('sair esquecendo um perfil só vale para o perfil da sessão atual', async () => {
    const sessionId = crypto.randomUUID()
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId, deviceId, grantId }, true),
    )
    jar.set(shell.cookies.refreshCookie, crypto.randomUUID())
    requestHeaders.set('x-sz-session', sessionId)
    await shell.routes.studyPrepare.POST()
    const sibling = '66666666-6666-4666-8666-666666666666'
    const refused = await shell.routes.studyLeave.POST(
      request('leave', { forgetProfileId: sibling }),
    )
    expect(refused.status).toBe(403)
    expect(await refused.json()).toEqual({ error: { code: 'PROFILE_MISMATCH' } })
    expect(calls).not.toContain('/auth/kids/disconnect')
    expect(calls).not.toContain('/auth/logout')
    const own = await shell.routes.studyLeave.POST(request('leave', { forgetProfileId: profileId }))
    expect(own.status).toBe(200)
    expect(JSON.parse(sent.get('/auth/kids/disconnect')?.body ?? '{}').profileId).toBe(profileId)
  })
  test('esquecer o navegador inteiro exige responsável e não encerra a sessão adulta', async () => {
    const sessionId = crypto.randomUUID()
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId, deviceId, grantId }, true),
    )
    jar.set(shell.cookies.refreshCookie, crypto.randomUUID())
    requestHeaders.set('x-sz-session', sessionId)
    await shell.routes.studyPrepare.POST()
    const child = await shell.routes.studyForget.POST(request('forget', { confirm: true }))
    expect(child.status).toBe(403)
    expect(calls).not.toContain('/auth/kids/forget')
    expect(await shell.study.getDeviceToken()).toHaveLength(43)

    await parent()
    const access = jar.get(shell.cookies.accessCookie)
    const result = await shell.routes.studyForget.POST(request('forget', { confirm: true }))
    expect(result.status).toBe(200)
    expect(sent.get('/auth/kids/forget')?.headers.get('authorization')).toBe(`Bearer ${access}`)
    expect(await shell.study.getDeviceToken()).toBeNull()
    expect(calls).not.toContain('/auth/logout')
    expect(jar.get(shell.cookies.accessCookie)).toBe(access)
  })
  test('a criança lê o próprio perfil pelo /auth/me, sem a lista da família', async () => {
    const sessionId = crypto.randomUUID()
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId, deviceId, grantId }, true),
    )
    jar.set(shell.cookies.refreshCookie, crypto.randomUUID())
    const mine = await shell.auth.getMyProfileReadonly()
    expect(mine).toEqual({
      status: 200,
      body: {
        profile: {
          id: profileId,
          name: 'Ana',
          avatarUrl: null,
          whatsapp: null,
          birthDate: '2016-05-01',
          publicProfileEnabled: false,
          sortOrder: 0,
        },
      },
    })
    expect(calls).not.toContain('/auth/profiles')
    await parent()
    expect((await shell.auth.getMyProfileReadonly()).body.profile).toBeNull()
  })
  test('401 do Gateway (assinatura recusada) não desloga a criança: vira indisponível', async () => {
    await parent()
    gatewayRejectsSignature = true
    const failure = await shell.session.getSession().then(
      () => null,
      (error: unknown) => error,
    )
    expect(failure instanceof Error).toBe(true)
    expect((await shell.routes.studySession.GET()).status).toBe(503)
    expect(jar.has(shell.cookies.accessCookie)).toBe(true)
  })
  test('seleção antiga fica fechada para a família e disponível somente ao suporte identificado', async () => {
    const ctx = { params: Promise.resolve({ id: profileId }) }
    await parent()
    expect((await shell.routes.profileSelect.POST(request('select', {}), ctx)).status).toBe(410)
    jar.set(
      shell.cookies.accessCookie,
      await token({ kind: 'student', sessionId: crypto.randomUUID(), deviceId, grantId }, true),
    )
    expect((await shell.routes.profileSelect.POST(request('select', {}), ctx)).status).toBe(410)
    jar.set(
      shell.cookies.accessCookie,
      await token(undefined, false, {
        act: {
          sub: crypto.randomUUID(),
          email: 'support@example.com',
          name: 'Suporte',
          mode: 'readonly',
        },
      }),
    )
    const result = await shell.routes.profileSelect.POST(request('select', {}), ctx)
    expect(result.status).toBe(200)
    expect(jar.get(shell.cookies.accessCookie)).toBe('support-access')
    expect(calls).not.toContain('/auth/kids/grants')
    expect(await shell.study.getDeviceToken()).toBeNull()
  })
})
