/**
 * Como a área de membros libera o produto. Estruturado em JSON (coluna `jsonb`)
 * para evoluir sem migração. O catálogo é a fonte da verdade do "o que entregar";
 * a área de membros (futuro) consome isto para liberar o acesso.
 */
export interface FulfillmentAsset {
  /** Rótulo exibível (ex.: "Ebook (PDF)", "Checklist de Clareza"). */
  label: string
  /** URL direta (se aplicável). */
  url?: string
  /** Referência opaca a um ativo (ex.: id de arquivo no storage). */
  ref?: string
}

export type ReleaseMode = 'immediate' | 'days_after_purchase' | 'fixed_date'

export interface ReleaseRule {
  mode: ReleaseMode
  /** Dias após a compra (quando `mode = days_after_purchase`). */
  days?: number
  /** Data fixa ISO-8601 (quando `mode = fixed_date`). */
  date?: string
}

export type AccessType = 'download' | 'course' | 'community' | 'external' | 'none'

export interface FulfillmentSpec {
  /** Tipo de acesso que a área de membros deve conceder. */
  accessType: AccessType
  /** Ativos para download/entrega. */
  assets?: FulfillmentAsset[]
  /** Referência ao conteúdo do curso/área de membros (quando aplicável). */
  courseRef?: string
  /** Regra de liberação (drip). Default implícito: imediata. */
  release?: ReleaseRule
}
