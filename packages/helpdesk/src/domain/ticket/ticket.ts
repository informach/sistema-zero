import {
  type AiClassificationView,
  type AiStatus,
  TICKET_CATEGORIES as SHARED_TICKET_CATEGORIES,
  TICKET_STATUSES as SHARED_TICKET_STATUSES,
  type TicketCategory,
  type TicketPortal,
  type TicketPriority,
  type TicketSource,
  type TicketStatus,
} from '@sistemazero/helpdesk-contracts'

export type {
  AiStatus,
  KbCoverage,
  Sentiment,
  TicketCategory,
  TicketPortal,
  TicketPriority,
  TicketSource,
  TicketStatus,
} from '@sistemazero/helpdesk-contracts'

/** Saída estruturada da classificação (persistida como jsonb). */
export type AiClassification = AiClassificationView

export interface Ticket {
  id: string
  version: number
  /** Thread do Gmail quando a conversa já passou por e-mail (unique quando presente). */
  gmailThreadId: string | null
  source: TicketSource
  /**
   * App que abriu o chamado pelo portal — decide o link do aviso de resposta
   * (kids → /responsavel/ajuda; adult → /ajuda). Injetado pelo BFF, nunca lido do
   * corpo do cliente. Nulo em e-mail e no legado (o aviso cai no adulto).
   */
  portal: TicketPortal | null
  subject: string
  status: TicketStatus
  /** Instante da transição para terminal; não muda em patches/IA posteriores. */
  resolvedAt: Date | null
  category: TicketCategory | null
  /** Categoria escolhida por humano NUNCA é sobrescrita pela IA. */
  categoryManual: boolean
  priority: TicketPriority | null
  requesterName: string | null
  requesterEmail: string
  /** Conta autenticada que abriu o chamado no portal; nunca vem do corpo HTTP. */
  requesterAccountId: string | null
  assignedTo: string | null
  assignedToName: string | null
  firstMessageAt: Date
  lastMessageAt: Date
  lastInboundAt: Date | null
  messageCount: number
  aiSummary: string | null
  aiSummaryAt: Date | null
  aiDraft: string | null
  aiDraftAt: Date | null
  aiDraftEdited: boolean
  aiClassification: AiClassification | null
  /** Revisão da conversa usada como compare-and-set das escritas assíncronas da IA. */
  aiGeneration: number
  aiStatus: AiStatus
  aiNextAttemptAt: Date | null
  aiAttempts: number
  aiLastError: string | null
  createdAt: Date
  updatedAt: Date
}

export const TICKET_STATUSES = SHARED_TICKET_STATUSES
export const TICKET_CATEGORIES = SHARED_TICKET_CATEGORIES

export function isTerminalTicketStatus(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'closed'
}
