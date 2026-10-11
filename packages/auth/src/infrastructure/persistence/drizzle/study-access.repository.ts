import { randomUUID } from 'node:crypto'
import type { KidsSessionClaim } from '@sistemazero/core/security'
import { and, eq, gt, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import type {
  StudyAccessRepository,
  StudyCodeInput,
  StudyGrant,
  StudyPurgeResult,
} from '../../../domain/ports/study-access-repository.port'
import { DeviceOtherFamilyError } from '../../../domain/study-access/errors'
import {
  STUDY_ATTEMPT_LIMIT,
  STUDY_ATTEMPT_WINDOW_MS,
  STUDY_DEVICE_TTL_MS,
  studyAccessExpiresAt,
} from '../../../domain/study-access/policy'
import type { Database } from './db'
import {
  profiles,
  refreshTokenFamilies,
  studyAttempts,
  studyCodes,
  studyDevices,
  studyGrants,
  users,
} from './schema'

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0]

export interface StudyAccessRepositoryOptions {
  /** Linhas por DELETE da purga (bounded sob o `statement_timeout`). */
  purgeBatchSize?: number
  /** Teto de lotes por tabela em UM ciclo; o resto fica para o ciclo seguinte. */
  purgeMaxBatches?: number
}

/**
 * O lock do aparelho serializa autorizações e alternâncias entre irmãos. ⚠️ Ordem dos locks:
 * sempre APARELHO antes de AUTORIZAÇÃO (é a ordem do `activate`); invertida, um encerramento
 * concorrente com uma troca de irmão vira deadlock.
 */
export class DrizzleStudyAccessRepository implements StudyAccessRepository {
  private readonly purgeBatchSize: number
  private readonly purgeMaxBatches: number

  constructor(
    private readonly db: Database,
    options: StudyAccessRepositoryOptions = {},
  ) {
    this.purgeBatchSize = options.purgeBatchSize ?? 5_000
    this.purgeMaxBatches = options.purgeMaxBatches ?? 20
  }

  async createCode(input: StudyCodeInput): Promise<void> {
    await this.db.insert(studyCodes).values(input)
  }

  async redeemCode(input: {
    codeHash: string
    deviceHash: string
    expectedProfileId?: string
    now: Date
  }): Promise<StudyGrant | null> {
    return this.db.transaction(async (tx) => {
      const [code] = await tx
        .select()
        .from(studyCodes)
        .where(and(eq(studyCodes.codeHash, input.codeHash), gt(studyCodes.expiresAt, input.now)))
        .for('update')
        .limit(1)
      if (!code || (input.expectedProfileId && code.profileId !== input.expectedProfileId))
        return null
      if (!(await activeProfile(tx, code.accountUserId, code.profileId))) return null
      if (code.consumedAt) {
        // Só o MESMO navegador recupera uma resposta perdida. Outro não reutiliza o código.
        const [existing] = await tx
          .select()
          .from(studyDevices)
          .where(
            and(
              eq(studyDevices.tokenHash, input.deviceHash),
              gt(studyDevices.expiresAt, input.now),
            ),
          )
          .limit(1)
        if (!existing || code.consumedDeviceId !== existing.id || !code.grantId) return null
        const [grant] = await tx
          .select()
          .from(studyGrants)
          .where(
            and(
              eq(studyGrants.id, code.grantId),
              isNull(studyGrants.revokedAt),
              gt(studyGrants.expiresAt, input.now),
            ),
          )
          .limit(1)
        return grant ?? null
      }
      // Navegador de outra família com acesso vivo LANÇA aqui: o rollback mantém o código
      // intacto para a família certa usar em outro navegador.
      const device = await prepareDevice(tx, input.deviceHash, code.accountUserId, input.now)
      if (!device) return null
      const grant = await saveGrant(tx, {
        ...code,
        deviceId: device.id,
        expiresAt: studyAccessExpiresAt(code.durationDays, input.now),
        now: input.now,
      })
      await tx
        .update(studyCodes)
        .set({ consumedAt: input.now, consumedDeviceId: device.id, grantId: grant.id })
        .where(eq(studyCodes.id, code.id))
      return grant
    })
  }

  async createGrant(input: {
    accountUserId: string
    profileId: string
    deviceHash: string
    label: string
    expiresAt: Date
    now: Date
  }): Promise<StudyGrant | null> {
    return this.db.transaction(async (tx) => {
      if (!(await activeProfile(tx, input.accountUserId, input.profileId))) return null
      const device = await prepareDevice(tx, input.deviceHash, input.accountUserId, input.now)
      if (!device) return null
      return saveGrant(tx, { ...input, deviceId: device.id })
    })
  }

