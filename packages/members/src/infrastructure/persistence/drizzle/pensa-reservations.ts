import { and, eq, sql } from 'drizzle-orm'
import { localDateSaoPaulo } from '../../../domain/gamification/gamification'
import {
  PensaQuotaExceededError,
  PensaTaskProgressConflictError,
} from '../../../domain/pensa/pensa.errors'
import { type AiUsageQueryable, readAiUsageTotals } from './ai-usage.repository'
import { aiUsageDaily, aiUsageReservations } from './schema'

export interface PensaReservationInput {
  id: string
  projectId: string
  profileId: string
  accountId: string
  feature: 'pensa-planning' | 'pensa-help'
  privileged: boolean
  dailyLimit: number
  monthlyLimit: number
  now: Date
}

/** Quanto uma reserva vale desde o último uso (envio, aceite ou claim de um passo). */
const RESERVATION_WINDOW_MS = 30 * 60_000

/** Call first in a transaction, before the project lock. Same order as every quota consumer. */
export async function lockPensaAccount(tx: AiUsageQueryable, accountId: string): Promise<void> {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`ai-usage:${accountId}`}, 0))`,
  )
}

export async function reservePensaUsage(
  tx: AiUsageQueryable,
  input: PensaReservationInput,
): Promise<void> {
  const [existing] = await tx
    .select()
    .from(aiUsageReservations)
    .where(eq(aiUsageReservations.id, input.id))
  if (
    existing &&
    (existing.accountId !== input.accountId ||
      existing.profileId !== input.profileId ||
      existing.projectId !== input.projectId)
  )
    throw new PensaTaskProgressConflictError()
  if (existing?.status === 'committed') return
  const expiresAt = new Date(input.now.getTime() + RESERVATION_WINDOW_MS)
  if (existing?.status === 'reserved' && existing.expiresAt > input.now) {
    // Reserva viva é RENOVADA a cada uso, sem reconferir a cota: ela já conta no teto
    // (`readAiUsageTotals` soma as não vencidas), então estender não abre unidade nova. Com o
    // prazo fixo desde a 1ª mensagem, aceitar a proposta aos ~25 min fazia a reserva vencer
    // no meio dos guias: o `publish` do plano caía em "A reserva terminou", o plano ficava
    // sem missões e a nova tentativa reservava de novo.
    await tx
      .update(aiUsageReservations)
      .set({ expiresAt, updatedAt: input.now })
      .where(eq(aiUsageReservations.id, input.id))
    return
  }
  const day = localDateSaoPaulo(input.now)
  const totals = await readAiUsageTotals(tx, {
    accountId: input.accountId,
    day,
    month: day.slice(0, 7),
    now: input.now,
  })
  if (
    !input.privileged &&
    (totals.usedDay >= input.dailyLimit || totals.usedMonth >= input.monthlyLimit)
  )
    throw new PensaQuotaExceededError(
      'O Zappy não pode criar novas respostas agora. Seu guia salvo continua disponível.',
    )
  await tx
    .insert(aiUsageReservations)
    .values({
      id: input.id,
      accountId: input.accountId,
      profileId: input.profileId,
      projectId: input.projectId,
      day,
      feature: input.feature,
      status: 'reserved',
      privileged: input.privileged,
      expiresAt,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: aiUsageReservations.id,
      set: { status: 'reserved', day, expiresAt, updatedAt: input.now },
    })
}

export async function commitPensaUsage(
  tx: AiUsageQueryable,
  id: string,
  accountId: string,
  now: Date,
): Promise<void> {
  const [hold] = await tx
    .select()
    .from(aiUsageReservations)
    .where(and(eq(aiUsageReservations.id, id), eq(aiUsageReservations.accountId, accountId)))
  if (hold?.status === 'committed') return
  if (hold?.status !== 'reserved' || hold.expiresAt <= now)
    throw new PensaTaskProgressConflictError(
      'A reserva terminou. Retome a preparação para continuar.',
    )
  await tx
    .insert(aiUsageDaily)
    .values({
      accountId,
      day: hold.day,
      feature: hold.feature,
      used: 1,
      privileged: hold.privileged,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [aiUsageDaily.accountId, aiUsageDaily.day, aiUsageDaily.feature],
      set: { used: sql`${aiUsageDaily.used} + 1`, updatedAt: now },
    })
  await tx
    .update(aiUsageReservations)
    .set({ status: 'committed', updatedAt: now })
    .where(eq(aiUsageReservations.id, id))
}

/** Solta UMA reserva (a de uma operação que ficou para trás), não as do projeto inteiro. */
export async function releasePensaReservation(
  tx: AiUsageQueryable,
  id: string,
  now: Date,
): Promise<void> {
  await tx
    .update(aiUsageReservations)
    .set({ status: 'released', updatedAt: now })
    .where(and(eq(aiUsageReservations.id, id), eq(aiUsageReservations.status, 'reserved')))
}

export async function releasePensaUsage(
  tx: AiUsageQueryable,
  projectId: string,
  now: Date,
): Promise<void> {
  await tx
    .update(aiUsageReservations)
    .set({ status: 'released', updatedAt: now })
    .where(
      and(eq(aiUsageReservations.projectId, projectId), eq(aiUsageReservations.status, 'reserved')),
    )
}
