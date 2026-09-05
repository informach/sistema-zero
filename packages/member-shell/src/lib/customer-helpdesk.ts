/** Dados expostos ao titular pela API do portal de atendimento. */
export type CustomerTicketStatus = 'new' | 'open' | 'waiting' | 'resolved' | 'closed'

export type CustomerTicketCategory =
  | 'curso_acesso'
  | 'problema_tecnico'
  | 'studio'
  | 'pagamento_reembolso'
  | 'parceria_comercial'
  | 'outro'

export interface CustomerTicketView {
  id: string
  version: number
  source: 'email' | 'portal'
  subject: string
  status: CustomerTicketStatus
  category: CustomerTicketCategory | null
  lastMessageAt: string
  messageCount: number
  createdAt: string
}

export interface CustomerTicketMessageView {
  id: string
  ticketId: string
  kind: 'email' | 'portal'
  visibility: 'customer'
  direction: 'inbound' | 'outbound' | null
  fromName: string | null
  bodyText: string
  createdAt: string
}

export interface CustomerTicketDetail {
  ticket: CustomerTicketView
  messages: CustomerTicketMessageView[]
}

export interface CustomerTicketPage {
  items: CustomerTicketView[]
  total: number
  hasMore: boolean
  /** Cursor opaco da próxima página; null quando não há mais chamados. */
  nextCursor: string | null
}

export const CUSTOMER_TICKET_STATUS_LABEL: Record<CustomerTicketStatus, string> = {
  new: 'Recebido',
  open: 'Em atendimento',
  waiting: 'Aguardando você',
  resolved: 'Resolvido',
  closed: 'Encerrado',
}

export const CUSTOMER_TICKET_CATEGORY_LABEL: Record<CustomerTicketCategory, string> = {
  curso_acesso: 'Acesso a curso',
  problema_tecnico: 'Problema técnico',
  studio: 'Estúdio',
  pagamento_reembolso: 'Pagamento ou reembolso',
  parceria_comercial: 'Parceria comercial',
  outro: 'Outro assunto',
}

export const CUSTOMER_TICKET_CATEGORIES = Object.keys(
  CUSTOMER_TICKET_CATEGORY_LABEL,
) as CustomerTicketCategory[]
