import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isReadonlyImpersonation } from '../lib/act'
import type { MembersAudience } from '../server/clients'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import type { SessionModule } from '../server/session'

export type HelpdeskRoutes = ReturnType<typeof createHelpdeskRoutes>

const UUID = z.string().uuid()
const TicketStatus = z.enum(['new', 'open', 'waiting', 'resolved', 'closed'])
const TicketCategory = z.enum([
  'curso_acesso',
  'problema_tecnico',
  'studio',
  'pagamento_reembolso',
  'parceria_comercial',
  'outro',
])
const TicketListQuery = z
  .object({
    status: TicketStatus.optional(),
    limit: z.coerce.number().int().min(1).max(50).optional(),
    cursor: z.string().min(1).max(256).optional(),
  })
  .strict()
const TicketCreateBody = z
  .object({
    subject: z.string().trim().min(3).max(300),
    body: z.string().trim().min(1).max(10_000),
    category: TicketCategory.optional(),
  })
  .strict()
const TicketMessageBody = z.object({ body: z.string().trim().min(1).max(10_000) }).strict()

const invalidInput = () => NextResponse.json({ error: { code: 'INVALID_INPUT' } }, { status: 400 })

function upstream(result: GatewayResponse) {
  if (result.body !== null && result.body !== undefined) {
    return NextResponse.json(result.body, { status: result.status })
  }
  return NextResponse.json(
    { error: { code: 'HELPDESK_UNAVAILABLE' } },
    { status: result.status >= 200 && result.status < 300 ? 502 : result.status },
  )
}

async function json(req: Request): Promise<unknown> {
  return req.json().catch(() => null)
}

async function ticketId(ctx: { params: Promise<{ id: string }> }): Promise<string | null> {
  const { id } = await ctx.params
  const parsed = UUID.safeParse(id)
  return parsed.success ? parsed.data : null
}

/**
 * BFF do portal de atendimento. O Helpdesk é a autoridade para identidade e
 * posse do ticket; esta borda valida a forma, usa a sessão HttpOnly e preserva
 * a proibição de mutações em impersonação somente-leitura.
 */
export function createHelpdeskRoutes(deps: {
  gateway: GatewayModule
  session: SessionModule
  /**
   * Vitrine deste app (`adult` = community, `kids` = community-kids). Vira o
   * `portal` do chamado no Helpdesk, que monta o link do aviso de resposta
   * (/ajuda vs /responsavel/ajuda). Vem da config COMPILADA do app — o cliente
   * não escolhe (o Zod `.strict()` abaixo recusa `portal` no corpo).
   */
  audience: MembersAudience
}) {
  const { gateway, session, audience } = deps

  async function requireWritableSession(): Promise<NextResponse | null> {
    const user = await session.getSession()
    if (!isReadonlyImpersonation(user)) return null
    return NextResponse.json(
      {
        error: {
          code: 'IMPERSONATION_READONLY',
          message: 'Sessão de suporte é somente-leitura.',
        },
      },
      { status: 403 },
    )
  }

  const helpdeskTickets = {
    GET: async (req: Request) => {
      const url = new URL(req.url)
      const parsed = TicketListQuery.safeParse({
        status: url.searchParams.get('status') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
        cursor: url.searchParams.get('cursor') ?? undefined,
      })
      if (!parsed.success) return invalidInput()
      return upstream(
        await gateway.gatewayFetch('/helpdesk/portal/tickets', {
          query: parsed.data,
        }),
      )
    },
    POST: async (req: Request) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const parsed = TicketCreateBody.safeParse(await json(req))
      if (!parsed.success) return invalidInput()
      return upstream(
        await gateway.gatewayFetch('/helpdesk/portal/tickets', {
          method: 'POST',
          body: { ...parsed.data, portal: audience },
        }),
      )
    },
  }

  const helpdeskTicket = {
    GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const id = await ticketId(ctx)
      if (!id) return invalidInput()
      return upstream(await gateway.gatewayFetch(`/helpdesk/portal/tickets/${id}`))
    },
  }

  const helpdeskTicketMessages = {
    POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
      const readonly = await requireWritableSession()
      if (readonly) return readonly
      const id = await ticketId(ctx)
      if (!id) return invalidInput()
      const parsed = TicketMessageBody.safeParse(await json(req))
      if (!parsed.success) return invalidInput()
      return upstream(
        await gateway.gatewayFetch(`/helpdesk/portal/tickets/${id}/messages`, {
          method: 'POST',
          body: parsed.data,
        }),
      )
    },
  }

  return { helpdeskTickets, helpdeskTicket, helpdeskTicketMessages }
}
