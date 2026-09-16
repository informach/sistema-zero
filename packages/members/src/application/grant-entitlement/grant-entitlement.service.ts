import type { Logger } from '@sistemazero/core/logging'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import { InvalidPurchasedAccessPolicyError } from '../../domain/entitlement/entitlement.errors'
import type {
  EntitlementSnapshot,
  PurchasedAccessPolicy,
} from '../../domain/entitlement/entitlement-snapshot'
import type { CatalogGateway, ResolvedOfferItem } from '../../domain/ports/catalog-gateway.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

/**
 * Intenção de concessão. A política comprada vence os campos legados; sem ela,
 * `subscription` → ciclo, `accessPeriodMonths` → prazo fixo em meses, e a
 * ausência de ambos preserva a compra vitalícia histórica.
 */
export interface GrantEntitlementCommand {
  userId: string
  /** Slug ou id da oferta no catálogo. */
  offerRef: string
  /** Id do pagamento (compra única) ou da cobrança do ciclo. */
  paymentId: string
  grantedAt: Date
  subscription?: { subscriptionId: string; intervalMonths: number | null } | null
  /** Meses de acesso de uma compra única POR PERÍODO (ignorado com `subscription`). */
  accessPeriodMonths?: number | null
  /** Contrato imutável aceito na compra; ausente somente em eventos legados. */
  accessPolicy?: PurchasedAccessPolicy | null
}

export interface GrantEntitlementDeps {
  catalog: CatalogGateway
  entitlements: EntitlementRepository
  graceDays: number
  newId: () => string
  logger?: Logger
}

export interface GrantResult {
  /** `false` = a oferta NÃO foi resolvida no catálogo (404). O chamador deve tratar
   * como falha retryável (não como sucesso), para auto-curar uma corrida (grant antes
   * da oferta existir) e aflorar uma divergência de slug permanente. */
  offerFound: boolean
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
    // Valida a coerência ANTES de catálogo ou persistência. Uma política presente
    // nunca é reinterpretada por campos legados divergentes.
    const accessPolicy = resolvePurchasedAccessPolicy(cmd)
    const offer = await this.deps.catalog.resolveOfferEntitlements(cmd.offerRef)
    if (!offer) {
      this.deps.logger?.warn('grant.offer_not_found', {
        offerRef: cmd.offerRef,
        userId: cmd.userId,
      })
      return { offerFound: false, granted: 0, itemsResolved: 0 }
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
        accessPolicy,
      }
      let applied: boolean
      if (accessPolicy.mode === 'billing_cycle') {
        const subscription = cmd.subscription
        // Defesa em profundidade: `resolvePurchasedAccessPolicy` já fecha este caso.
        if (!subscription) throw new InvalidPurchasedAccessPolicyError()
        applied = await this.grantSubscription(cmd, item, snapshot, subscription)
      } else {
        applied = await this.grantOneTime(cmd, item, snapshot, accessPolicy)
      }
      if (applied) granted += 1
    }

    this.deps.logger?.info('grant.done', {
      userId: cmd.userId,
      offerId: offer.offerId,
      itemsResolved: offer.items.length,
      granted,
    })
    return { offerFound: true, granted, itemsResolved: offer.items.length }
  }

  /**
   * Compra única → matrícula VITALÍCIA (`expiresAt = null`) ou POR PERÍODO sem
   * carência de assinatura. Renovar é uma NOVA compra (paymentId novo → linha
   * nova, sem tocar esta). Idempotente por pagamento+produto.
   */
  private async grantOneTime(
    cmd: GrantEntitlementCommand,
    item: ResolvedOfferItem,
    snapshot: EntitlementSnapshot,
    accessPolicy: Exclude<PurchasedAccessPolicy, { mode: 'billing_cycle' }>,
  ): Promise<boolean> {
    const expiresAt =
      accessPolicy.mode === 'fixed'
        ? computeFixedExpiry(cmd.grantedAt, accessPolicy.durationValue, accessPolicy.durationUnit)
        : null

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
      expiresAt,
      idempotencyKey: `payment:${cmd.paymentId}:${item.productId}`,
    })
    return this.deps.entitlements.save(entitlement)
  }

  /** Assinatura → cria/estende com validade = grant + intervalo + carência. */
  private async grantSubscription(
    cmd: GrantEntitlementCommand,
    item: ResolvedOfferItem,
    snapshot: EntitlementSnapshot,
    sub: Subscription,
  ): Promise<boolean> {
    const idempotencyKey = `subscription:${sub.subscriptionId}:${item.productId}`
    const expiresAt =
      sub.intervalMonths && sub.intervalMonths > 0
        ? computeSubscriptionExpiry(cmd.grantedAt, sub.intervalMonths, this.deps.graceDays)
        : null

    const existing = await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)
    if (existing) {
      if (!expiresAt) return false
      return this.extendWithRetry(existing, expiresAt, cmd.grantedAt, idempotencyKey)
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

  /**
   * Estende a validade re-tentando sob conflito otimista (renovação concorrendo
   * com cancel/ação admin). Sem o retry, o `update` perdedor fazia o webhook
   * responder 200 e a EXTENSÃO deste ciclo se perdia de vez (sem re-entrega).
   * Esgotou as tentativas → lança (500 → o gateway re-entrega). `false` = no-op
   * legítimo (revogada, ou a validade vigente já cobre o alvo).
   */
  private async extendWithRetry(
    first: EntitlementAggregate,
    expiresAt: Date,
    now: Date,
    idempotencyKey: string,
  ): Promise<boolean> {
    let current: EntitlementAggregate | null = first
    for (let attempt = 0; attempt < EXTEND_MAX_ATTEMPTS && current; attempt++) {
      const before = current.toSnapshot()
      current.extendTo(expiresAt, now)
      const after = current.toSnapshot()
      const changed =
        after.status !== before.status ||
        (after.expiresAt?.getTime() ?? null) !== (before.expiresAt?.getTime() ?? null)
      if (!changed) return false
      if (await this.deps.entitlements.update(current)) return true
      this.deps.logger?.warn('grant.extend_conflict', { idempotencyKey, attempt })
      current = await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)
    }
    if (!current) return false // a linha sumiu (não deveria) — nada a estender
    throw new Error(`conflito persistente ao estender a matrícula (${idempotencyKey})`)
  }
}

