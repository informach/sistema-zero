import { and, eq } from 'drizzle-orm'
import type { SubscriptionPlanRegistry } from '../../../domain/ports/subscription-plan-registry.port'
import type { Database } from './db'
import { subscriptionPlans } from './schema'

/** Normaliza `repeats` (`null` = ilimitado) para a chave única determinística. */
function repeatsKeyOf(repeats: number | null): number {
  return repeats ?? -1
}

/**
 * Registro de planos de recorrência reutilizáveis (Drizzle/Postgres). Mapeia
 * (provider, intervalMonths, repeats) → `plan_id` da Efí. O `register` usa
 * `ON CONFLICT DO NOTHING` + re-SELECT para resolver corridas sem segurar lock
 * durante a chamada de rede que cria o plano.
 */
export class DrizzleSubscriptionPlanRegistry implements SubscriptionPlanRegistry {
  constructor(private readonly db: Database) {}

  async find(
    provider: string,
    intervalMonths: number,
    repeats: number | null,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ providerPlanId: subscriptionPlans.providerPlanId })
      .from(subscriptionPlans)
      .where(
        and(
          eq(subscriptionPlans.provider, provider),
          eq(subscriptionPlans.intervalMonths, intervalMonths),
          eq(subscriptionPlans.repeatsKey, repeatsKeyOf(repeats)),
        ),
      )
      .limit(1)
    return row?.providerPlanId ?? null
  }

  async register(input: {
    provider: string
    intervalMonths: number
    repeats: number | null
    providerPlanId: string
    name: string
  }): Promise<string> {
    const repeatsKey = repeatsKeyOf(input.repeats)
    const inserted = await this.db
      .insert(subscriptionPlans)
      .values({
        provider: input.provider,
        intervalMonths: input.intervalMonths,
        repeats: input.repeats,
        repeatsKey,
        providerPlanId: input.providerPlanId,
        name: input.name,
      })
      .onConflictDoNothing({
        target: [
          subscriptionPlans.provider,
          subscriptionPlans.intervalMonths,
          subscriptionPlans.repeatsKey,
        ],
      })
      .returning({ providerPlanId: subscriptionPlans.providerPlanId })

    if (inserted[0]) return inserted[0].providerPlanId

    // Perdemos a corrida: outra requisição registrou o plano primeiro. Reusa o
    // vencedor (nosso plano recém-criado na Efí fica órfão — aceitável).
    const winner = await this.find(input.provider, input.intervalMonths, input.repeats)
    return winner ?? input.providerPlanId
  }
}
