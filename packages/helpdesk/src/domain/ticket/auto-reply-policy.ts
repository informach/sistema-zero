import type { AutoReplyState, KbCoverage, Sentiment, TicketCategory } from './ticket'

/**
 * Decide se a IA pode ENVIAR a resposta sozinha ou se ela vira RASCUNHO para
 * revisão humana. PURO e testável. Regra de ouro: só auto-envia quando TODAS as
 * condições passam; qualquer falha vira rascunho com um motivo legível (o motivo
 * aparece na UI como "auto-resposta em revisão").
 */
export interface AutoReplyPolicyInput {
  settings: {
    autoReplyEnabled: boolean
    autoReplyCategories: TicketCategory[]
    autoReplyConfidenceMin: number
  }
  classification: {
    category: TicketCategory
    confidence: number
    sentiment: Sentiment
    flags: { reembolso: boolean; juridico: boolean }
  }
  kbCoverage: KbCoverage
  ticket: {
    autoReplyState: AutoReplyState
    /** Já existe qualquer outbound (humano/IA/gmail)? → não é o 1º contato. */
    hasOutbound: boolean
  }
  inbound: {
    /** O último inbound é autoresponder/newsletter? (anti-loop). */
    isAutoreply: boolean
    fromEmail: string | null
  }
}

export interface AutoReplyDecision {
  action: 'send' | 'draft'
  reason: string
}

/** Endereço que denuncia autoresponder/robô (no-reply, mailer-daemon, etc.). */
function isNoReplyAddress(email: string | null): boolean {
  if (!email) return false
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  return /no.?reply|do.?not.?reply|mailer.?daemon|postmaster|bounce/.test(local)
}

export function decideAutoReply(input: AutoReplyPolicyInput): AutoReplyDecision {
  const { settings, classification, kbCoverage, ticket, inbound } = input
  const draft = (reason: string): AutoReplyDecision => ({ action: 'draft', reason })

  if (!settings.autoReplyEnabled) return draft('Auto-resposta desligada nas configurações')
  if (!settings.autoReplyCategories.includes(classification.category)) {
    return draft('Categoria não habilitada para auto-resposta')
  }
  // Máx. 1 auto-resposta por ticket + só no 1º contato (nada respondido antes).
  if (ticket.autoReplyState !== 'none' || ticket.hasOutbound) {
    return draft('Ticket já teve resposta')
  }
  // Anti-loop: nunca auto-responder a autoresponder/newsletter/robô.
  if (inbound.isAutoreply || isNoReplyAddress(inbound.fromEmail)) {
    return draft('Parece resposta automática do cliente')
  }
  // Temas sensíveis SEMPRE passam por humano.
  if (
    classification.flags.reembolso ||
    classification.flags.juridico ||
    classification.category === 'pagamento_reembolso'
  ) {
    return draft('Assunto sensível (pagamento ou jurídico), melhor revisar')
  }
  if (classification.sentiment === 'irritado') {
    return draft('Cliente irritado, melhor uma resposta humana')
  }
  if (classification.confidence < settings.autoReplyConfidenceMin) {
    return draft('Confiança da IA abaixo do mínimo')
  }
  if (kbCoverage !== 'covered') {
    return draft('A base de conhecimento não cobre este caso')
  }
  return { action: 'send', reason: 'Coberto pela base de conhecimento' }
}
