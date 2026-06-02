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

  /** Cancelamento → corte imediato (status `revoked`). */
  async cancel(subscriptionId: string): Promise<{ affected: number }> {
    return this.apply(subscriptionId, 'cancel')
  }

  /** Expiração natural (status `expired`). */
  async expire(subscriptionId: string): Promise<{ affected: number }> {
    return this.apply(subscriptionId, 'expire')
  }

  private async apply(
    subscriptionId: string,
    op: 'cancel' | 'expire',
  ): Promise<{ affected: number }> {
    const list = await this.deps.entitlements.findBySubscriptionId(subscriptionId)
    const now = this.deps.clock()
    let affected = 0
    for (const entitlement of list) {
      const alreadyDone =
        op === 'cancel' ? entitlement.status === 'revoked' : entitlement.status === 'expired'
      if (alreadyDone) continue
      if (op === 'cancel') entitlement.revoke(now)
      else entitlement.expire(now)
      if (await this.deps.entitlements.update(entitlement)) affected += 1
    }
    this.deps.logger?.info(`subscription.${op}`, { subscriptionId, affected })
    return { affected }
  }
}