  async getDevice(deviceHash: string, now: Date) {
    const [device] = await this.db
      .select({
        id: studyDevices.id,
        accountUserId: studyDevices.accountUserId,
        activeSessionId: studyDevices.activeSessionId,
        expiresAt: studyDevices.expiresAt,
      })
      .from(studyDevices)
      .innerJoin(users, eq(users.id, studyDevices.accountUserId))
      .where(
        and(
          eq(studyDevices.tokenHash, deviceHash),
          gt(studyDevices.expiresAt, now),
          eq(users.status, 'active'),
        ),
      )
      .limit(1)
    return device ?? null
  }

  async listGrants(accountUserId: string, profileId?: string) {
    return this.db
      .select()
      .from(studyGrants)
      .where(
        and(
          eq(studyGrants.accountUserId, accountUserId),
          profileId ? eq(studyGrants.profileId, profileId) : undefined,
        ),
      )
      .orderBy(studyGrants.createdAt)
  }

  async activate(
    deviceHash: string,
    profileId: string,
    sessionId: string,
    now: Date,
  ): Promise<StudyGrant | null> {
    return this.db.transaction(async (tx) => {
      const [device] = await tx
        .select()
        .from(studyDevices)
        .where(and(eq(studyDevices.tokenHash, deviceHash), gt(studyDevices.expiresAt, now)))
        .for('update')
        .limit(1)
      if (!device || !(await activeProfile(tx, device.accountUserId, profileId))) return null
      const [grant] = await tx
        .select()
        .from(studyGrants)
        .where(
          and(
            eq(studyGrants.deviceId, device.id),
            eq(studyGrants.profileId, profileId),
            isNull(studyGrants.revokedAt),
            gt(studyGrants.expiresAt, now),
          ),
        )
        .for('update')
        .limit(1)
      if (!grant) return null
      if (device.activeSessionId) await revokeFamily(tx, device.activeSessionId, now)
      await tx
        .update(studyDevices)
        .set({ activeSessionId: sessionId })
        .where(eq(studyDevices.id, device.id))
      await tx.update(studyGrants).set({ lastUsedAt: now }).where(eq(studyGrants.id, grant.id))
      return { ...grant, lastUsedAt: now }
    })
  }

