import type {
  AiUsageMonthStats,
  AiUsageRepository,
  AiUsageTotals,
  ConsumeAiUsageInput,
  ConsumeAiUsageOutcome,
} from '../../src/domain/ports/ai-usage-repository.port'

interface Row {
  accountId: string
  day: string
  feature: string
  used: number
  privileged: boolean
}

/**
 * Fake em memória do contador de uso de IA — espelha a semântica do Drizzle
 * (checa dia+mês, upsert +1, privileged grava sem recusar). Os testes de
 * CONCORRÊNCIA real (advisory lock) vivem em `tests/db/ai-usage-atomicity.test.ts`.
 */
export class InMemoryAiUsageRepository implements AiUsageRepository {
  rows: Row[] = []

  async consume(input: ConsumeAiUsageInput): Promise<ConsumeAiUsageOutcome> {
    const inMonth = (r: Row) => r.accountId === input.accountId && r.day.startsWith(input.month)
    const usedDay = this.rows
      .filter((r) => inMonth(r) && r.day === input.day)
      .reduce((a, r) => a + r.used, 0)
    const usedMonth = this.rows.filter(inMonth).reduce((a, r) => a + r.used, 0)

    if (!input.privileged) {
      if (usedDay >= input.dailyLimit) return { allowed: false, scope: 'day', usedDay, usedMonth }
      if (usedMonth >= input.monthlyLimit) {
        return { allowed: false, scope: 'month', usedDay, usedMonth }
      }
    }

    const row = this.rows.find(
      (r) => r.accountId === input.accountId && r.day === input.day && r.feature === input.feature,
    )
    if (row) {
      row.used += 1
      row.privileged = row.privileged || input.privileged
    } else {
      this.rows.push({
        accountId: input.accountId,
        day: input.day,
        feature: input.feature,
        used: 1,
        privileged: input.privileged,
      })
    }
    return { allowed: true, usedDay: usedDay + 1, usedMonth: usedMonth + 1 }
  }

  async totals(input: { accountId: string; day: string; month: string }): Promise<AiUsageTotals> {
    const inMonth = (r: Row) => r.accountId === input.accountId && r.day.startsWith(input.month)
    return {
      usedDay: this.rows
        .filter((r) => inMonth(r) && r.day === input.day)
        .reduce((a, r) => a + r.used, 0),
      usedMonth: this.rows.filter(inMonth).reduce((a, r) => a + r.used, 0),
    }
  }

  async statsForMonth(month: string, today: string, topLimit: number): Promise<AiUsageMonthStats> {
    const rows = this.rows.filter((r) => r.day.startsWith(month))
    const byFeature = new Map<string, number>()
    const byDay = new Map<string, number>()
    const byAccount = new Map<string, { used: number; privileged: boolean }>()
    let monthUsed = 0
    let todayUsed = 0
    for (const r of rows) {
      monthUsed += r.used
      if (r.day === today) todayUsed += r.used
      byFeature.set(r.feature, (byFeature.get(r.feature) ?? 0) + r.used)
      byDay.set(r.day, (byDay.get(r.day) ?? 0) + r.used)
      const acc = byAccount.get(r.accountId) ?? { used: 0, privileged: false }
      acc.used += r.used
      acc.privileged = acc.privileged || r.privileged
      byAccount.set(r.accountId, acc)
    }
    return {
      month,
      monthUsed,
      todayUsed,
      accounts: byAccount.size,
      byFeature: [...byFeature.entries()]
        .map(([feature, used]) => ({ feature, used }))
        .sort((a, b) => b.used - a.used),
      days: [...byDay.entries()]
        .map(([day, used]) => ({ day, used }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      topAccounts: [...byAccount.entries()]
        .map(([accountId, v]) => ({ accountId, used: v.used, privileged: v.privileged }))
        .sort((a, b) => b.used - a.used)
        .slice(0, topLimit),
    }
  }
}