/** Tentativas de extensão sob conflito otimista antes de desistir (→ re-entrega). */
const EXTEND_MAX_ATTEMPTS = 3

type Subscription = { subscriptionId: string; intervalMonths: number | null }

/** Resolve e valida a precedência do contrato comercial antes de qualquer efeito. */
export function resolvePurchasedAccessPolicy(
  cmd: Pick<GrantEntitlementCommand, 'accessPolicy' | 'subscription' | 'accessPeriodMonths'>,
): PurchasedAccessPolicy {
  if (cmd.accessPolicy) {
    const policy = cmd.accessPolicy
    if (policy.mode === 'billing_cycle') {
      if (!cmd.subscription?.intervalMonths || cmd.subscription.intervalMonths <= 0) {
        throw new InvalidPurchasedAccessPolicyError(
          'Política billing_cycle exige uma assinatura com intervalo válido',
        )
      }
      return policy
    }
    if (cmd.subscription) {
      throw new InvalidPurchasedAccessPolicyError(
        'Compra vitalícia ou por prazo fixo não pode carregar uma assinatura',
      )
    }
    if (
      policy.mode === 'fixed' &&
      (!Number.isInteger(policy.durationValue) || policy.durationValue <= 0)
    ) {
      throw new InvalidPurchasedAccessPolicyError('Prazo fixo exige uma duração positiva')
    }
    return policy
  }

  if (cmd.subscription) {
    // Compatibilidade: eventos de assinatura antigos podiam chegar sem intervalo
    // e já eram persistidos sem validade calculada. Só o contrato novo explícito
    // fecha essa inconsistência; não quebramos uma reentrega histórica.
    return { mode: 'billing_cycle', durationValue: null, durationUnit: null }
  }
  if (cmd.accessPeriodMonths) {
    return {
      mode: 'fixed',
      durationValue: cmd.accessPeriodMonths,
      durationUnit: 'months',
    }
  }
  return { mode: 'lifetime', durationValue: null, durationUnit: null }
}

/**
 * Fim de uma compra única por prazo fixo. Dias são blocos exatos de 24h em UTC;
 * meses seguem o calendário e limitam o dia ao último dia do mês de destino.
 */
export function computeFixedExpiry(
  grantedAt: Date,
  durationValue: number,
  durationUnit: 'days' | 'months',
): Date {
  let expiresAt: Date
  if (durationUnit === 'days') {
    expiresAt = new Date(grantedAt.getTime() + durationValue * 86_400_000)
  } else {
    expiresAt = addUtcCalendarMonths(grantedAt, durationValue)
  }
  if (Number.isNaN(expiresAt.getTime())) {
    throw new InvalidPurchasedAccessPolicyError('Prazo fixo excede o calendário suportado')
  }
  return expiresAt
}

/** Fim do ciclo recorrente: mês-calendário em UTC + carência configurada. */
export function computeSubscriptionExpiry(
  grantedAt: Date,
  intervalMonths: number,
  graceDays: number,
): Date {
  const d = addUtcCalendarMonths(grantedAt, intervalMonths)
  d.setUTCDate(d.getUTCDate() + graceDays)
  return d
}

function addUtcCalendarMonths(grantedAt: Date, intervalMonths: number): Date {
  const totalMonths = grantedAt.getUTCFullYear() * 12 + grantedAt.getUTCMonth() + intervalMonths
  const targetMonth = totalMonths % 12
  const targetYear = (totalMonths - targetMonth) / 12

  const targetMonthDays = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const targetDay = Math.min(grantedAt.getUTCDate(), targetMonthDays)

  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      targetDay,
      grantedAt.getUTCHours(),
      grantedAt.getUTCMinutes(),
      grantedAt.getUTCSeconds(),
      grantedAt.getUTCMilliseconds(),
    ),
  )
}
