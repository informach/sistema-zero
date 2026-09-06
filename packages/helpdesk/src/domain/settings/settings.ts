import { DEFAULT_TRIAGE_RULES, type TriageRules } from '../mail/triage'

/** Configuração do help desk (linha única, PK fixo `default`). */
export interface HelpdeskSettings {
  /** Assinatura anexada às respostas enviadas pelo app. */
  signature: string
  /** Regras editáveis da triagem de e-mail (remetentes ignorados, domínios internos). */
  triageRules: TriageRules
  updatedBy: string | null
  updatedAt: Date | null
}

export const DEFAULT_SETTINGS: HelpdeskSettings = {
  signature: '',
  triageRules: {
    ignoredSenders: [...DEFAULT_TRIAGE_RULES.ignoredSenders],
    internalDomains: [...DEFAULT_TRIAGE_RULES.internalDomains],
  },
  updatedBy: null,
  updatedAt: null,
}
