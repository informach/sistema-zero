/** Dados de sessão próprios do app; contratos do Helpdesk vêm do pacote puro. */
export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  status: string
}

export const TEAM_ROLES = ['superadmin', 'admin', 'staff'] as const
export type TeamRole = (typeof TEAM_ROLES)[number]

export function isTeamRole(role: string): role is TeamRole {
  return (TEAM_ROLES as readonly string[]).includes(role)
}

export type {
  AiStatus,
  ConnectionView,
  CursorPage,
  DailyVolumePoint,
  KbArticleView,
  MessageView,
  OffsetPage,
  SettingsView,
  TicketCategory,
  TicketDetailResponse,
  TicketPriority,
  TicketSlaView,
  TicketSource,
  TicketStatsView,
  TicketStatus,
  TicketView,
} from '@sistemazero/helpdesk-contracts'

/** Compatibilidade das telas de KB, que ainda usam paginação por offset. */
export type HelpdeskPage<T> = import('@sistemazero/helpdesk-contracts').OffsetPage<T>
