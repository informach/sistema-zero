import type { Logger } from '@sistemazero/core/logging'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { EntitlementSnapshot } from '../../domain/entitlement/entitlement-snapshot'
import type { CatalogGateway, ResolvedOfferItem } from '../../domain/ports/catalog-gateway.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

/**
 * Intenção de concessão (normalizada). `subscription` presente → acesso por
 * ASSINATURA (cria/estende, com validade); ausente → compra única (VITALÍCIA).
 */
export interface GrantEntitlementCommand {
  userId: string
  /** Slug ou id da oferta no catálogo. */
  offerRef: string
  /** Id do pagamento (compra única) ou da cobrança do ciclo. */
  paymentId: string
  grantedAt: Date
  subscription?: { subscriptionId: string; intervalMonths: number | null } | null
}

export interface GrantEntitlementDeps {
  catalog: CatalogGateway
  entitlements: EntitlementRepository
  graceDays: number
  newId: () => string
  logger?: Logger
}

export interface GrantResult {
  granted: number
  itemsResolved: number
}

/**
 * Motor de concessão. Resolve no catálogo o que a oferta dá direito, congela o
 * snapshot e cria (ou estende, p/ assinatura) uma matrícula por item entregável.
 * Idempotente: chave única derivada da origem; extensão só move a validade p/ frente.
 */
export class GrantEntitlementService {
  constructor(private readonly deps: GrantEntitlementDeps) {}

  async execute(cmd: GrantEntitlementCommand): Promise<GrantResult> {
    const offer = await this.deps.catalog.resolveOfferEntitlements(cmd.offerRef)
    if (!offer) {
      this.deps.logger?.warn('grant.offer_not_found', {
        offerRef: cmd.offerRef,
        userId: cmd.userId,
      })
      return { granted: 0, itemsResolved: 0 }
    }

    let granted = 0
    for (const item of offer.items) {
      const snapshot: EntitlementSnapshot = {
        offerId: offer.offerId,
        offerSlug: offer.offerSlug,
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        kind: item.kind,
        accessType: item.fulfillment?.accessType ?? 'none',
        courseRef: item.fulfillment?.courseRef ?? null,
        fulfillment: item.fulfillment,
        resolvedAt: cmd.grantedAt.toISOString(),
      }
      const applied = cmd.subscription
        ? await this.grantSubscription(cmd, item, snapshot, cmd.subscription)
        : await this.grantLifetime(cmd, item, snapshot)
      if (applied) granted += 1
    }

    this.deps.logger?.info('grant.done', {
      userId: cmd.userId,
      offerId: offer.offerId,
      itemsResolved: offer.items.length,
      granted,
    })
    return { granted, itemsResolved: offer.items.length }
  }

  /** Compra única → matrícula VITALÍCIA (`expiresAt = null`). Idempotente por pagamento+produto. */
  private async grantLifetime(
    cmd: GrantEntitlementCommand,
    item: ResolvedOfferItem,
    snapshot: EntitlementSnapshot,
  ): Promise<boolean> {
    const entitlement = EntitlementAggregate.grant({
      id: this.deps.newId(),
      userId: cmd.userId,
      productId: item.productId,
      productKind: item.kind,
      accessType: snapshot.accessType,
      courseRef: snapshot.courseRef,
      offerId: snapshot.offerId,
      snapshot,
      sourceKind: 'payment',
      sourceId: cmd.paymentId,
      subscriptionId: null,
      grantedAt: cmd.grantedAt,
      expiresAt: null,
      idempotencyKey: `payment:${cmd.paymentId}:${item.productId}`,
    })
    return this.deps.entitlements.save(entitlement)
  }

  /** Assinatura → cria/estende com validade = grant + intervalo + carência. */
  private async grantSubscription(
    cmd: GrantEntitlementCommand,
    item: ResolvedOfferItem,
    snapshot: EntitlementSnapshot,
    sub: { subscriptionId: string; intervalMonths: number | null },
  ): Promise<boolean> {
    const idempotencyKey = `subscription:${sub.subscriptionId}:${item.productId}`
    const expiresAt =
      sub.intervalMonths && sub.intervalMonths > 0
        ? computeExpiry(cmd.grantedAt, sub.intervalMonths, this.deps.graceDays)
        : null

    const existing = await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)
    if (existing) {
      if (!expiresAt) return false
      existing.extendTo(expiresAt, cmd.grantedAt)
      return this.deps.entitlements.update(existing)
    }

    const entitlement = EntitlementAggregate.grant({
      id: this.deps.newId(),
      userId: cmd.userId,
      productId: item.productId,
      productKind: item.kind,
      accessType: snapshot.accessType,
      courseRef: snapshot.courseRef,
      offerId: snapshot.offerId,
      snapshot,
      sourceKind: 'subscription',
      sourceId: sub.subscriptionId,
      subscriptionId: sub.subscriptionId,
      grantedAt: cmd.grantedAt,
      expiresAt,
      idempotencyKey,
    })
    return this.deps.entitlements.save(entitlement)
  }
}

/** Fim do ciclo da assinatura + carência. Dia exato não é crítico (a carência absorve). */
export function computeExpiry(grantedAt: Date, intervalMonths: number, graceDays: number): Date {
  const d = new Date(grantedAt.getTime())
  d.setMonth(d.getMonth() + intervalMonths)
  d.setDate(d.getDate() + graceDays)
  return d
}
