/**
 * Como a área de membros libera o produto. Estruturado em JSON (coluna `jsonb`)
 * para evoluir sem migração. O catálogo é a fonte da verdade do "o que entregar";
 * a área de membros consome isto para liberar o acesso.
 *
 * Decisão (06/2026): a entrega é EXCLUSIVAMENTE via área de membros —
 * `course` libera UM curso (`courseRef` = slug), `all_courses` é a chave-mestra
 * ADULTA e `all_kids_courses` a chave-mestra KIDS (cada uma cobre todos os cursos
 * publicados da SUA audiência, atuais E futuros; a checagem no members vira "chave
 * do curso OU chave-mestra da audiência ativa"). Os antigos `download`/`external`/
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

export type AccessType = 'course' | 'all_courses' | 'all_kids_courses' | 'community'

export interface FulfillmentSpec {
  /** Tipo de acesso que a área de membros deve conceder. */
  accessType: AccessType
  /**
   * Chave do recurso liberado: SLUG do curso (`accessType = course`) OU a CHAVE da
   * comunidade (`accessType = community` — casa com `communities[]` do espaço no hub).
   * Vazio nas chaves-mestra (`all_courses`/`all_kids_courses`).
   */
  courseRef?: string
  /** Regra de liberação (drip). Default implícito: imediata. ARMAZENADA, ainda não aplicada pelo members. */
  release?: ReleaseRule
  /**
   * Teto de PERFIS (estilo Netflix) que esta compra libera — usado só na plataforma
   * KIDS, onde o responsável cria 1 perfil por filho (o `members` resolve o teto
   * efetivo da conta pelo MÁXIMO entre as matrículas kids ativas). Ausente = sem
   * teto definido por esta entrega (a área de membros aplica o default). Inteiro ≥ 1.
   */
  maxProfiles?: number
}
