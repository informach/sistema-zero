import type { SendEmailInput } from '../../domain/ports/messaging-gateway.port'
import type { Ticket, TicketPortal } from '../../domain/ticket/ticket'
import type { TicketMessage } from '../../domain/ticket/ticket-message'

/** Chave do template no messaging (`scripts/seed-templates.ts`). NÃO renomear sem o seed. */
export const PORTAL_REPLY_TEMPLATE_KEY = 'helpdesk-reply'

/** Origens PÚBLICAS das áreas do aluno (COMMUNITY_URL / KIDS_COMMUNITY_URL). */
export interface PortalUrls {
  adult: string
  kids: string
}

/** Caminho da Ajuda em cada app — espelha as rotas do community e do community-kids. */
export const PORTAL_HELP_PATH: Record<TicketPortal, string> = {
  adult: '/ajuda',
  kids: '/responsavel/ajuda',
}

/** Link da Ajuda do app que abriu o chamado. Nulo/legado cai no adulto, que sempre existiu. */
export function portalHelpUrl(portal: TicketPortal | null, urls: PortalUrls): string {
  const key: TicketPortal = portal ?? 'adult'
  return `${urls[key].replace(/\/$/, '')}${PORTAL_HELP_PATH[key]}`
}

/** "Olá, Maria!" ou "Olá!" — o nome do solicitante pode vir nulo; nunca expor e-mail. */
export function greetingFor(name: string | null): string {
  const first = name?.trim().split(/\s+/)[0]
  return first ? `Olá, ${first}!` : 'Olá!'
}

/**
 * Aviso de "a equipe respondeu" para o ticket do PORTAL. Leva SÓ o link: o portal
 * é autenticado e o e-mail não; e o remetente padrão do messaging é a própria
 * caixa contato@, então responder ao aviso viraria um chamado separado — o
 * template diz para continuar pela Ajuda. Puro: sem I/O, sem relógio.
 */
export function buildPortalReplyNotification(input: {
  ticket: Ticket
  message: TicketMessage
  urls: PortalUrls
}): SendEmailInput {
  const { ticket, message, urls } = input
  return {
    templateKey: PORTAL_REPLY_TEMPLATE_KEY,
    // `recipient.name` é minLength 1 no DTO do messaging; sem o fallback, todo
    // solicitante sem nome viraria 400 engolido pelo warn.
    recipient: {
      name: ticket.requesterName?.trim() || 'Cliente',
      email: ticket.requesterEmail,
    },
    variables: {
      saudacao: greetingFor(ticket.requesterName),
      assunto: ticket.subject,
      link: portalHelpUrl(ticket.portal, urls),
    },
    // Por MENSAGEM, não por ticket: duas respostas são dois avisos, de propósito.
    idempotencyKey: `${PORTAL_REPLY_TEMPLATE_KEY}:${message.id}`,
  }
}
