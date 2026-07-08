import { describe, expect, it } from 'bun:test'
import { buildTestApp, INTERNAL_TOKEN, json, request } from '../helpers'

/** Callback é rota PÚBLICA no gateway (sem X-Auth), mas com o token interno. */
function callback(
  app: { handle: (r: Request) => Promise<Response> },
  qs: string,
): Promise<Response> {
  return app.handle(
    new Request(`http://localhost/helpdesk/oauth/google/callback?${qs}`, {
      headers: { 'x-internal-token': INTERNAL_TOKEN },
    }),
  )
}

describe('OAuth Gmail', () => {
  it('start sem o grupo Google configurado → 503', async () => {
    const { app } = buildTestApp({ gmailEnabled: false })
    const res = await request(app, 'POST', '/helpdesk/oauth/google/start')
    expect(res.status).toBe(503)
    expect((await json(res)).error.code).toBe('GMAIL_NOT_CONFIGURED')
  })

  it('start devolve a authorizeUrl e persiste o state single-use', async () => {
    const { app, repos } = buildTestApp({ gmailEnabled: true })
    const res = await request(app, 'POST', '/helpdesk/oauth/google/start')
    expect(res.status).toBe(200)
    const { authorizeUrl } = await json(res)
    const state = new URL(authorizeUrl).searchParams.get('state')
    expect(state).toBeTruthy()
    expect(repos.oauthStates.rows.has(state as string)).toBe(true)
  })

  it('callback feliz: cria a conexão e redireciona connected=google', async () => {
    const { app, repos, gmailClient } = buildTestApp({ gmailEnabled: true })
    gmailClient.profile = { emailAddress: 'contato@sistemazero.com.br', historyId: '42' }
    const start = await json(await request(app, 'POST', '/helpdesk/oauth/google/start'))
    const state = new URL(start.authorizeUrl).searchParams.get('state')

    const res = await callback(app, `code=abc&state=${state}`)
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://app.test/configuracoes?connected=google')

    const conn = await repos.connections.current()
    expect(conn?.emailAddress).toBe('contato@sistemazero.com.br')
    expect(conn?.status).toBe('connected')
    expect(conn?.lastHistoryId).toBeNull() // nova conexão → 1º tick faz o backfill
    expect(conn?.accessTokenEnc).toContain('sealed(') // token selado, nunca em claro
  })

  it('callback com state inválido → 302 error=state_invalid', async () => {
    const { app } = buildTestApp({ gmailEnabled: true })
    const res = await callback(app, 'code=abc&state=nao-existe')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('http://app.test/configuracoes?error=state_invalid')
  })

  it('callback com error do Google → 302 error=access_denied', async () => {
    const { app } = buildTestApp({ gmailEnabled: true })
    const res = await callback(app, 'error=access_denied&state=x')
    expect(res.headers.get('location')).toBe('http://app.test/configuracoes?error=access_denied')
  })

  it('state é single-use: reuso do mesmo state → state_invalid', async () => {
    const { app } = buildTestApp({ gmailEnabled: true })
    const start = await json(await request(app, 'POST', '/helpdesk/oauth/google/start'))
    const state = new URL(start.authorizeUrl).searchParams.get('state')
    await callback(app, `code=abc&state=${state}`)
    const second = await callback(app, `code=abc&state=${state}`)
    expect(second.headers.get('location')).toBe('http://app.test/configuracoes?error=state_invalid')
  })

  it('reconexão preserva o lastHistoryId (retoma o sync, não re-backfill)', async () => {
    const { app, repos } = buildTestApp({ gmailEnabled: true })
    const start1 = await json(await request(app, 'POST', '/helpdesk/oauth/google/start'))
    await callback(app, `code=a&state=${new URL(start1.authorizeUrl).searchParams.get('state')}`)
    // simula que o worker já sincronizou
    const conn = await repos.connections.current()
    if (conn) {
      conn.lastHistoryId = '999'
      await repos.connections.update(conn)
    }
    const start2 = await json(await request(app, 'POST', '/helpdesk/oauth/google/start'))
    await callback(app, `code=b&state=${new URL(start2.authorizeUrl).searchParams.get('state')}`)

    const after = await repos.connections.current()
    expect(after?.lastHistoryId).toBe('999') // retomou, não re-backfill
    expect(repos.connections.rows.size).toBe(1) // mesma linha (byExternalId)
  })
})
