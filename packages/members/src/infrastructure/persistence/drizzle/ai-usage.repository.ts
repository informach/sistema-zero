import { countDistinct, desc, sql, sum } from 'drizzle-orm'
import type {
  AiUsageMonthStats,
  AiUsageRepository,
  ConsumeAiUsageInput,
  ConsumeAiUsageOutcome,
} from '../../../domain/ports/ai-usage-repository.port'
import type { Database } from './db'
import { aiUsageDaily } from './schema'

/** Início do mês SEGUINTE a `YYYY-MM` (data sempre VÁLIDA — `${month}-31` não é). */
function nextMonthStart(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const ny = m === 12 ? (y as number) + 1 : (y as number)
  const nm = m === 12 ? 1 : (m as number) + 1
  return `${ny}-${String(nm).padStart(2, '0')}-01`
}

export class DrizzleAiUsageRepository implements AiUsageRepository {
  constructor(private readonly db: Database) {}

  async consume(input: ConsumeAiUsageInput): Promise<ConsumeAiUsageOutcome> {
    return this.db.transaction(async (tx) => {
      // Serializa POR CONTA: dois consumos simultâneos (irmãos da mesma conta em
      // dispositivos diferentes) não correm no read-then-upsert e nunca furam o
      // teto. Namespace 'ai-usage:' próprio — o espaço de advisory locks é GLOBAL
      // ao banco compartilhado (não colidir com 'gamification:'/quiz). Solta no
      // commit/rollback.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`ai-usage:${input.accountId}`}, 0))`,
      )

      const monthStart = `${input.month}-01`
      const [totals] = await tx
        .select({
          usedDay: sum(
            sql`case when ${aiUsageDaily.day} = ${input.day} then ${aiUsageDaily.used} else 0 end`,
          ).mapWith(Number),
          usedMonth: sum(aiUsageDaily.used).mapWith(Number),
        })
        .from(aiUsageDaily)
        .where(
          sql`${aiUsageDaily.accountId} = ${input.accountId}
            and ${aiUsageDaily.day} >= ${monthStart}
            and ${aiUsageDaily.day} < ${nextMonthStart(input.month)}`,
        )

      const usedDay = totals?.usedDay ?? 0
      const usedMonth = totals?.usedMonth ?? 0

      // Equipe grava mas NUNCA é recusada (visibilidade de custo sem atrito).
      if (!input.privileged) {
        if (usedDay >= input.dailyLimit) {
          return { allowed: false, scope: 'day', usedDay, usedMonth }
        }
        if (usedMonth >= input.monthlyLimit) {
          return { allowed: false, scope: 'month', usedDay, usedMonth }
        }
      }

      await tx
        .insert(aiUsageDaily)
        .values({
          accountId: input.accountId,
          day: input.day,
          feature: input.feature,
          used: 1,
          privileged: input.privileged,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: [aiUsageDaily.accountId, aiUsageDaily.day, aiUsageDaily.feature],
          set: {
            used: sql`${aiUsageDaily.used} + 1`,
            // Snapshot "esta conta é equipe" pode virar true depois (promoção) —
            // o OR preserva o rótulo uma vez marcado.
            privileged: sql`${aiUsageDaily.privileged} or ${input.privileged}`,
            updatedAt: input.now,
          },
        })

      return { allowed: true, usedDay: usedDay + 1, usedMonth: usedMonth + 1 }
    })
  }

  async statsForMonth(month: string, today: string, topLimit: number): Promise<AiUsageMonthStats> {
    const monthStart = `${month}-01`
    const monthEnd = nextMonthStart(month)
    const inMonth = sql`${aiUsageDaily.day} >= ${monthStart} and ${aiUsageDaily.day} < ${monthEnd}`

    const [[header], byFeature, days, topAccounts] = await Promise.all([
      this.db
        .select({
          monthUsed: sum(aiUsageDaily.used).mapWith(Number),
          todayUsed: sum(
            sql`case when ${aiUsageDaily.day} = ${today} then ${aiUsageDaily.used} else 0 end`,
          ).mapWith(Number),
          accounts: countDistinct(aiUsageDaily.accountId),
        })
        .from(aiUsageDaily)
        .where(inMonth),
      this.db
        .select({ feature: aiUsageDaily.feature, used: sum(aiUsageDaily.used).mapWith(Number) })
        .from(aiUsageDaily)
        .where(inMonth)
        .groupBy(aiUsageDaily.feature)
        .orderBy(desc(sum(aiUsageDaily.used))),
      this.db
        .select({ day: aiUsageDaily.day, used: sum(aiUsageDaily.used).mapWith(Number) })
        .from(aiUsageDaily)
        .where(inMonth)
        .groupBy(aiUsageDaily.day)
        .orderBy(aiUsageDaily.day),
      this.db
        .select({
          accountId: aiUsageDaily.accountId,
          used: sum(aiUsageDaily.used).mapWith(Number),
          privileged: sql<boolean>`bool_or(${aiUsageDaily.privileged})`,
        })
        .from(aiUsageDaily)
        .where(inMonth)
        .groupBy(aiUsageDaily.accountId)
        .orderBy(desc(sum(aiUsageDaily.used)))
        .limit(topLimit),
    ])

    return {
      month,
      monthUsed: header?.monthUsed ?? 0,
      todayUsed: header?.todayUsed ?? 0,
      accounts: header?.accounts ?? 0,
      byFeature: byFeature.map((r) => ({ feature: r.feature, used: r.used ?? 0 })),
      days: days.map((r) => ({ day: r.day, used: r.used ?? 0 })),
      topAccounts: topAccounts.map((r) => ({
        accountId: r.accountId,
        used: r.used ?? 0,
        privileged: r.privileged,
      })),
    }
  }
}
