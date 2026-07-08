/**
 * Contratos compartilhados entre o BFF e os componentes do app. Espelham as
 * views do @sistemazero/helpdesk (`application/mappers/views`) e as claims de
 * sessão do @sistemazero/auth (type-only — seguro p/ Client Components).
 */

export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

/** Papéis com acesso ao helpdesk (equipe interna). */
export const TEAM_ROLES = ['superadmin', 'admin', 'staff'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export function isTeamRole(role: string): role is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(role)
}

/** Página das listagens do helpdesk (`GET /helpdesk/{tickets,kb}`). */
export interface HelpdeskPage<T> {
  items: T[]
  total: number
  /** Há mais itens além desta página (offset + items < total). */
  hasMore: boolean
}

// ── Tickets (caixa de entrada do contato@) ──

export type TicketStatus = 'new' | 'open' | 'waiting' | 'resolved' | 'closed'

export type TicketCategory =
  | 'curso_acesso'
  | 'problema_tecnico'
  | 'pagamento_reembolso'
  | 'parceria_comercial'
  | 'outro'

export type TicketPriority = 'baixa' | 'normal' | 'alta'

export type AiStatus = 'idle' | 'pending' | 'processing' | 'done' | 'failed' | 'skipped'

export interface TicketView {
  id: string
  version: number
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
  aiClassification: unknown
  aiStatus: AiStatus
  autoReplyState: 'none' | 'sending' | 'sent' | 'aborted'
  autoRepliedAt: string | null
  autoReplyReason: string | null
  createdAt: string
  updatedAt: string
}

export interface MessageView {
  id: string
  ticketId: string
  kind: 'email' | 'note'
  direction: 'inbound' | 'outbound' | null
  sentVia: 'customer' | 'human' | 'ai' | 'gmail' | null
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

/** Resposta de `GET /helpdesk/tickets/:id` (ticket + thread completa). */
export interface TicketDetailResponse {
  ticket: TicketView
  messages: MessageView[]
}

/** Ponto da série de volume do painel (dia civil SP). */
export interface DailyVolumePoint {
  /** `YYYY-MM-DD` (dia de São Paulo). */
  date: string
  created: number
  autoReplied: number
}

/** Agregados do painel (`GET /helpdesk/tickets/stats`). Espelha o `TicketStats` do backend. */
export interface TicketStatsView {
  counts: { new: number; open: number; waiting: number }
  resolvedToday: number
  resolved7d: number
  autoRepliedToday: number
  autoReplied7d: number
  /** Série densa dos últimos 14 dias, ascendente. */
  volume: DailyVolumePoint[]
}

// ── Base de conhecimento (artigos que alimentam o prompt da IA) ──

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

// ── Configurações (auto-resposta + assinatura) ──

export interface SettingsView {
  autoReplyEnabled: boolean
  autoReplyCategories: TicketCategory[]
  autoReplyConfidenceMin: number
  signature: string
  updatedAt: string | null
}

// ── Conexão Gmail (a view NUNCA expõe tokens) ──

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
