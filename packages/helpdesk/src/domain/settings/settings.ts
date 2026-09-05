/** Configuração do help desk (linha única, PK fixo `default`). */
export interface HelpdeskSettings {
  /** Assinatura anexada às respostas enviadas pelo app. */
  signature: string
  updatedBy: string | null
  updatedAt: Date | null
}

export const DEFAULT_SETTINGS: HelpdeskSettings = {
  signature: '',
  updatedBy: null,
  updatedAt: null,
}
