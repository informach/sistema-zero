export type TicketStatus = 'new' | 'open' | 'waiting' | 'resolved' | 'closed'

/** Canal de origem do chamado. E-mail e portal compartilham a mesma fila da equipe. */
export type TicketSource = 'email' | 'portal'

/** Categorias fixas do negócio (labels PT-BR ficam no front, em lockstep). */
export type TicketCategory =
  | 'curso_acesso'
  | 'problema_tecnico'
  | 'studio'
  | 'pagamento_reembolso'
  | 'parceria_comercial'
  | 'outro'

export type TicketPriority = 'baixa' | 'normal' | 'alta'

/**
 * Fila de IA embutida no ticket (sem tabela de jobs): `pending` é claimado pelo
 * ai-worker via SKIP LOCKED; `skipped` = grupo OPENROUTER_* não configurado.
 */
export type AiStatus = 'idle' | 'pending' | 'processing' | 'done' | 'failed' | 'skipped'

export type Sentiment = 'positivo' | 'neutro' | 'negativo' | 'irritado'
export type KbCoverage = 'covered' | 'partial' | 'not_covered'

/** Saída estruturada da classificação (persistida como jsonb). */
export interface AiClassification {
  category: TicketCategory
  priority: TicketPriority
  confidence: number
  sentiment: Sentiment
  flags: { reembolso: boolean; juridico: boolean }
  kbCoverage?: KbCoverage
}

export interface Ticket {
  id: string
  version: number
  /** Thread do Gmail quando a conversa já passou por e-mail (unique quando presente). */
  gmailThreadId: string | null
  source: TicketSource
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
  aiStatus: AiStatus
  aiNextAttemptAt: Date | null
  aiAttempts: number
  aiLastError: string | null
  createdAt: Date
  updatedAt: Date
}

export const TICKET_STATUSES: readonly TicketStatus[] = [
  'new',
  'open',
  'waiting',
  'resolved',
  'closed',
]

export const TICKET_CATEGORIES: readonly TicketCategory[] = [
  'curso_acesso',
  'problema_tecnico',
  'studio',
  'pagamento_reembolso',
  'parceria_comercial',
  'outro',
]

/**
 * Reabertura por mensagem nova do cliente: ticket fechado/resolvido e ticket
 * aguardando o cliente voltam a `open`, pois agora há trabalho para a equipe.
 */
export function statusOnInbound(current: TicketStatus): TicketStatus {
  if (current === 'waiting' || current === 'resolved' || current === 'closed') return 'open'
  return current
}

export function isTerminalTicketStatus(status: TicketStatus): boolean {
  return status === 'resolved' || status === 'closed'
}