  async suspend(deviceHash: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [device] = await tx
        .select()
        .from(studyDevices)
        .where(eq(studyDevices.tokenHash, deviceHash))
        .for('update')
        .limit(1)
      if (!device) return
      if (device.activeSessionId) await revokeFamily(tx, device.activeSessionId, now)
      await tx
        .update(studyDevices)
        .set({ activeSessionId: null })
        .where(eq(studyDevices.id, device.id))
    })
  }

  async renew(
    accountUserId: string,
    grantId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<boolean> {
    const changed = await this.db
      .update(studyGrants)
      .set({ expiresAt })
      .where(
        and(
          eq(studyGrants.accountUserId, accountUserId),
          eq(studyGrants.id, grantId),
          isNull(studyGrants.revokedAt),
        ),
      )
      .returning({ deviceId: studyGrants.deviceId })
    // A credencial persistente também ganha tempo para receber a renovação ao voltar.
    const grant = changed[0]
    if (grant)
      await this.db
        .update(studyDevices)
        .set({ expiresAt: new Date(now.getTime() + STUDY_DEVICE_TTL_MS) })
        .where(eq(studyDevices.id, grant.deviceId))
    return changed.length === 1
  }

  async forgetDevice(deviceHash: string, accountUserId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [device] = await tx
        .select()
        .from(studyDevices)
        .where(eq(studyDevices.tokenHash, deviceHash))
        .for('update')
        .limit(1)
      if (!device) return
      // O responsável só esquece o navegador da PRÓPRIA família.
      if (device.accountUserId !== accountUserId) throw new DeviceOtherFamilyError()
      if (device.activeSessionId) await revokeFamily(tx, device.activeSessionId, now)
      // As autorizações pertencem ao navegador e saem por cascade. Perfis e progresso não mudam.
      await tx.delete(studyDevices).where(eq(studyDevices.id, device.id))
    })
  }

  async rename(accountUserId: string, grantId: string, label: string): Promise<boolean> {
    const changed = await this.db
      .update(studyGrants)
      .set({ label })
      .where(and(eq(studyGrants.accountUserId, accountUserId), eq(studyGrants.id, grantId)))
      .returning({ id: studyGrants.id })
    return changed.length === 1
  }

  async revoke(accountUserId: string, grantId: string, now: Date): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      const [target] = await tx
        .select({ deviceId: studyGrants.deviceId })
        .from(studyGrants)
        .where(and(eq(studyGrants.accountUserId, accountUserId), eq(studyGrants.id, grantId)))
        .limit(1)
      if (!target) return false
      await lockDevice(tx, target.deviceId)
      const changed = await tx
        .update(studyGrants)
        .set({
          revokedAt: sql`coalesce(${studyGrants.revokedAt}, ${now.toISOString()}::timestamptz)`,
        })
        .where(and(eq(studyGrants.accountUserId, accountUserId), eq(studyGrants.id, grantId)))
        .returning({ id: studyGrants.id })
      if (changed.length !== 1) return false
      await endSessionOfGrant(tx, target.deviceId, grantId, now)
      return true
    })
  }

  async revokeOnDevice(deviceHash: string, profileId: string, now: Date): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [device] = await tx
        .select({ id: studyDevices.id })
        .from(studyDevices)
        .where(and(eq(studyDevices.tokenHash, deviceHash), gt(studyDevices.expiresAt, now)))
        .for('update')
        .limit(1)
      if (!device) return
      const revoked = await tx
        .update(studyGrants)
        .set({
          revokedAt: sql`coalesce(${studyGrants.revokedAt}, ${now.toISOString()}::timestamptz)`,
        })
        .where(and(eq(studyGrants.deviceId, device.id), eq(studyGrants.profileId, profileId)))
        .returning({ id: studyGrants.id })
      for (const grant of revoked) await endSessionOfGrant(tx, device.id, grant.id, now)
    })
  }

  async validateSession(
    claim: KidsSessionClaim,
    accountUserId: string,
    profileId: string | null,
    now: Date,
  ): Promise<boolean> {
    const [family] = await this.db
      .select({ context: refreshTokenFamilies.kidsContext })
      .from(refreshTokenFamilies)
      .innerJoin(users, eq(users.id, refreshTokenFamilies.userId))
      .where(
        and(
          eq(refreshTokenFamilies.id, claim.sessionId),
          eq(refreshTokenFamilies.userId, accountUserId),
          isNull(refreshTokenFamilies.revokedAt),
          gt(refreshTokenFamilies.expiresAt, now),
          eq(users.status, 'active'),
        ),
      )
      .limit(1)
    if (!family?.context || family.context.kind !== claim.kind) return false
    if (claim.kind === 'parent')
      return (
        profileId === null &&
        family.context.kind === 'parent' &&
        family.context.authenticatedAt === claim.authenticatedAt
      )
    if (
      !profileId ||
      family.context.kind !== 'student' ||
      family.context.grantId !== claim.grantId ||
      family.context.deviceId !== claim.deviceId
    )
      return false
    const [grant] = await this.db
      .select({ id: studyGrants.id })
      .from(studyGrants)
      .innerJoin(studyDevices, eq(studyDevices.id, studyGrants.deviceId))
      .innerJoin(profiles, eq(profiles.id, studyGrants.profileId))
      .where(
        and(
          eq(studyGrants.id, claim.grantId),
          eq(studyGrants.profileId, profileId),
          eq(studyGrants.accountUserId, accountUserId),
          eq(profiles.accountUserId, accountUserId),
          eq(profiles.status, 'active'),
          eq(studyDevices.id, claim.deviceId),
          eq(studyDevices.accountUserId, accountUserId),
          eq(studyDevices.activeSessionId, claim.sessionId),
          gt(studyDevices.expiresAt, now),
          isNull(studyGrants.revokedAt),
          gt(studyGrants.expiresAt, now),
        ),
      )
      .limit(1)
    return Boolean(grant)
  }

  async takeAttempt(keyHash: string, now: Date): Promise<boolean> {
    const resetsAt = new Date(now.getTime() + STUDY_ATTEMPT_WINDOW_MS)
    const [attempt] = await this.db
      .insert(studyAttempts)
      .values({ keyHash, count: 1, resetsAt })
      .onConflictDoUpdate({
        target: studyAttempts.keyHash,
        set: {
          count: sql`case when ${studyAttempts.resetsAt} <= ${now.toISOString()}::timestamptz then 1 else ${studyAttempts.count} + 1 end`,
          resetsAt: sql`case when ${studyAttempts.resetsAt} <= ${now.toISOString()}::timestamptz then ${resetsAt.toISOString()}::timestamptz else ${studyAttempts.resetsAt} end`,
        },
      })
      .returning({ count: studyAttempts.count })
    return Boolean(attempt && attempt.count <= STUDY_ATTEMPT_LIMIT)
  }

  async attemptsExhausted(keyHash: string, now: Date): Promise<boolean> {
    const [attempt] = await this.db
      .select({ count: studyAttempts.count })
      .from(studyAttempts)
      .where(and(eq(studyAttempts.keyHash, keyHash), gt(studyAttempts.resetsAt, now)))
      .limit(1)
    return Boolean(attempt && attempt.count >= STUDY_ATTEMPT_LIMIT)
  }

  async deleteExpired(expiredBefore: Date, grantsEndedBefore: Date): Promise<StudyPurgeResult> {
    const size = this.purgeBatchSize
    const codes = await this.drain(async () => {
      const batch = this.db
        .select({ id: studyCodes.id })
        .from(studyCodes)
        .where(lt(studyCodes.expiresAt, expiredBefore))
        .limit(size)
      const deleted = await this.db
        .delete(studyCodes)
        .where(inArray(studyCodes.id, batch))
        .returning({ id: studyCodes.id })
      return deleted.length
    })
    const attempts = await this.drain(async () => {
      const batch = this.db
        .select({ id: studyAttempts.keyHash })
        .from(studyAttempts)
        .where(lt(studyAttempts.resetsAt, expiredBefore))
        .limit(size)
      const deleted = await this.db
        .delete(studyAttempts)
        .where(inArray(studyAttempts.keyHash, batch))
        .returning({ id: studyAttempts.keyHash })
      return deleted.length
    })
    // Encerrada há mais que a retenção, ou vencida (sem encerramento) há mais que ela.
    const grants = await this.drain(async () => {
      const batch = this.db
        .select({ id: studyGrants.id })
        .from(studyGrants)
        .where(
          or(
            and(isNotNull(studyGrants.revokedAt), lt(studyGrants.revokedAt, grantsEndedBefore)),
            and(isNull(studyGrants.revokedAt), lt(studyGrants.expiresAt, grantsEndedBefore)),
          ),
        )
        .limit(size)
      const deleted = await this.db
        .delete(studyGrants)
        .where(inArray(studyGrants.id, batch))
        .returning({ id: studyGrants.id })
      return deleted.length
    })
    // Aparelho expirado leva as autorizações restantes por cascade.
    const devices = await this.drain(async () => {
      const batch = this.db
        .select({ id: studyDevices.id })
        .from(studyDevices)
        .where(lt(studyDevices.expiresAt, expiredBefore))
        .limit(size)
      const deleted = await this.db
        .delete(studyDevices)
        .where(inArray(studyDevices.id, batch))
        .returning({ id: studyDevices.id })
      return deleted.length
    })
    return { codes, attempts, grants, devices }
  }

  /**
   * Repete o lote enquanto ele vier CHEIO, até o teto por ciclo. ⚠️ Um lote só por ciclo
   * (6 h) deixava um backlog grande crescer mais rápido do que a purga apagava.
   */
  private async drain(step: () => Promise<number>): Promise<number> {
    let total = 0
    for (let batch = 0; batch < this.purgeMaxBatches; batch++) {
      const deleted = await step()
      total += deleted
      if (deleted < this.purgeBatchSize) break
    }
    return total
  }
}

