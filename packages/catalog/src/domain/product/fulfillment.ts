/**
 * Como a área de membros libera o produto. Estruturado em JSON (coluna `jsonb`)
 * para evoluir sem migração. O catálogo é a fonte da verdade do "o que entregar";
 * a área de membros consome isto para liberar o acesso.
 *
 * Decisão (06/2026): a entrega é EXCLUSIVAMENTE via área de membros —
 * `course` libera UM curso (`courseRef` = slug) e `all_courses` é a chave-mestra
 * (todos os cursos publicados, atuais E futuros; a checagem de acesso no members
 * vira "chave do curso OU chave-mestra ativa"). Os antigos `download`/`external`/
 * `none` + `assets` foram removidos do cadastro (entregas mortas — criavam
 * acessos invisíveis ao aluno). `community` (tiers) é fatia futura: entra no
 * union quando a comunidade real existir.
 */
export type ReleaseMode = 'immediate' | 'days_after_purchase' | 'fixed_date'

export interface ReleaseRule {
  mode: ReleaseMode
  /** Dias após a compra (quando `mode = days_after_purchase`). */
  days?: number
  /** Data fixa ISO-8601 (quando `mode = fixed_date`). */
  date?: string
}

export type AccessType = 'course' | 'all_courses'

export interface FulfillmentSpec {
  /** Tipo de acesso que a área de membros deve conceder. */
  accessType: AccessType
  /** Slug do curso na área de membros (obrigatório quando `accessType = course`). */
  courseRef?: string
  /** Regra de liberação (drip). Default implícito: imediata. ARMAZENADA, ainda não aplicada pelo members. */
  release?: ReleaseRule
}
