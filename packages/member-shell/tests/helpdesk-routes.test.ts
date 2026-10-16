import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server. Os handlers são testados isoladamente.
mock.module('server-only', () => ({}))

const { createHelpdeskRoutes } = await import('../src/routes/helpdesk')

const TICKET_ID = '2f1fb385-caad-47c2-9709-47f922584276'

function routes(options?: { readonly?: boolean; retryAfter?: string }) {
  const calls: Array<{ path: string; options: unknown }> = []
  const instance = createHelpdeskRoutes({
    // Explícito de propósito: sem ele `portal: undefined` satisfaria o toEqual e o
    // caso da criação passaria vazio.
    audience: 'kids',
    gateway: {
      gatewayFetch: async (path: string, requestOptions?: unknown) => {
        calls.push({ path, options: requestOptions })
        return {
          status: options?.retryAfter ? 429 : 200,
          body: { ok: true },
          retryAfter: options?.retryAfter,
        }
      },
    },
    session: {
      getSession: async () =>
        options?.readonly
          ? {
              id: 'customer-1',
              email: 'cliente@example.com',
              firstName: 'Cliente',
              lastName: 'Teste',
              role: 'customer',
              status: 'active',
              act: { sub: 'admin-1', email: 'admin@example.com', mode: 'readonly' as const },
            }
          : null,
    },
  } as never)
  return { ...instance, calls }
}

describe('BFF do portal de atendimento', () => {
  test('encaminha o cursor opaco da próxima página sem expor offset mutável', async () => {
    const { helpdeskTickets, calls } = routes()
    const res = await helpdeskTickets.GET(
      new Request(
        'https://community.test/api/helpdesk/portal/tickets?limit=20&cursor=cursor-opaco',
      ),
    )

    expect(res.status).toBe(200)
    expect(calls).toEqual([
      {
        path: '/helpdesk/portal/tickets',
        options: { query: { limit: 20, cursor: 'cursor-opaco' } },
      },
    ])
  })

  test('valida a criação e encaminha o payload permitido + o `portal` deste app ao Helpdesk', async () => {
    const { helpdeskTickets, calls } = routes()
    const res = await helpdeskTickets.POST(
      new Request('https://community.test/api/helpdesk/portal/tickets', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: TICKET_ID,
          subject: '  Não consigo abrir a aula  ',
          body: '  A tela fica carregando.  ',
          category: 'curso_acesso',
        }),
      }),
    )

    expect(res.status).toBe(200)
    expect(calls).toEqual([
      {
        path: '/helpdesk/portal/tickets',
        options: {
          method: 'POST',
          body: {
            idempotencyKey: TICKET_ID,
            subject: 'Não consigo abrir a aula',
            body: 'A tela fica carregando.',
            category: 'curso_acesso',
            portal: 'kids',
          },
        },
      },
    ])
  })

  test('recusa id inválido antes de chamar o gateway', async () => {
    const { helpdeskTicket, calls } = routes()
    const res = await helpdeskTicket.GET(new Request('https://community.test/api/helpdesk'), {
      params: Promise.resolve({ id: 'não-é-uuid' }),
    })

    expect(res.status).toBe(400)
    expect(calls).toEqual([])
  })

  test('recusa mensagem fora do contrato antes de chamar o gateway', async () => {
    const { helpdeskTicketMessages, calls } = routes()
    const res = await helpdeskTicketMessages.POST(
      new Request(`https://community.test/api/helpdesk/${TICKET_ID}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: '', injected: true }),
      }),
      { params: Promise.resolve({ id: TICKET_ID }) },
    )

    expect(res.status).toBe(400)
    expect(calls).toEqual([])
  })

  test('não permite que impersonação somente-leitura crie chamado', async () => {
    const { helpdeskTickets, calls } = routes({ readonly: true })
    const res = await helpdeskTickets.POST(
      new Request('https://community.test/api/helpdesk/portal/tickets', {
        method: 'POST',
        body: JSON.stringify({ subject: 'Ajuda com acesso', body: 'Não consigo entrar no curso.' }),
      }),
    )

    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: { code: 'IMPERSONATION_READONLY' } })
    expect(calls).toEqual([])
  })
})

test('novos comandos preservam readonly e leituras validam cursores/fontes', async () => {
  const readonly = routes({ readonly: true })
  for (const route of [readonly.helpdeskTicketHandoff, readonly.helpdeskTicketResolve]) {
    const result = await route.POST(
      new Request('https://community.test/api/helpdesk', {
        method: 'POST',
        body: JSON.stringify({ idempotencyKey: TICKET_ID }),
      }),
      { params: Promise.resolve({ id: TICKET_ID }) },
    )
    expect(result.status).toBe(403)
  }
  expect(readonly.calls).toHaveLength(0)
  const normal = routes()
  const invalid = await normal.helpdeskTicketMessages.GET(
    new Request('https://community.test/api/helpdesk?before=x&after=y'),
    { params: Promise.resolve({ id: TICKET_ID }) },
  )
  expect(invalid.status).toBe(400)
  const source = await normal.helpdeskTicketSource.GET(
    new Request('https://community.test/api/helpdesk'),
    { params: Promise.resolve({ id: TICKET_ID, citationId: TICKET_ID }) },
  )
  expect(source.status).toBe(200)
  expect(normal.calls[0]?.path).toBe(`/helpdesk/portal/tickets/${TICKET_ID}/sources/${TICKET_ID}`)
})

test('preserva Retry-After para o polling respeitar o gateway', async () => {
  const { helpdeskTickets } = routes({ retryAfter: '35' })
  const result = await helpdeskTickets.GET(new Request('https://community.test/api/helpdesk'))
  expect(result.status).toBe(429)
  expect(result.headers.get('retry-after')).toBe('35')
})