async function activeProfile(
  tx: Transaction,
  accountUserId: string,
  profileId: string,
): Promise<boolean> {
  const [profile] = await tx
    .select({ id: profiles.id })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.accountUserId))
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.accountUserId, accountUserId),
        eq(profiles.status, 'active'),
        eq(users.status, 'active'),
      ),
    )
    .limit(1)
  return Boolean(profile)
}

/** Uma autorização da família DONA do navegador ainda serve para entrar? */
async function familyHasLiveGrant(
  tx: Transaction,
  deviceId: string,
  accountUserId: string,
  now: Date,
): Promise<boolean> {
  const [grant] = await tx
    .select({ id: studyGrants.id })
    .from(studyGrants)
    .innerJoin(profiles, eq(profiles.id, studyGrants.profileId))
    .innerJoin(users, eq(users.id, studyGrants.accountUserId))
    .where(
      and(
        eq(studyGrants.deviceId, deviceId),
        eq(studyGrants.accountUserId, accountUserId),
        isNull(studyGrants.revokedAt),
        gt(studyGrants.expiresAt, now),
        eq(profiles.status, 'active'),
        eq(users.status, 'active'),
      ),
    )
    .limit(1)
  return Boolean(grant)
}

async function prepareDevice(tx: Transaction, tokenHash: string, accountUserId: string, now: Date) {
  await tx
    .insert(studyDevices)
    .values({
      id: randomUUID(),
      accountUserId,
      tokenHash,
      expiresAt: new Date(now.getTime() + STUDY_DEVICE_TTL_MS),
    })
    .onConflictDoNothing()
  const [device] = await tx
    .select()
    .from(studyDevices)
    .where(eq(studyDevices.tokenHash, tokenHash))
    .for('update')
    .limit(1)
  if (!device) return null
  const expired = device.expiresAt <= now
  const otherFamily = device.accountUserId !== accountUserId
  // ⚠️ O navegador só fica preso à família anterior enquanto ELA tiver um acesso vivo aqui.
  // Sem isso, o computador emprestado recusava para sempre o código de outra família.
  if (
    otherFamily &&
    !expired &&
    (await familyHasLiveGrant(tx, device.id, device.accountUserId, now))
  )
    throw new DeviceOtherFamilyError()
  // Só chegamos aqui com nova autorização adulta ou um código válido. Credencial expirada
  // ou navegador que troca de família: nada da sessão e das autorizações antigas reabre.
  const reset = expired || otherFamily
  if (reset) {
    if (device.activeSessionId) await revokeFamily(tx, device.activeSessionId, now)
    await tx
      .update(studyGrants)
      .set({ revokedAt: now })
      .where(and(eq(studyGrants.deviceId, device.id), isNull(studyGrants.revokedAt)))
  }
  const [prepared] = await tx
    .update(studyDevices)
    .set({
      accountUserId,
      expiresAt: new Date(now.getTime() + STUDY_DEVICE_TTL_MS),
      ...(reset ? { activeSessionId: null } : {}),
    })
    .where(eq(studyDevices.id, device.id))
    .returning()
  return prepared ?? null
}

