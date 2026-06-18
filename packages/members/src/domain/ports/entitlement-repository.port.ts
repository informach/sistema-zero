import type { EntitlementAggregate } from '../entitlement/entitlement.aggregate'
import type { EntitlementStatus } from '../entitlement/entitlement.status'
import type { AccessType } from '../entitlement/fulfillment'

/** Sumário de um membro (1 linha = 1 usuário com ≥1 matrícula) para a listagem admin. */
export interface MemberSummary {
  userId: string
  /** Total de matrículas (qualquer status). */
  totalCount: number
  /** Matrículas ATIVAS agora (status='active' E dentro da validade). */
  activeCount: number
  /** `granted_at` mais recente entre as matrículas do membro (ordenação da lista). */
  lastGrantedAt: Date
  /** Cursos referenciados pelas matrículas (slugs distintos, sem nulos). */
  courseRefs: string[]
}

/** Filtro da listagem admin de membros. Membership por HAVING (contagens são do conjunto TODO). */
export interface ListMembersFilter {
  /** Mantém membros com ≥1 matrícula nesse status (`active` = predicado runtime). */
  status?: EntitlementStatus
  /** Mantém membros com ≥1 matrícula nesse `courseRef`. */
  courseRef?: string
  limit: number
  offset: number
}

export interface ListMembersResult {
  items: MemberSummary[]
  /** Nº de membros (grupos) que passam no filtro — NÃO o nº de matrículas. */
  total: number
}

/**
 * Persistência da matrícula. `save` é uma inserção idempotente (ON CONFLICT DO
 * NOTHING na `idempotencyKey`); `update` usa concorrência otimista (`version`).
 */
export interface EntitlementRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<EntitlementAggregate | null>
  /** Por id (admin: gerenciar uma matrícula específica). `null` se não existe. */
  findById(id: string): Promise<EntitlementAggregate | null>
  /** Insere; se a `idempotencyKey` já existe, NÃO faz nada e retorna `false`. */
  save(entitlement: EntitlementAggregate): Promise<boolean>
  /** `UPDATE ... WHERE id = ? AND version = ?` → `false` se houve conflito de versão. */
  update(entitlement: EntitlementAggregate): Promise<boolean>
  /**
   * Matrícula ATIVA (status + validade) que dá acesso ao curso: específica
   * (`courseRef`) OU a chave-mestra da AUDIÊNCIA do curso (`masterType` =
   * `all_courses` p/ adult, `all_kids_courses` p/ kids). Havendo mais de uma,
   * devolve a "mais forte" (vitalícia > validade mais distante). `masterType`
   * ausente/`null` tira a chave-mestra do OR (resta só a matrícula específica).
   */
  findActiveForCourse(
    userId: string,
    courseRef: string,
    now: Date,
    opts?: { masterType?: AccessType | null },
  ): Promise<EntitlementAggregate | null>
  /** Todas as matrículas ATIVAS do aluno (qualquer tipo). */
  listActiveByUser(userId: string, now: Date): Promise<EntitlementAggregate[]>
  /** TODAS as matrículas do aluno (qualquer status), mais recentes primeiro (admin). */
  listByUserId(userId: string): Promise<EntitlementAggregate[]>
  /**
   * Listagem admin de MEMBROS (distinct user com sumário), paginada. Agrupa por
   * `user_id`; `total` é a contagem de GRUPOS (não de linhas). `now` alimenta o
   * `activeCount`. Ordena por `max(granted_at)` desc + `user_id` (paginação estável).
   */
  listMembers(filter: ListMembersFilter, now: Date): Promise<ListMembersResult>
  /**
   * Revoga (corte imediato) TODAS as matrículas da assinatura num único UPDATE
   * atômico — sem load-mutate-save por linha (evita lost-update sob concorrência
   * com um grant de renovação). Idempotente: não toca em quem já está `revoked`.
   * Retorna o nº de linhas afetadas.
   */
  revokeBySubscriptionId(subscriptionId: string, now: Date): Promise<number>
  /**
   * Expira (fim natural) TODAS as matrículas da assinatura num único UPDATE
   * atômico. Idempotente: não rebaixa `revoked` nem reexpira `expired`.
   */
  expireBySubscriptionId(subscriptionId: string, now: Date): Promise<number>
}
