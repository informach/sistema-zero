import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server. Os handlers são testados isoladamente.
mock.module('server-only', () => ({}))

const { createHelpdeskRoutes } = await import('../src/routes/helpdesk')

const TICKET_ID = '2f1fb385-caad-47c2-9709-47f922584276'

function routes(options?: { readonly?: boolean }) {
  const calls: Array<{ path: string; options: unknown }> = []
  const instance = createHelpdeskRoutes({
    gateway: {
      gatewayFetch: async (path: string, requestOptions?: unknown) => {
        calls.push({ path, options: requestOptions })
        return { status: 200, body: { ok: true } }
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

  test('valida a criação e encaminha somente o payload permitido ao Helpdesk', async () => {
    const { helpdeskTickets, calls } = routes()
    const res = await helpdeskTickets.POST(
      new Request('https://community.test/api/helpdesk/portal/tickets', {
        method: 'POST',
        body: JSON.stringify({
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
            subject: 'Não consigo abrir a aula',
            body: 'A tela fica carregando.',
            category: 'curso_acesso',
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