async function saveGrant(
  tx: Transaction,
  input: {
    accountUserId: string
    profileId: string
    deviceId: string
    label: string
    expiresAt: Date
    now: Date
  },
): Promise<StudyGrant> {
  // ⚠️ Reautorizar o mesmo perfil no mesmo navegador conserva `id` e `createdAt`: o código
  // em voo aponta para esse id (repetição idempotente) e o painel mantém a linha. A sessão
  // que um encerramento derrubou não volta, porque `revoke` já revogou a família dela.
  const [grant] = await tx
    .insert(studyGrants)
    .values({
      id: randomUUID(),
      accountUserId: input.accountUserId,
      profileId: input.profileId,
      deviceId: input.deviceId,
      label: input.label,
      expiresAt: input.expiresAt,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: input.now,
    })
    .onConflictDoUpdate({
      target: [studyGrants.deviceId, studyGrants.profileId],
      set: { label: input.label, expiresAt: input.expiresAt, revokedAt: null, lastUsedAt: null },
    })
    .returning()
  if (!grant) throw new Error('Autorização não foi persistida')
  return grant
}

async function lockDevice(tx: Transaction, deviceId: string): Promise<void> {
  await tx
    .select({ id: studyDevices.id })
    .from(studyDevices)
    .where(eq(studyDevices.id, deviceId))
    .for('update')
    .limit(1)
}

/** Derruba a sessão infantil aberta no navegador SE ela foi aberta com esta autorização. */
async function endSessionOfGrant(
  tx: Transaction,
  deviceId: string,
  grantId: string,
  now: Date,
): Promise<void> {
  const [device] = await tx
    .select({ activeSessionId: studyDevices.activeSessionId })
    .from(studyDevices)
    .where(eq(studyDevices.id, deviceId))
    .limit(1)
  if (!device?.activeSessionId) return
  const [family] = await tx
    .select({ context: refreshTokenFamilies.kidsContext })
    .from(refreshTokenFamilies)
    .where(eq(refreshTokenFamilies.id, device.activeSessionId))
    .limit(1)
  if (family?.context?.kind !== 'student' || family.context.grantId !== grantId) return
  await revokeFamily(tx, device.activeSessionId, now)
  await tx.update(studyDevices).set({ activeSessionId: null }).where(eq(studyDevices.id, deviceId))
}

async function revokeFamily(tx: Transaction, familyId: string, now: Date): Promise<void> {
  await tx
    .update(refreshTokenFamilies)
    .set({ revokedAt: now, updatedAt: now })
    .where(and(eq(refreshTokenFamilies.id, familyId), isNull(refreshTokenFamilies.revokedAt)))
}
