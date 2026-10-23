import 'server-only'
import type { CursorPage, TicketStatsView, TicketView } from '@sistemazero/helpdesk-contracts'
import { HELPDESK_ATTENTION_LIMIT } from '@/lib/helpdesk-panel'
import { type GatewayResponse, gatewayFetch } from './gateway'

// Painel de Atendimento (somente leitura). As rotas `/helpdesk/*` do gateway são staff+,
// o mesmo público do admin: nenhuma rota nova no gateway.

export function getHelpdeskTicketStats(): Promise<GatewayResponse<TicketStatsView>> {
  return gatewayFetch('/helpdesk/tickets/stats')
}

/** Estourados primeiro, depois os em risco, pelo prazo (a ordem é do helpdesk). */
export function listHelpdeskAttentionTickets(): Promise<GatewayResponse<CursorPage<TicketView>>> {
  return gatewayFetch('/helpdesk/tickets', {
    query: { sla: 'attention', limit: HELPDESK_ATTENTION_LIMIT },
  })
}
