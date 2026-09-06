export { type SplitReply, splitQuotedReply, stripQuotedHistory } from './quote'

export const TICKET_STATUSES = ['new', 'open', 'waiting', 'resolved', 'closed'] as const
export type TicketStatus = (typeof TICKET_STATUSES)[number]

export const TICKET_SOURCES = ['email', 'portal'] as const
export type TicketSource = (typeof TICKET_SOURCES)[number]

export const TICKET_PORTALS = ['adult', 'kids'] as const
export type TicketPortal = (typeof TICKET_PORTALS)[number]

export const TICKET_CATEGORIES = [
  'curso_acesso',
  'problema_tecnico',
  'studio',
  'pagamento_reembolso',
  'parceria_comercial',
  'outro',
] as const
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]

export const TICKET_PRIORITIES = ['baixa', 'normal', 'alta'] as const
export type TicketPriority = (typeof TICKET_PRIORITIES)[number]

export const AI_STATUSES = ['idle', 'pending', 'processing', 'done', 'failed', 'skipped'] as const
export type AiStatus = (typeof AI_STATUSES)[number]

/**
 * Triagem do e-mail na chegada: só `human` é atendimento. O resto (resposta
 * automática, devolução de entrega, newsletter/lista, notificação de sistema,
 * e-mail interno da equipe) nasce fora da fila e é reversível pela equipe.
 * Fonte única: o enum do banco é construído a partir desta lista.
 */
export const TRIAGE_KINDS = ['human', 'auto_reply', 'bounce', 'bulk', 'system', 'internal'] as const
export type TriageKind = (typeof TRIAGE_KINDS)[number]

/** Filtro da fila: `human` (padrão) esconde os triados; `automated` mostra só eles. */
export const TRIAGE_FILTERS = ['human', 'automated'] as const
export type TriageFilter = (typeof TRIAGE_FILTERS)[number]

export const TRIAGE_LABELS: Record<TriageKind, string> = {
  human: 'Atendimento',
  auto_reply: 'Resposta automática',
  bounce: 'Devolução',
  bulk: 'Newsletter ou lista',
  system: 'Sistema',
  internal: 'Interno',
}

/** Regras editáveis da triagem (Configurações). Endereços e domínios em minúsculas. */
export interface TriageRulesView {
  /** `endereco@dominio` (exato) ou `@dominio` (o domínio e seus subdomínios). */
  ignoredSenders: string[]
  /** E-mail enviado por nós SÓ para estes domínios nunca vira ticket. */
  internalDomains: string[]
}

/** As regras fixas de cabeçalho, para a equipe entender o porquê de cada veredito. */
export const TRIAGE_HEADER_RULES: { kind: TriageKind; rule: string; description: string }[] = [
  {
    kind: 'bounce',
    rule: 'bounce:return-path-empty',
    description: 'Return-Path vazio, típico de devolução de entrega.',
  },
  {
    kind: 'bounce',
    rule: 'bounce:mailer-daemon',
    description: 'Remetente mailer-daemon@ ou postmaster@.',
  },
  {
    kind: 'bounce',
    rule: 'bounce:delivery-status',
    description: 'Relatório de entrega (multipart/report com delivery-status).',
  },
  {
    kind: 'bounce',
    rule: 'bounce:failed-recipients',
    description: 'Cabeçalho X-Failed-Recipients.',
  },
  {
    kind: 'auto_reply',
    rule: 'auto_reply:auto-submitted',
    description: 'Auto-Submitted: auto-replied (resposta de férias e similares).',
  },
  {
    kind: 'auto_reply',
    rule: 'auto_reply:header',
    description: 'X-Autoreply ou Precedence: auto_reply.',
  },
  {
    kind: 'system',
    rule: 'system:auto-submitted',
    description: 'Auto-Submitted: auto-generated (gerado por máquina).',
  },
  {
    kind: 'system',
    rule: 'system:sender-local-part',
    description: 'Remetente no-reply, noreply, notifications, alerts, newsletter, bounces.',
  },
  {
    kind: 'system',
    rule: 'system:ignored-sender',
    description: 'Remetente ou domínio na lista de ignorados.',
  },
  {
    kind: 'system',
    rule: 'system:weak-signals',
    description: 'Categoria Atualizações do Gmail junto de um sinal de envio em massa.',
  },
  {
    kind: 'bulk',
    rule: 'bulk:list-header',
    description: 'List-Id, List-Post ou Precedence: list/junk (lista de e-mail).',
  },
  {
    kind: 'bulk',
    rule: 'bulk:weak-signals',
    description:
      'Dois sinais de envio em massa juntos (List-Unsubscribe, Feedback-ID, Precedence: bulk, categoria Promoções/Social/Fóruns). Um sinal sozinho não decide.',
  },
  {
    kind: 'internal',
    rule: 'internal:all-recipients-internal',
    description: 'Enviado pela caixa contato@ só para endereços dos domínios internos.',
  },
]

