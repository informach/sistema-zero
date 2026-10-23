import type { CursorPage, TicketStatsView, TicketView } from '@sistemazero/helpdesk-contracts'

export type { TicketStatsView }

/**
 * Painel de Atendimento do admin: SOMENTE LEITURA. Os números vêm do helpdesk pelo gateway;
 * para agir, a equipe abre o app de atendimento em outra aba, já no filtro certo.
 */

/** Quantos tickets a lista "Precisa de você" mostra (o resto fica no app de atendimento). */
export const HELPDESK_ATTENTION_LIMIT = 5

export interface HelpdeskAttentionItem {
  id: string
  subject: string
  requester: string
  assignedToName: string | null
  slaState: 'at_risk' | 'breached'
  remainingMinutes: number
}

export interface HelpdeskAttentionView {
  total: number
  items: HelpdeskAttentionItem[]
}

/**
 * Só o que a lista mostra. A view do ticket traz rascunho e resumo da IA, e nada disso
 * precisa sair do BFF para o navegador de quem só está olhando o painel.
 */
export function toAttentionView(page: CursorPage<TicketView>): HelpdeskAttentionView {
  return {
    total: page.total,
    // O filtro `sla=attention` só devolve tickets ativos com prazo; um ticket sem prazo ou no
    // prazo não tem o que mostrar aqui (inventar "no limite" seria mentir).
    items: page.items.flatMap((ticket): HelpdeskAttentionItem[] => {
      const sla = ticket.sla
      if (!sla || sla.state === 'on_track') return []
      return [
        {
          id: ticket.id,
          subject: ticket.subject,
          requester: ticket.requesterName || ticket.requesterEmail,
          assignedToName: ticket.assignedToName,
          slaState: sla.state,
          remainingMinutes: sla.remainingMinutes,
        },
      ]
    }),
  }
}

/** A resposta do helpdesk tem a forma de página que a lista espera. */
export function isTicketPage(body: unknown): body is CursorPage<TicketView> {
  const page = body as Partial<CursorPage<TicketView>> | null
  return Boolean(page && Array.isArray(page.items) && typeof page.total === 'number')
}

/**
 * Atalhos para o app de atendimento, nos filtros que a caixa de entrada dele lê da URL
 * (`queue`, `status`). "Atenção" lá é estourado + em risco, a mesma régua destes cartões.
 */
export const HELPDESK_PATHS = {
  attention: '/tickets?queue=attention',
  unassigned: '/tickets?queue=unassigned',
  new: '/tickets?status=new',
  open: '/tickets?status=open',
  waiting: '/tickets?status=waiting',
} as const

export function helpdeskTicketPath(id: string): string {
  return `/tickets/${encodeURIComponent(id)}`
}

/** Junta a URL do app (env, pode vir com `/` no fim) a um caminho; sem app, sem link. */
export function helpdeskHref(appUrl: string | null, path: string): string | null {
  if (!appUrl) return null
  return `${appUrl.replace(/\/+$/, '')}${path}`
}

function formatDuration(minutes: number): string {
  const absolute = Math.abs(minutes)
  if (absolute >= 60) {
    const hours = Math.floor(absolute / 60)
    const rest = absolute % 60
    return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`
  }
  return `${absolute} min`
}

/** O mesmo texto da fila do app de atendimento, para os dois lugares falarem igual. */
export function attentionDeadlineLabel(
  item: Pick<HelpdeskAttentionItem, 'slaState' | 'remainingMinutes'>,
): string {
  if (item.slaState === 'breached' && item.remainingMinutes >= 0) return 'Prazo estourado agora'
  if (item.remainingMinutes < 0) return `Estourado há ${formatDuration(item.remainingMinutes)}`
  if (item.remainingMinutes === 0) return 'No limite do prazo'
  return `Vence em ${formatDuration(item.remainingMinutes)}`
}
