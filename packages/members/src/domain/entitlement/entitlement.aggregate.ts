import type { EntitlementSourceKind, EntitlementStatus } from './entitlement.status'
import type { EntitlementSnapshot } from './entitlement-snapshot'
import type { AccessType } from './fulfillment'

/** Estado persistido da matrícula (1:1 com a linha em `members.entitlements`). */
export interface EntitlementState {
  id: string
  /** Concorrência otimista: o repositório faz `UPDATE ... WHERE version = ?`. */
  version: number
  userId: string
  productId: string
  productKind: string
  accessType: AccessType
  courseRef: string | null
  offerId: string | null
  snapshot: EntitlementSnapshot
  status: EntitlementStatus
  sourceKind: EntitlementSourceKind
  sourceId: string
  subscriptionId: string | null
  grantedAt: Date
  /** `null` = vitalício (compra única) ou assinatura ativa sem validade calculada ainda. */
  expiresAt: Date | null
  revokedAt: Date | null
  /** Deduplicação da concessão (índice único). Derivado do evento de origem. */
  idempotencyKey: string
  createdAt: Date
  updatedAt: Date
}

export interface GrantEntitlementInput {
  id: string
  userId: string
  productId: string
  productKind: string
  accessType: AccessType
  courseRef: string | null
  offerId: string | null
  snapshot: EntitlementSnapshot
  sourceKind: EntitlementSourceKind
  sourceId: string
  subscriptionId?: string | null
  grantedAt: Date
  expiresAt?: Date | null
  idempotencyKey: string
}

/**
 * Agregado da matrícula/entitlement: a visão materializada de acesso, alimentada
 * pelos eventos do payments. Máquina de estados pequena (grant → extend/revoke/expire)
 * + a regra de "tem acesso agora" (leitura local, sem consultar ninguém).
 */
export class EntitlementAggregate {
  private constructor(private readonly state: EntitlementState) {}

  static grant(input: GrantEntitlementInput): EntitlementAggregate {
    return new EntitlementAggregate({
      id: input.id,
      version: 0,
      userId: input.userId,
      productId: input.productId,
      productKind: input.productKind,
      accessType: input.accessType,
      courseRef: input.courseRef,
      offerId: input.offerId,
      snapshot: input.snapshot,
      status: 'active',
      sourceKind: input.sourceKind,
      sourceId: input.sourceId,
      subscriptionId: input.subscriptionId ?? null,
      grantedAt: input.grantedAt,
      expiresAt: input.expiresAt ?? null,
      revokedAt: null,
      idempotencyKey: input.idempotencyKey,
      createdAt: input.grantedAt,
      updatedAt: input.grantedAt,
    })
  }

  static restore(state: EntitlementState): EntitlementAggregate {
    return new EntitlementAggregate({ ...state })
  }

  /**
   * Chave-mestra VIRTUAL da equipe interna (superadmin/admin/staff): nunca é
   * persistida — existe só em memória para os fluxos de leitura tratarem o ator
   * privilegiado como um aluno com `all_courses` vitalício. Os mappers de view
   * leem apenas `accessType`/`expiresAt`, mas o snapshot é preenchido com valores
   * neutros REAIS (sem cast) para o agregado permanecer íntegro.
   */
  static virtualAllCourses(userId: string, now: Date): EntitlementAggregate {
    return new EntitlementAggregate({
      id: 'virtual-all-courses',
      version: 0,
      userId,
      productId: 'virtual',
      productKind: 'internal',
      accessType: 'all_courses',
      courseRef: null,
      offerId: null,
      snapshot: {
        offerId: 'virtual',
        offerSlug: 'virtual',
        productId: 'virtual',
        sku: 'virtual',
        name: 'Acesso interno (equipe)',
        kind: 'internal',
        accessType: 'all_courses',
        courseRef: null,
        fulfillment: null,
        resolvedAt: now.toISOString(),
      },
      status: 'active',
      sourceKind: 'manual',
      sourceId: 'internal-staff',
      subscriptionId: null,
      grantedAt: now,
      expiresAt: null,
      revokedAt: null,
      idempotencyKey: `virtual:${userId}`,
      createdAt: now,
      updatedAt: now,
    })
  }

  /** Acesso liberado? `active` E (vitalício OU dentro da validade). Leitura pura. */
  isActiveAt(now: Date): boolean {
    if (this.state.status !== 'active') return false
    return this.state.expiresAt === null || this.state.expiresAt.getTime() > now.getTime()
  }

  /**
   * Estende a validade (ciclo de assinatura). A validade só move p/ FRENTE
   * (idempotente sob reentrega), MAS a reativação de uma `expired` é avaliada
   * independentemente: uma renovação cujo alvo não avança a validade (ex.: `expire`
   * marcou o status sem mexer no `expiresAt`, que ainda é futuro) ainda reativa —
   * antes o early-return monotônico engolia esse caso e a renovação se perdia.
   * Nunca toca em `revoked`.
   */
  extendTo(expiresAt: Date, now: Date): void {
    if (this.state.status === 'revoked') return
    const current = this.state.expiresAt
    const advances = current === null || expiresAt.getTime() > current.getTime()
    if (advances) this.state.expiresAt = expiresAt
    const shouldReactivate =
      this.state.status === 'expired' &&
      this.state.expiresAt !== null &&
      this.state.expiresAt.getTime() > now.getTime()
    if (shouldReactivate) this.state.status = 'active'
    if (advances || shouldReactivate) this.state.updatedAt = now
  }

  /**
   * Reativação ADMIN explícita: reverte `revoked`/`expired` para `active` com a
   * validade dada (`null` = vitalícia). Transição exclusiva da gestão manual — o
   * ciclo de assinatura usa `extendTo`, que NUNCA ressuscita `revoked`
   * (cancelamento vence renovação reentregue).
   */
  reactivate(expiresAt: Date | null, now: Date): void {
    this.state.status = 'active'
    this.state.revokedAt = null
    this.state.expiresAt = expiresAt
    this.state.updatedAt = now
  }

  /** Cancela o acesso imediatamente (cancelamento de assinatura). Idempotente. */
  revoke(now: Date): void {
    if (this.state.status === 'revoked') return
    this.state.status = 'revoked'
    this.state.revokedAt = now
    this.state.updatedAt = now
  }

  /** Marca como expirada (fim natural da assinatura). Idempotente; não rebaixa `revoked`. */
  expire(now: Date): void {
    if (this.state.status === 'revoked' || this.state.status === 'expired') return
    this.state.status = 'expired'
    this.state.updatedAt = now
  }

  get id(): string {
    return this.state.id
  }
  get version(): number {
    return this.state.version
  }
  get userId(): string {
    return this.state.userId
  }
  get accessType(): AccessType {
    return this.state.accessType
  }
  get courseRef(): string | null {
    return this.state.courseRef
  }
  get status(): EntitlementStatus {
    return this.state.status
  }
  get subscriptionId(): string | null {
    return this.state.subscriptionId
  }
  get expiresAt(): Date | null {
    return this.state.expiresAt
  }

  toSnapshot(): EntitlementState {
    return { ...this.state }
  }
}
