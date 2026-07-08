import type { TicketCategory } from '../ticket/ticket'

/**
 * Configuração do help desk (linha única, PK fixo `default`). O toggle de
 * auto-resposta nasce DESLIGADO — modo rascunho é o padrão.
 */
export interface HelpdeskSettings {
  autoReplyEnabled: boolean
  autoReplyCategories: TicketCategory[]
  /** Confiança mínima da classificação p/ auto-responder (0..1). */
  autoReplyConfidenceMin: number
  /** Assinatura anexada às respostas enviadas pelo app. */
  signature: string
  updatedBy: string | null
  updatedAt: Date | null
}

export const DEFAULT_SETTINGS: HelpdeskSettings = {
  autoReplyEnabled: false,
  autoReplyCategories: [],
  autoReplyConfidenceMin: 0.75,
  signature: '',
  updatedBy: null,
  updatedAt: null,
}
