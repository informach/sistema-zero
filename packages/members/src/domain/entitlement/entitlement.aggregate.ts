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

  /** Acesso liberado? `active` E (vitalício OU dentro da validade). Leitura pura. */
  isActiveAt(now: Date): boolean {
    if (this.state.status !== 'active') return false
    return this.state.expiresAt === null || this.state.expiresAt.getTime() > now.getTime()
  }

  /**
   * Estende a validade (ciclo de assinatura). Só move p/ FRENTE — idempotente sob
   * reentrega. Reativa se estava `expired` e a nova validade é futura. Não toca em `revoked`.
   */
  extendTo(expiresAt: Date, now: Date): void {
    if (this.state.status === 'revoked') return
    const current = this.state.expiresAt
    if (current && current.getTime() >= expiresAt.getTime()) return
    this.state.expiresAt = expiresAt
    if (this.state.status === 'expired' && expiresAt.getTime() > now.getTime()) {
      this.state.status = 'active'
    }
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
