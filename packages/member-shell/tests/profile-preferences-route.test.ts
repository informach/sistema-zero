import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server; neutraliza para exercitar o handler real.
mock.module('server-only', () => ({}))

const { createProfilePreferencesRoutes } = await import('../src/routes/profile-preferences')
const { PALETTE_COOKIE_MAX_AGE } = await import('../src/lib/palette-cookie')

const COOKIE = 'sz_kids_palette'
const DONO = '11111111-1111-4111-8111-111111111111'
const ALUNO = { id: DONO, email: 'a@b.test', firstName: 'A', lastName: 'B', status: 'active' }

/** O handler com um gateway espião — cada teste vê SE e COM O QUÊ ele foi chamado. */
function montar(opcoes?: { user?: unknown; resposta?: { status: number; body: unknown } }) {
  const chamadas: { path: string; init: { method?: string; body?: unknown } }[] = []
  const rotas = createProfilePreferencesRoutes(
    // ⚠️ `?? ALUNO` transformaria o caso "sem sessão" (null) em sessão válida.
    { getSession: async () => (opcoes && 'user' in opcoes ? opcoes.user : ALUNO) } as never,
    {
      gatewayFetch: async (path: string, init: { method?: string; body?: unknown }) => {
        chamadas.push({ path, init })
        return opcoes?.resposta ?? { status: 200, body: { palette: 'orange' } }
      },
    } as never,
    COOKIE,
  )
  return { rotas, chamadas }
}

const pedido = (metodo: 'GET' | 'PUT', corpo?: unknown, viewer: string = DONO) =>
  new Request('https://kids.test/api/members/preferences', {
    method: metodo,
    headers: { 'x-sz-viewer': viewer, 'content-type': 'application/json' },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })

describe('a rota da cor do perfil', () => {
  test('sem sessão responde 401 e NÃO fala com o gateway', async () => {
    const { rotas, chamadas } = montar({ user: null })
    const res = await rotas.PUT(pedido('PUT', { palette: 'pink' }))
    expect(res.status).toBe(401)
    expect(chamadas).toEqual([])
  })

  /**
   * ⚠️ O irmão que entra no meio de um clique em voo. Sem esta conferência a escolha de um perfil
   * cairia no outro — é o mesmo defeito que o dono dentro do cookie fecha do lado do servidor.
   */
  test('viewer diferente da sessão responde 409 e NÃO grava nada', async () => {
    const { rotas, chamadas } = montar()
    const res = await rotas.PUT(pedido('PUT', { palette: 'pink' }, 'outro-perfil'))
    expect(res.status).toBe(409)
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'VIEWER_CHANGED' } })
    expect(chamadas).toEqual([])
  })

  test('cor fora do catálogo é recusada na borda, antes do gateway', async () => {
    const { rotas, chamadas } = montar()
    for (const corpo of [
      { palette: 'roxo-neon' },
      { palette: 3 },
      { palette: 'pink', x: 1 },
      null,
    ]) {
      const res = await rotas.PUT(pedido('PUT', corpo))
      expect({ corpo, status: res.status }).toEqual({ corpo, status: 400 })
    }
    expect(chamadas).toEqual([])
  })

  test('corpo grande demais nem é analisado', async () => {
    const { rotas, chamadas } = montar()
    const res = await rotas.PUT(pedido('PUT', { palette: 'pink', lixo: 'x'.repeat(1200) }))
    expect(res.status).toBe(400)
    expect(chamadas).toEqual([])
  })

  test('PUT válido repassa a cor e espelha no cookie, com a validade de seis horas', async () => {
    const { rotas, chamadas } = montar({ resposta: { status: 200, body: { palette: 'teal' } } })
    const res = await rotas.PUT(pedido('PUT', { palette: 'teal' }))
    expect(res.status).toBe(200)
    expect(chamadas).toEqual([
      { path: '/members/preferences', init: { method: 'PUT', body: { palette: 'teal' } } },
    ])
    const cookie = res.cookies.get(COOKIE)
    // ⚠️ O dono vai DENTRO do valor: é assim que o proxy sabe de quem é a cor.
    expect(cookie?.value).toBe(`${DONO}.teal`)
    expect(cookie?.maxAge).toBe(PALETTE_COOKIE_MAX_AGE)
    expect(cookie?.httpOnly).toBe(true)
  })

  /** "Nunca escolheu" é um estado, e o cookie precisa saber dizê-lo. */
  test('cor nula vira espelho de cor nula, não ausência de cookie', async () => {
    const { rotas } = montar({ resposta: { status: 200, body: { palette: null } } })
    const res = await rotas.PUT(pedido('PUT', { palette: null }))
    expect(res.cookies.get(COOKIE)?.value).toBe(`${DONO}.`)
  })

  /** O GET é o auto-conserto de um espelho atrasado — por isso ele TAMBÉM grava. */
  test('GET não manda corpo e grava o espelho', async () => {
    const { rotas, chamadas } = montar({ resposta: { status: 200, body: { palette: 'purple' } } })
    const res = await rotas.GET(pedido('GET'))
    expect(chamadas).toEqual([{ path: '/members/preferences', init: { method: 'GET' } }])
    expect(res.cookies.get(COOKIE)?.value).toBe(`${DONO}.purple`)
  })

  /**
   * ⚠️⚠️ Espelho só do que o servidor CONFIRMOU. Gravar em cima de uma recusa deixaria o aparelho
   * seis horas pintado com uma cor que o banco não tem.
   */
  test('resposta que não é 2xx NÃO mexe no espelho', async () => {
    const { rotas } = montar({ resposta: { status: 503, body: { error: { code: 'X' } } } })
    const res = await rotas.PUT(pedido('PUT', { palette: 'green' }))
    expect(res.status).toBe(503)
    expect(res.cookies.get(COOKIE)).toBeUndefined()
  })

  test('impersonação somente-leitura lê, mas não grava', async () => {
    const suporte = { ...ALUNO, act: { sub: 'admin-1', mode: 'readonly' as const } }
    const { rotas, chamadas } = montar({ user: suporte })
    expect((await rotas.PUT(pedido('PUT', { palette: 'pink' }))).status).toBe(403)
    expect(chamadas).toEqual([])
    expect((await rotas.GET(pedido('GET'))).status).toBe(200)
    expect(chamadas).toHaveLength(1)
  })
})
