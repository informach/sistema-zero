import type { Logger } from '@sistemazero/core/logging'
import { EntitlementAggregate } from '../../domain/entitlement/entitlement.aggregate'
import type { EntitlementSnapshot } from '../../domain/entitlement/entitlement-snapshot'
import type { CatalogGateway, ResolvedOffer } from '../../domain/ports/catalog-gateway.port'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'
import type { MoldaRolloutCandidateSource } from '../../domain/ports/molda-rollout-candidates.port'

export interface MoldaEntitlementRolloutResult {
  scanned: number
  eligible: number
  granted: number
  alreadyPresent: number
  failed: number
}

export interface MoldaEntitlementRolloutDeps {
  candidates: MoldaRolloutCandidateSource
  catalog: CatalogGateway
  entitlements: EntitlementRepository
  newId: () => string
  clock: () => Date
  logger?: Logger
}

/**
 * Concede somente o item Molda a assinaturas ativas criadas antes de ele entrar
 * no bundle. A chave usada é a mesma do grant normal, portanto reexecuções e uma
 * renovação concorrente convergem para uma única matrícula.
 */
export class MoldaEntitlementRolloutService {
  constructor(private readonly deps: MoldaEntitlementRolloutDeps) {}

  async execute(options: { apply?: boolean } = {}): Promise<MoldaEntitlementRolloutResult> {
    const now = this.deps.clock()
    const candidates = await this.deps.candidates.listActive(now)
    const offers = new Map<string, Promise<ResolvedOffer | null>>()
    const result: MoldaEntitlementRolloutResult = {
      scanned: candidates.length,
      eligible: 0,
      granted: 0,
      alreadyPresent: 0,
      failed: 0,
    }

    for (const candidate of candidates) {
      try {
        const offerPromise =
          offers.get(candidate.offerSlug) ??
          this.deps.catalog.resolveOfferEntitlements(candidate.offerSlug)
        offers.set(candidate.offerSlug, offerPromise)
        const offer = await offerPromise
        const item = offer?.items.find((entry) => entry.fulfillment?.courseRef === 'molda')
        const fulfillment = item?.fulfillment
        if (!offer || !item || !fulfillment || fulfillment.accessType !== 'community') {
          throw new Error(`oferta ${candidate.offerSlug} não entrega o Molda`)
        }

        const idempotencyKey = `subscription:${candidate.subscriptionId}:${item.productId}`
        if (await this.deps.entitlements.findByIdempotencyKey(idempotencyKey)) {
          result.alreadyPresent += 1
          continue
        }

        result.eligible += 1
        if (!options.apply) continue

        const snapshot: EntitlementSnapshot = {
          offerId: offer.offerId,
          offerSlug: offer.offerSlug,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          kind: item.kind,
          accessType: fulfillment.accessType,
          courseRef: fulfillment.courseRef ?? null,
          fulfillment,
          resolvedAt: now.toISOString(),
        }
        const inserted = await this.deps.entitlements.save(
          EntitlementAggregate.grant({
            id: this.deps.newId(),
            userId: candidate.userId,
            productId: item.productId,
            productKind: item.kind,
            accessType: snapshot.accessType,
            courseRef: snapshot.courseRef,
            offerId: snapshot.offerId,
            snapshot,
            sourceKind: 'subscription',
            sourceId: candidate.subscriptionId,
            subscriptionId: candidate.subscriptionId,
            grantedAt: candidate.grantedAt,
            expiresAt: candidate.expiresAt,
            idempotencyKey,
          }),
        )
        if (inserted) result.granted += 1
        else result.alreadyPresent += 1
      } catch (error) {
        result.failed += 1
        this.deps.logger?.error('molda_rollout.candidate_failed', {
          subscriptionId: candidate.subscriptionId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    this.deps.logger?.info('molda_rollout.finished', { apply: options.apply === true, ...result })
    return result
  }
}
