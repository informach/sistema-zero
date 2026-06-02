import type { Logger } from '@sistemazero/core/logging'
import type { EntitlementRepository } from '../../domain/ports/entitlement-repository.port'

export interface RevokeEntitlementDeps {
  entitlements: EntitlementRepository
  clock: () => Date
  logger?: Logger
}

/**
 * Reage ao ciclo de vida da assinatura (cancelamento/expiração). Acha as matrículas
 * pela `subscriptionId` (as próprias linhas de members) e rebaixa o status. Por isso
 * o webhook de assinatura só precisa de `{ subscriptionId }`. Idempotente.
 */
export class RevokeEntitlementService {
  constructor(private readonly deps: RevokeEntitlementDeps) {}

  /** Cancelamento → corte imediato (status `revoked`). UPDATE atômico, sem race. */
  async cancel(subscriptionId: string): Promise<{ affected: number }> {
    const affected = await this.deps.entitlements.revokeBySubscriptionId(
      subscriptionId,
      this.deps.clock(),
    )
    this.deps.logger?.info('subscription.cancel', { subscriptionId, affected })
    return { affected }
  }

  /** Expiração natural (status `expired`). UPDATE atômico, sem race. */
  async expire(subscriptionId: string): Promise<{ affected: number }> {
    const affected = await this.deps.entitlements.expireBySubscriptionId(
      subscriptionId,
      this.deps.clock(),
    )
    this.deps.logger?.info('subscription.expire', { subscriptionId, affected })
    return { affected }
  }
}
