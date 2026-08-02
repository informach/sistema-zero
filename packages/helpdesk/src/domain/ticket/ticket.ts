export type TicketStatus = 'new' | 'open' | 'waiting' | 'resolved' | 'closed'

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

/**
 * Guard de fase do envio automático: `sending` é persistido ANTES do send;
 * crash no meio → `aborted` (rascunho mantido, NUNCA reenvia).
 */
export type AutoReplyState = 'none' | 'sending' | 'sent' | 'aborted'

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
  /** Thread do Gmail — a chave natural do agrupamento (unique). */
  gmailThreadId: string
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  /** Categoria escolhida por humano NUNCA é sobrescrita pela IA. */
  categoryManual: boolean
  priority: TicketPriority | null
  requesterName: string | null
  requesterEmail: string
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
  autoReplyState: AutoReplyState
  autoRepliedAt: Date | null
  /** Motivo de NÃO ter auto-respondido (visível na UI: "aguardando revisão"). */
  autoReplyReason: string | null
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
 * Reabertura por mensagem nova do cliente: ticket fechado/resolvido volta a
 * `open` (regra do ingest); demais estados são preservados.
 */
export function statusOnInbound(current: TicketStatus): TicketStatus {
  if (current === 'resolved' || current === 'closed') return 'open'
  return current
}