export type Sentiment = 'positivo' | 'neutro' | 'negativo' | 'irritado'
export type KbCoverage = 'covered' | 'partial' | 'not_covered'

export interface AiClassificationView {
  category: TicketCategory
  priority: TicketPriority
  confidence: number
  sentiment: Sentiment
  flags: { reembolso: boolean; juridico: boolean }
  kbCoverage?: KbCoverage
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'Novo',
  open: 'Aberto',
  waiting: 'Aguardando resposta',
  resolved: 'Resolvido',
  closed: 'Fechado',
}

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  curso_acesso: 'Curso e acesso',
  problema_tecnico: 'Problema técnico',
  studio: 'Studio',
  pagamento_reembolso: 'Pagamento e reembolso',
  parceria_comercial: 'Parceria e comercial',
  outro: 'Outro',
}

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
}

export const CUSTOMER_TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  new: 'Recebido',
  open: 'Em atendimento',
  waiting: 'Aguardando você',
  resolved: 'Resolvido',
  closed: 'Encerrado',
}

export const CUSTOMER_TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  curso_acesso: 'Acesso a curso',
  problema_tecnico: 'Problema técnico',
  studio: 'Estúdio',
  pagamento_reembolso: 'Pagamento ou reembolso',
  parceria_comercial: 'Parceria comercial',
  outro: 'Outro assunto',
}

export interface CursorPage<T> {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor: string | null
}

export interface OffsetPage<T> {
  items: T[]
  total: number
  hasMore: boolean
}

export interface TicketSlaView {
  state: 'on_track' | 'at_risk' | 'breached'
  priority: TicketPriority
  targetMinutes: number
  deadlineAt: string
  remainingMinutes: number
}

export interface TicketView {
  id: string
  version: number
  source: TicketSource
  subject: string
  status: TicketStatus
  category: TicketCategory | null
  categoryManual: boolean
  priority: TicketPriority | null
  requesterName: string | null
  requesterEmail: string
  assignedTo: string | null
  assignedToName: string | null
  firstMessageAt: string
  lastMessageAt: string
  lastInboundAt: string | null
  messageCount: number
  aiSummary: string | null
  aiSummaryAt: string | null
  aiDraft: string | null
  aiDraftAt: string | null
  aiDraftEdited: boolean
  aiClassification: AiClassificationView | null
  aiGeneration: number
  aiStatus: AiStatus
  sla: TicketSlaView | null
  /** `human` é atendimento; qualquer outro valor fica fora da fila e do painel. */
  triage: TriageKind
  /** Regra que decidiu (`system:sender-local-part`, `manual:promoted`…); null em atendimento nato. */
  triageRule: string | null
  triagedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageView {
  id: string
  ticketId: string
  kind: 'email' | 'note' | 'portal'
  visibility: 'customer' | 'internal'
  direction: 'inbound' | 'outbound' | null
  triage: TriageKind
  triageRule: string | null
  sentVia: 'customer' | 'human' | 'ai' | 'gmail' | null
  deliveryState: 'pending' | 'sent' | 'unknown' | 'failed' | null
  deliveryLastError: string | null
  fromEmail: string | null
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string | null
  bodyText: string
  bodyHtml: string | null
  snippet: string | null
  attachments: {
    filename: string
    mimeType: string
    sizeBytes: number
    gmailAttachmentId: string
  }[]
  gmailInternalDate: string | null
  createdBy: string | null
  createdByName: string | null
  createdAt: string
}

export interface TicketDetailResponse {
  ticket: TicketView
  messages: MessageView[]
}

export interface DailyVolumePoint {
  date: string
  created: number
}

export interface TicketStatsView {
  counts: { new: number; open: number; waiting: number }
  resolvedToday: number
  resolved7d: number
  sla: { atRisk: number; breached: number; unassigned: number }
  volume: DailyVolumePoint[]
}

export interface KbArticleView {
  id: string
  version: number
  title: string
  content: string
  published: boolean
  createdBy: string
  createdByName: string | null
  createdAt: string
  updatedAt: string
}

export interface SettingsView {
  signature: string
  triageRules: TriageRulesView
  updatedAt: string | null
}

export type ConnectionView =
  | { connected: false }
  | {
      connected: true
      emailAddress: string
      status: 'connected' | 'needs_reauth'
      lastSyncAt: string | null
      lastSyncError: string | null
      connectedAt: string
    }

export type CustomerTicketStatus = TicketStatus
export type CustomerTicketCategory = TicketCategory

export interface CustomerTicketView {
  id: string
  version: number
  source: TicketSource
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

export type CustomerTicketPage = CursorPage<CustomerTicketView>

export const CUSTOMER_TICKET_CATEGORIES = TICKET_CATEGORIES
