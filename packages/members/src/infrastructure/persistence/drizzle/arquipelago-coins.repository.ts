import { randomUUID } from 'node:crypto'
import { and, eq, sql } from 'drizzle-orm'
import type { Database } from './db'
import { lockLearningOwner } from './learning-owner-lock'
import { coinEvents, gamificationProfiles } from './schema'

export type MovimentoArquipelago = {
  userId: string
  accountId: string
  audience: 'kids' | 'adult'
  key: string
  operation: 'credit' | 'debit'
  amount: number
}

/**
 * Teto de moedas que o Arquipélago pode dar por semana (de segunda a domingo, no horário de São
 * Paulo), tudo ou nada. 150 = metade do que uma criança que estuda com regularidade ganha nos
 * cursos (~300 por semana): o curso continua a fonte principal (decisão de 27/10/2026, regras em
 * `docs/arquipelago-regras.md`). Separado do teto diário de 100 dos cursos (`DAILY_COIN_CAP`).
 */
export const ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS = 150

/** Operações serializadas com a mesma trava da carteira e a cerca de exclusão do perfil. */
export class ArquipelagoCoinsRepository {
  constructor(private readonly db: Database) {}

  async movimentar(input: MovimentoArquipelago, now = new Date()) {
    if (!Number.isSafeInteger(input.amount) || input.amount < 1 || input.amount > 1_000_000)
      throw new Error('Valor de moedas inválido')
    if (input.audience === 'adult' && input.userId !== input.accountId)
      return { ok: false as const, code: 'OWNER_MISMATCH' as const }
    return this.db.transaction(async (tx) => {
      await lockLearningOwner(tx, { userId: input.userId, accountId: input.accountId })
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${input.userId}`}, 0))`,
      )
      const [profile] = await tx
        .select()
        .from(gamificationProfiles)
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
        .limit(1)
      if (profile && profile.accountId !== input.accountId)
        return { ok: false as const, code: 'OWNER_MISMATCH' as const }
      const [existing] = await tx
        .select()
        .from(coinEvents)
        .where(
          and(
            eq(coinEvents.userId, input.userId),
            eq(coinEvents.audience, input.audience),
            eq(coinEvents.sourceId, input.key),
            sql`${coinEvents.sourceType} in ('arquipelago_credit', 'arquipelago_debit')`,
          ),
        )
        .limit(1)
      const signed = input.operation === 'credit' ? input.amount : -input.amount
      if (existing) {
        if (existing.amount !== signed) return { ok: false as const, code: 'KEY_CONFLICT' as const }
        return {
          ok: true as const,
          balance: existing.balanceAfter,
          amount: existing.amount,
          replayed: true,
        }
      }
      const balance = profile?.coinBalance ?? 0
      if (signed < 0 && balance < input.amount)
        return { ok: false as const, code: 'INSUFFICIENT_BALANCE' as const }
      if (signed > 0) {
        const [weekly] = await tx
          .select({ total: sql<number>`coalesce(sum(${coinEvents.amount}), 0)::integer` })
          .from(coinEvents)
          .where(
            and(
              eq(coinEvents.userId, input.userId),
              eq(coinEvents.audience, input.audience),
              eq(coinEvents.sourceType, 'arquipelago_credit'),
              sql`timezone('America/Sao_Paulo', ${coinEvents.createdAt}) >= date_trunc('week', timezone('America/Sao_Paulo', ${now.toISOString()}::timestamptz))`,
              sql`timezone('America/Sao_Paulo', ${coinEvents.createdAt}) < date_trunc('week', timezone('America/Sao_Paulo', ${now.toISOString()}::timestamptz)) + interval '7 days'`,
            ),
          )
        if ((weekly?.total ?? 0) + input.amount > ARQUIPELAGO_TETO_SEMANAL_DE_MOEDAS)
          return { ok: false as const, code: 'WEEKLY_LIMIT' as const }
      }
      const balanceAfter = balance + signed
      if (!profile) {
        await tx.insert(gamificationProfiles).values({
          id: randomUUID(),
          userId: input.userId,
          accountId: input.accountId,
          audience: input.audience,
          coinBalance: balanceAfter,
          lifetimeCoinsEarned: input.amount,
          createdAt: now,
          updatedAt: now,
        })
      } else {
        await tx
          .update(gamificationProfiles)
          .set({
            coinBalance: balanceAfter,
            lifetimeCoinsEarned: profile.lifetimeCoinsEarned + (signed > 0 ? signed : 0),
            updatedAt: now,
          })
          .where(eq(gamificationProfiles.id, profile.id))
      }
      await tx.insert(coinEvents).values({
        id: randomUUID(),
        userId: input.userId,
        audience: input.audience,
        sourceType: input.operation === 'credit' ? 'arquipelago_credit' : 'arquipelago_debit',
        sourceId: input.key,
        amount: signed,
        balanceAfter,
        createdAt: now,
      })
      return { ok: true as const, balance: balanceAfter, amount: signed, replayed: false }
    })
  }
}
