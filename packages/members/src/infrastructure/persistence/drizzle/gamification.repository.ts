import { randomUUID } from 'node:crypto'
import {
  and,
  count,
  countDistinct,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  sum,
} from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { CourseAudience, CourseLevel } from '../../../domain/course/course'
import type { BadgeSlug } from '../../../domain/gamification/badges'
import {
  applyDailyCap,
  DAILY_COIN_CAP,
  streakMilestoneCoins,
} from '../../../domain/gamification/coins'
import {
  advanceStreak,
  coinsSaverBadgeSlugs,
  courseBadgeSlugs,
  pensaCycleBadgeSlugs,
  pensaStageBadgeSlugs,
  quizPerfectBadgeSlugs,
  streakBadgeSlugs,
  studioMasteryBadgeSlugs,
} from '../../../domain/gamification/gamification'
import type { QualifyingByLevel } from '../../../domain/gamification/levels'
import type { MissionGoalType } from '../../../domain/gamification/missions'
import {
  type AwardInput,
  type AwardResult,
  type BuyStreakFreezeInput,
  type BuyStreakFreezeResult,
  type ClaimMissionInput,
  type ClaimMissionResult,
  type GamificationProfileRecord,
  type GamificationRanking,
  type GamificationRepository,
  type LeagueMembershipRecord,
  MAX_STREAK_FREEZES,
  type SpendCoinsInput,
  type SpendCoinsResult,
  type XpSourceType,
} from '../../../domain/ports/gamification-repository.port'
import type { Database } from './db'
import {
  avatarInventory,
  coinEvents,
  courses,
  entitlements,
  gamificationProfiles,
  leagueMembership,
  missionClaims,
  roomInventory,
  userBadges,
  xpEvents,
} from './schema'

type CoinSourceTypeValue = (typeof coinEvents.sourceType.enumValues)[number]

// Tipo de XP (faucet de rotina) → tipo de moeda. Marcos (course_complete/
// quiz_perfect) não dão moeda e não aparecem aqui.
const COIN_TYPE_FOR_XP: Partial<Record<XpSourceType, CoinSourceTypeValue>> = {
  lesson_complete: 'lesson_complete',
  quiz_passed: 'quiz_passed',
  unit_complete: 'unit_complete',
  studio_passed: 'studio_passed',
  pensa_stage_complete: 'pensa_stage_complete',
  pensa_cycle_complete: 'pensa_cycle_complete',
}

function masterAccessType(audience: CourseAudience): 'all_courses' | 'all_kids_courses' {
  return audience === 'adult' ? 'all_courses' : 'all_kids_courses'
}

function entitlementInAudience(audience: CourseAudience) {
  return and(eq(courses.slug, entitlements.courseRef), eq(courses.audience, audience))
}

function activeAudienceAccessPredicate(audience: CourseAudience, now: Date) {
  return and(
    eq(entitlements.status, 'active'),
    or(isNull(entitlements.expiresAt), gt(entitlements.expiresAt, now)),
    or(
      and(eq(entitlements.accessType, 'course'), isNotNull(courses.id)),
      eq(entitlements.accessType, masterAccessType(audience)),
    ),
  )
}

export class DrizzleGamificationRepository implements GamificationRepository {
  constructor(private readonly db: Database) {}

  async award(input: AwardInput): Promise<AwardResult> {
    return this.db.transaction(async (tx) => {
      // Serializa o award POR ALUNO: dois completes simultâneos não correm no
      // read-then-upsert do perfil. Namespace 'gamification:' distinto do lock
      // de quiz ('userId:blockId') — o espaço de advisory locks é global ao
      // banco compartilhado. Solta sozinho no commit/rollback.
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${input.userId}`}, 0))`,
      )

      // SNAPSHOT da dificuldade dos MARCOS de curso (course_complete/course_showcased):
      // resolve `courses.level` AGORA (1 query) p/ congelar o nível no ledger — o rank
      // do aluno deixa de depender do `courses.level` ao vivo, então re-nivelar/apagar o
      // curso depois NUNCA rebaixa o rank. Demais sources não têm nível (null).
      const courseMarcoIds = input.events
        .filter((e) => e.sourceType === 'course_complete' || e.sourceType === 'course_showcased')
        .map((e) => e.sourceId)
      const levelByCourseId = new Map<string, CourseLevel>()
      if (courseMarcoIds.length > 0) {
        const levelRows = await tx
          .select({ id: courses.id, level: courses.level })
          .from(courses)
          .where(inArray(courses.id, courseMarcoIds))
        for (const r of levelRows) levelByCourseId.set(r.id, r.level)
      }

      // Ledger idempotente: só os eventos realmente NOVOS voltam do RETURNING.
      const newEvents =
        input.events.length > 0
          ? await tx
              .insert(xpEvents)
              .values(
                input.events.map((e) => ({
                  id: randomUUID(),
                  userId: input.userId,
                  audience: input.audience,
                  sourceType: e.sourceType,
                  sourceId: e.sourceId,
                  amount: e.amount,
                  sourceLevel: levelByCourseId.get(e.sourceId) ?? null,
                  createdAt: input.now,
                })),
              )
              .onConflictDoNothing({
                target: [xpEvents.userId, xpEvents.sourceType, xpEvents.sourceId],
              })
              .returning({
                sourceType: xpEvents.sourceType,
                sourceId: xpEvents.sourceId,
                amount: xpEvents.amount,
              })
          : []

      // Todas as badges são DERIVADAS do estado (ledger/streak) — sem candidatas
      // do caller (o dedupe do user_badges torna o re-check inócuo).
      const badgeCandidates = new Set<BadgeSlug>()

      // Contagens de marco são POR VITRINE (o ledger carrega a audiência).
      const countByType = async (sourceType: (typeof xpEvents.sourceType.enumValues)[number]) => {
        const [row] = await tx
          .select({ c: count() })
          .from(xpEvents)
          .where(
            and(
              eq(xpEvents.userId, input.userId),
              eq(xpEvents.audience, input.audience),
              eq(xpEvents.sourceType, sourceType),
            ),
          )
        return row?.c ?? 0
      }

      // Badge 'first-lesson': o INSERT desta chamada foi o 1º lesson_complete
      // da VITRINE (count == 1 já inclui a linha recém-inserida na tx).
      if (newEvents.some((e) => e.sourceType === 'lesson_complete')) {
        if ((await countByType('lesson_complete')) === 1) badgeCandidates.add('first-lesson')
      }

      // Badges de CURSOS concluídos: o ledger `course_complete` (1 evento por
      // curso, marco de amount 0) é o contador — 1º/2º/3º curso destravam
      // course-complete / -2 / -3.
      if (newEvents.some((e) => e.sourceType === 'course_complete')) {
        for (const slug of courseBadgeSlugs(await countByType('course_complete'))) {
          badgeCandidates.add(slug)
        }
      }

      // Badges de NOTAS MIL: o ledger `quiz_perfect` (1 marco por quiz/bloco)
      // conta quizzes com nota 100 — 1/10/30 destravam quiz-perfect / -10 / -30.
      if (newEvents.some((e) => e.sourceType === 'quiz_perfect')) {
        for (const slug of quizPerfectBadgeSlugs(await countByType('quiz_perfect'))) {
          badgeCandidates.add(slug)
        }
      }

      // Badges de MAESTRIA do Estúdio: ledger `studio_passed` (projetos aprovados).
      if (newEvents.some((e) => e.sourceType === 'studio_passed')) {
        for (const slug of studioMasteryBadgeSlugs(await countByType('studio_passed'))) {
          badgeCandidates.add(slug)
        }
      }

      // Badges do PENSA: 1ª etapa concluída (é sempre a Z = 1ª Carta da Ideia) e
      // 1º/3º ciclo lançado — contados pelo ledger, como as demais de maestria.
      if (newEvents.some((e) => e.sourceType === 'pensa_stage_complete')) {
        for (const slug of pensaStageBadgeSlugs(await countByType('pensa_stage_complete'))) {
          badgeCandidates.add(slug)
        }
      }
      if (newEvents.some((e) => e.sourceType === 'pensa_cycle_complete')) {
        for (const slug of pensaCycleBadgeSlugs(await countByType('pensa_cycle_complete'))) {
          badgeCandidates.add(slug)
        }
      }

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

      const xpAwarded = newEvents.reduce((sum, e) => sum + e.amount, 0)
      let totalXp = profile?.xp ?? 0
      let streak = {
        current: profile?.streakCurrent ?? 0,
        best: profile?.streakBest ?? 0,
        extended: false,
        freezesConsumed: 0,
      }
      let coinsAwarded = 0
      let coinBalance = profile?.coinBalance ?? 0
      let coinsCapped = false

      // Streak/lastActivityDate só avançam com evento novo de XP REAL (amount
      // > 0) — MARCOS (course_complete/quiz_perfect, amount 0) não movem streak
      // (regra: "só atividade que rende XP conta"); badges concedem mesmo assim.
      // A carteira Zappy também só ganha AQUI (faucets têm amount > 0; marcos não dão moeda).
      if (newEvents.some((e) => e.amount > 0)) {
        // Freeze GRÁTIS do mês (lazy/idempotente): +1 na 1ª atividade do mês civil EM QUE
        // houver espaço no teto. Só MARCA o mês como concedido quando o freeze realmente
        // entra — senão um aluno NO TETO (5) no 1º dia do mês perderia o grátis do mês
        // inteiro (o marcador avançava mesmo com o +1 descartado pelo teto) ao gastar depois.
        const monthKey = input.today.slice(0, 7)
        const currentFreezes = profile?.streakFreezes ?? 0
        const grantsFreeFreeze =
          profile?.freezeGrantedMonth !== monthKey && currentFreezes < MAX_STREAK_FREEZES
        const freezesBefore = currentFreezes + (grantsFreeFreeze ? 1 : 0)
        // Avança o marcador só quando o grátis entrou; senão PRESERVA o anterior p/ o
        // benefício continuar disponível numa atividade futura em que haja espaço no teto.
        const freezeGrantedMonthNext = grantsFreeFreeze
          ? monthKey
          : (profile?.freezeGrantedMonth ?? null)
        streak = advanceStreak(
          {
            streakCurrent: profile?.streakCurrent ?? 0,
            streakBest: profile?.streakBest ?? 0,
            lastActivityDate: profile?.lastActivityDate ?? null,
            freezes: freezesBefore,
            vacationFrom: profile?.vacationFrom ?? null,
            vacationTo: profile?.vacationTo ?? null,
          },
          input.today,
        )
        const freezesAfter = freezesBefore - streak.freezesConsumed
        totalXp += xpAwarded

        // ── Carteira Zappy: faucet desta ação, sob o MESMO advisory lock ───────
        // ROTINA (conta no teto): cada evento novo com `coins`. MARCO de streak
        // (EXEMPTO do teto — raro, não-grindável) só quando o streak avançou.
        // `newEvents` vem do RETURNING (sem `coins`) → reidrata pelo input por source.
        const coinsBySource = new Map(
          input.events.map((e) => [`${e.sourceType}:${e.sourceId}`, e.coins ?? 0]),
        )
        const routine = newEvents.flatMap((e) => {
          const coinType = COIN_TYPE_FOR_XP[e.sourceType]
          const coins = coinsBySource.get(`${e.sourceType}:${e.sourceId}`) ?? 0
          return coinType && coins > 0
            ? [{ sourceType: coinType, sourceId: e.sourceId, amount: coins }]
            : []
        })
        const milestones = streak.extended
          ? streakMilestoneCoins(streak.current).map((m) => ({
              sourceType: 'streak_milestone' as const,
              sourceId: m.sourceId,
              amount: m.amount,
            }))
          : []
        // Teto diário: reseta o acumulado se virou o dia civil SP; aplica só à rotina.
        const earnedTodayBase =
          profile?.coinsEarnedDate === input.today ? (profile?.coinsEarnedToday ?? 0) : 0
        const cap = applyDailyCap(
          routine.map((c) => c.amount),
          earnedTodayBase,
          DAILY_COIN_CAP,
        )
        coinsCapped = cap.capped
        const grants: { sourceType: CoinSourceTypeValue; sourceId: string; amount: number }[] = []
        routine.forEach((c, i) => {
          const give = cap.granted[i] ?? 0
          if (give > 0) grants.push({ ...c, amount: give })
        })
        // `streakMilestoneCoins` re-emite TODOS os marcos `<= current` (não só o recém-
        // cruzado); os já creditados em dias anteriores conflitam e são descartados pelo
        // `onConflictDoNothing`. Filtrar os já existentes ANTES de acumular o `balance_after`
        // — senão o running soma marcos que não entram e infla o `balance_after` das linhas
        // que entram (audit-only, mas reconciliação por balance_after ficaria errada).
        const freshMilestones =
          milestones.length > 0
            ? await (async () => {
                const existing = await tx
                  .select({ sourceId: coinEvents.sourceId })
                  .from(coinEvents)
                  .where(
                    and(
                      eq(coinEvents.userId, input.userId),
                      eq(coinEvents.audience, input.audience),
                      eq(coinEvents.sourceType, 'streak_milestone'),
                      inArray(
                        coinEvents.sourceId,
                        milestones.map((m) => m.sourceId),
                      ),
                    ),
                  )
                const seen = new Set(existing.map((r) => r.sourceId))
                return milestones.filter((m) => !seen.has(m.sourceId))
              })()
            : milestones
        grants.push(...freshMilestones)

        // `balance_after` é AUDITORIA (a verdade é `coin_balance` no perfil): soma
        // corrente dos grants. O ledger dedupa por (user, audience, source_type,
        // source_id) — só os novos retornam; `coinsAwarded`/saldo saem do RETURNING.
        let running = coinBalance
        const coinRows = grants.map((g) => {
          running += g.amount
          return {
            id: randomUUID(),
            userId: input.userId,
            audience: input.audience,
            sourceType: g.sourceType,
            sourceId: g.sourceId,
            amount: g.amount,
            balanceAfter: running,
            createdAt: input.now,
          }
        })
        const insertedCoins =
          coinRows.length > 0
            ? await tx
                .insert(coinEvents)
                .values(coinRows)
                .onConflictDoNothing({
                  target: [
                    coinEvents.userId,
                    coinEvents.audience,
                    coinEvents.sourceType,
                    coinEvents.sourceId,
                  ],
                })
                .returning({ amount: coinEvents.amount })
            : []
        coinsAwarded = insertedCoins.reduce((sum, r) => sum + r.amount, 0)
        coinBalance = (profile?.coinBalance ?? 0) + coinsAwarded
        const earnedTodayNext = earnedTodayBase + cap.totalGranted
        const newLifetime = (profile?.lifetimeCoinsEarned ?? 0) + coinsAwarded

        // Valores absolutos calculados sob o lock — o upsert não precisa de
        // incremento relativo no banco.
        await tx
          .insert(gamificationProfiles)
          .values({
            id: randomUUID(),
            userId: input.userId,
            accountId: input.accountId,
            audience: input.audience,
            xp: totalXp,
            streakCurrent: streak.current,
            streakBest: streak.best,
            lastActivityDate: input.today,
            privileged: input.privileged,
            coinBalance,
            coinsEarnedToday: earnedTodayNext,
            coinsEarnedDate: input.today,
            lifetimeCoinsEarned: newLifetime,
            streakFreezes: freezesAfter,
            freezeGrantedMonth: freezeGrantedMonthNext,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoUpdate({
            target: [gamificationProfiles.userId, gamificationProfiles.audience],
            // `accountId` NÃO entra no update: é IMUTÁVEL por perfil (o elo da
            // coorte do ranking) — gravado só no INSERT. Sobrescrever a cada award
            // pelo valor derivado da request re-keyaria o perfil p/ si mesmo se uma
            // chamada de sessão de perfil chegasse sem `x-auth-account-id`.
            set: {
              xp: totalXp,
              streakCurrent: streak.current,
              streakBest: streak.best,
              lastActivityDate: input.today,
              privileged: input.privileged,
              coinBalance,
              coinsEarnedToday: earnedTodayNext,
              coinsEarnedDate: input.today,
              lifetimeCoinsEarned: newLifetime,
              streakFreezes: freezesAfter,
              freezeGrantedMonth: freezeGrantedMonthNext,
              updatedAt: input.now,
            },
          })
        for (const slug of streakBadgeSlugs(streak.current)) badgeCandidates.add(slug)
        for (const slug of coinsSaverBadgeSlugs(newLifetime)) badgeCandidates.add(slug)
      }

      const badgesUnlocked =
        badgeCandidates.size > 0
          ? await tx
              .insert(userBadges)
              .values(
                [...badgeCandidates].map((slug) => ({
                  id: randomUUID(),
                  userId: input.userId,
                  audience: input.audience,
                  badgeSlug: slug,
                  unlockedAt: input.now,
                })),
              )
              .onConflictDoNothing({
                target: [userBadges.userId, userBadges.audience, userBadges.badgeSlug],
              })
              .returning({ slug: userBadges.badgeSlug, unlockedAt: userBadges.unlockedAt })
          : []

      return {
        xpAwarded,
        totalXp,
        streak,
        newEvents,
        badgesUnlocked,
        coinsAwarded,
        coinBalance,
        coinsCapped,
      }
    })
  }

  async spendCoins(input: SpendCoinsInput): Promise<SpendCoinsResult> {
    return this.db.transaction(async (tx) => {
      // MESMO lock por aluno do award — serializa o read-then-write do saldo
      // (dois gastos simultâneos não furam o saldo).
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${input.userId}`}, 0))`,
      )
      // Idempotência: a MESMA compra (reason + key) já debitou? (duplo-clique/retry).
      const [existing] = await tx
        .select({ id: coinEvents.id })
        .from(coinEvents)
        .where(
          and(
            eq(coinEvents.userId, input.userId),
            eq(coinEvents.audience, input.audience),
            eq(coinEvents.sourceType, input.reason),
            eq(coinEvents.sourceId, input.idempotencyKey),
          ),
        )
        .limit(1)
      const [profile] = await tx
        .select({ balance: gamificationProfiles.coinBalance })
        .from(gamificationProfiles)
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
        .limit(1)
      const balance = profile?.balance ?? 0
      // Concede a posse NA MESMA transação (compra atômica): nunca cobra sem entregar.
      // Idempotente; roda também no caminho ALREADY_SPENT p/ recuperar uma tentativa anterior
      // que debitou mas não chegou a conceder (crash entre as 2 transações antigas).
      const grantInventory = async () => {
        const g = input.grantInventory
        if (!g) return
        if (g.scope === 'avatar') {
          await tx
            .insert(avatarInventory)
            .values({
              id: randomUUID(),
              userId: input.userId,
              audience: input.audience,
              partId: g.itemId,
              acquiredAt: input.now,
            })
            .onConflictDoNothing({
              target: [avatarInventory.userId, avatarInventory.audience, avatarInventory.partId],
            })
        } else {
          await tx
            .insert(roomInventory)
            .values({
              id: randomUUID(),
              userId: input.userId,
              audience: input.audience,
              itemId: g.itemId,
              acquiredAt: input.now,
            })
            .onConflictDoNothing({
              target: [roomInventory.userId, roomInventory.audience, roomInventory.itemId],
            })
        }
      }

      if (existing) {
        await grantInventory()
        return { ok: false, code: 'ALREADY_SPENT', balance }
      }
      if (balance < input.amount) return { ok: false, code: 'INSUFFICIENT_BALANCE', balance }

      const balanceAfter = balance - input.amount
      await tx.insert(coinEvents).values({
        id: randomUUID(),
        userId: input.userId,
        audience: input.audience,
        sourceType: input.reason,
        sourceId: input.idempotencyKey,
        amount: -input.amount,
        balanceAfter,
        createdAt: input.now,
      })
      // O perfil existe (balance ≥ amount > 0 implica linha): atualiza só o saldo.
      await tx
        .update(gamificationProfiles)
        .set({ coinBalance: balanceAfter, updatedAt: input.now })
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
      await grantInventory()
      return { ok: true, balanceAfter }
    })
  }

  async getBalance(userId: string, audience: CourseAudience): Promise<number> {
    const [row] = await this.db
      .select({ balance: gamificationProfiles.coinBalance })
      .from(gamificationProfiles)
      .where(
        and(eq(gamificationProfiles.userId, userId), eq(gamificationProfiles.audience, audience)),
      )
      .limit(1)
    return row?.balance ?? 0
  }

  async getProfile(
    userId: string,
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord | null> {
    const [row] = await this.db
      .select()
      .from(gamificationProfiles)
      .where(
        and(eq(gamificationProfiles.userId, userId), eq(gamificationProfiles.audience, audience)),
      )
      .limit(1)
    if (!row) return null
    return {
      userId: row.userId,
      accountId: row.accountId,
      xp: row.xp,
      streakCurrent: row.streakCurrent,
      streakBest: row.streakBest,
      lastActivityDate: row.lastActivityDate,
      coinBalance: row.coinBalance,
      streakFreezes: row.streakFreezes,
      // Display do streak projeta o freeze grátis prestes a ser concedido (casa com o award).
      freezeGrantedMonth: row.freezeGrantedMonth,
      vacationFrom: row.vacationFrom,
      vacationTo: row.vacationTo,
    }
  }

  async listByAccount(
    accountId: string,
    userIds: string[],
    audience: CourseAudience,
  ): Promise<GamificationProfileRecord[]> {
    if (userIds.length === 0) return []
    const rows = await this.db
      .select()
      .from(gamificationProfiles)
      .where(
        and(
          eq(gamificationProfiles.accountId, accountId),
          inArray(gamificationProfiles.userId, userIds),
          eq(gamificationProfiles.audience, audience),
        ),
      )
    return rows.map((row) => ({
      userId: row.userId,
      accountId: row.accountId,
      xp: row.xp,
      streakCurrent: row.streakCurrent,
      streakBest: row.streakBest,
      lastActivityDate: row.lastActivityDate,
      coinBalance: row.coinBalance,
      streakFreezes: row.streakFreezes,
      // Necessário p/ o streak de EXIBIÇÃO da área dos pais projetar o freeze grátis do mês.
      freezeGrantedMonth: row.freezeGrantedMonth,
      vacationFrom: row.vacationFrom,
      vacationTo: row.vacationTo,
    }))
  }

  async listBadges(
    userId: string,
    audience: CourseAudience,
  ): Promise<{ badgeSlug: string; unlockedAt: Date }[]> {
    const rows = await this.db
      .select({ badgeSlug: userBadges.badgeSlug, unlockedAt: userBadges.unlockedAt })
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.audience, audience)))
    return rows
  }

  async countQualifyingCoursesByLevel(
    userId: string,
    audience: CourseAudience,
  ): Promise<QualifyingByLevel> {
    // INTERSEÇÃO dos marcos `course_complete` ∩ `course_showcased` (mesmo curso, mesma
    // vitrine). A dificuldade vem do SNAPSHOT congelado no ledger (`source_level`) — o
    // `course.level` ao vivo é só FALLBACK p/ linhas legadas sem snapshot. Assim o RANK
    // NUNCA REGRIDE quando o curso é re-nivelado depois. Self-join via alias; `countDistinct`
    // é defensivo (UNIQUE do ledger já dá 1 marco por curso). `courses` é LEFT join: curso
    // APAGADO ainda conta pelo snapshot (não derruba o rank de quem já qualificou).
    const showcased = alias(xpEvents, 'sc')
    const level = sql<CourseLevel>`coalesce(${showcased.sourceLevel}, ${xpEvents.sourceLevel}, ${courses.level})`
    const rows = await this.db
      .select({ level, qualifying: countDistinct(xpEvents.sourceId) })
      .from(xpEvents)
      .leftJoin(courses, eq(courses.id, xpEvents.sourceId))
      .innerJoin(
        showcased,
        and(
          eq(showcased.userId, xpEvents.userId),
          eq(showcased.audience, xpEvents.audience),
          eq(showcased.sourceType, 'course_showcased'),
          eq(showcased.sourceId, xpEvents.sourceId),
        ),
      )
      .where(
        and(
          eq(xpEvents.userId, userId),
          eq(xpEvents.audience, audience),
          eq(xpEvents.sourceType, 'course_complete'),
        ),
      )
      .groupBy(level)
    const result: QualifyingByLevel = { iniciante: 0, intermediario: 0, avancado: 0 }
    // `level` nunca é null na prática (todo marco pós-deploy tem snapshot); o guard
    // descarta uma linha residual sem dificuldade (curso apagado + snapshot legado null).
    for (const row of rows)
      if (row.level && row.level in result) result[row.level] = Number(row.qualifying)
    return result
  }

  async getRanking(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): Promise<GamificationRanking | null> {
    const joinCourseInAudience = entitlementInAudience(audience)
    const grantsActiveAudienceAccess = activeAudienceAccessPredicate(audience, now)

    // As 5 leituras num ÚNICO snapshot — sob award concorrente, posição e total não
    // divergem entre si (ex.: position > totalStudents). O default READ COMMITTED tira
    // um snapshot por statement (não dava a garantia do comentário); REPEATABLE READ
    // sim. É barato aqui (read-only, curto).
    return this.db.transaction(
      async (tx) => {
        // A CONTA tem acesso à audiência? (matrícula de curso OU chave-mestra → pertence
        // à coorte). Sem isso o perfil não está na vitrine → `null` (o service omite).
        const [member] = await tx
          .select({ u: entitlements.userId })
          .from(entitlements)
          .leftJoin(courses, joinCourseInAudience)
          .where(and(eq(entitlements.userId, accountId), grantsActiveAudienceAccess))
          .limit(1)
        if (!member) return null

        // Coorte (estilo Netflix) = PERFIS (linhas de gamification_profiles, não-equipe)
        // da audiência cuja CONTA (account_id) tem acesso à audiência.
        const accountsWithEntitlement = tx
          .select({ accountId: entitlements.userId })
          .from(entitlements)
          .leftJoin(courses, joinCourseInAudience)
          .where(grantsActiveAudienceAccess)
        const cohort = and(
          eq(gamificationProfiles.audience, audience),
          eq(gamificationProfiles.privileged, false),
          inArray(gamificationProfiles.accountId, accountsWithEntitlement),
        )

        // XP do PERFIL requester (0 se ainda não pontuou).
        const [profile] = await tx
          .select({ xp: gamificationProfiles.xp })
          .from(gamificationProfiles)
          .where(
            and(
              eq(gamificationProfiles.userId, userId),
              eq(gamificationProfiles.audience, audience),
            ),
          )
          .limit(1)
        const myXp = profile?.xp ?? 0

        const [totalRow] = await tx
          .select({ c: countDistinct(gamificationProfiles.userId) })
          .from(gamificationProfiles)
          .where(cohort)
        // O requester já está contado na coorte (tem perfil que pontuou)?
        const [inCohortRow] = await tx
          .select({ u: gamificationProfiles.userId })
          .from(gamificationProfiles)
          .where(and(cohort, eq(gamificationProfiles.userId, userId)))
          .limit(1)
        // Competition ranking ("1224"): só XP ESTRITAMENTE maior conta (empate divide).
        const [aheadRow] = await tx
          .select({ c: countDistinct(gamificationProfiles.userId) })
          .from(gamificationProfiles)
          .where(and(cohort, gt(gamificationProfiles.xp, myXp)))

        // Requester sem perfil (XP 0) ainda é contado como aluno (+1).
        const totalStudents = (totalRow?.c ?? 0) + (inCohortRow ? 0 : 1)
        return { position: (aheadRow?.c ?? 0) + 1, totalStudents }
      },
      { isolationLevel: 'repeatable read' },
    )
  }

  /**
   * Posições no ranking p/ VÁRIOS perfis da MESMA conta numa só passada (área dos pais):
   * resolve a coorte da audiência UMA vez e ranqueia cada perfil em memória — evita o
   * fan-out de N transações `getRanking` (cada uma re-derivando a mesma coorte). Map
   * vazio = conta sem matrícula na audiência.
   */
  async rankProfiles(
    accountId: string,
    profileIds: string[],
    audience: CourseAudience,
    now: Date,
  ): Promise<Map<string, number>> {
    if (profileIds.length === 0) return new Map()
    const joinCourseInAudience = entitlementInAudience(audience)
    const grantsActiveAudienceAccess = activeAudienceAccessPredicate(audience, now)

    return this.db.transaction(
      async (tx) => {
        const [member] = await tx
          .select({ u: entitlements.userId })
          .from(entitlements)
          .leftJoin(courses, joinCourseInAudience)
          .where(and(eq(entitlements.userId, accountId), grantsActiveAudienceAccess))
          .limit(1)
        if (!member) return new Map<string, number>()

        const accountsWithEntitlement = tx
          .select({ accountId: entitlements.userId })
          .from(entitlements)
          .leftJoin(courses, joinCourseInAudience)
          .where(grantsActiveAudienceAccess)
        // XP de TODA a coorte (não-equipe) numa query; ranqueia cada filho em memória.
        const rows = await tx
          .select({ userId: gamificationProfiles.userId, xp: gamificationProfiles.xp })
          .from(gamificationProfiles)
          .where(
            and(
              eq(gamificationProfiles.audience, audience),
              eq(gamificationProfiles.privileged, false),
              inArray(gamificationProfiles.accountId, accountsWithEntitlement),
            ),
          )
        const cohortXp = rows.map((r) => r.xp)
        const xpByUser = new Map(rows.map((r) => [r.userId, r.xp]))
        const out = new Map<string, number>()
        for (const profileId of profileIds) {
          const myXp = xpByUser.get(profileId) ?? 0
          // Competition ranking ("1224") — mesma regra do `getRanking`.
          const ahead = cohortXp.filter((xp) => xp > myXp).length
          out.set(profileId, ahead + 1)
        }
        return out
      },
      { isolationLevel: 'repeatable read' },
    )
  }

  async hasActiveAudienceAccess(
    accountId: string,
    audience: CourseAudience,
    now: Date,
  ): Promise<boolean> {
    const [row] = await this.db
      .select({ id: entitlements.id })
      .from(entitlements)
      .leftJoin(courses, entitlementInAudience(audience))
      .where(and(eq(entitlements.userId, accountId), activeAudienceAccessPredicate(audience, now)))
      .limit(1)
    return !!row
  }

  async countEventsInPeriod(
    userId: string,
    audience: CourseAudience,
    sourceTypes: MissionGoalType[],
    from: Date,
    to: Date,
  ): Promise<number> {
    if (sourceTypes.length === 0) return 0
    const [row] = await this.db
      .select({ c: count() })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.userId, userId),
          eq(xpEvents.audience, audience),
          inArray(xpEvents.sourceType, sourceTypes),
          gte(xpEvents.createdAt, from),
          lt(xpEvents.createdAt, to),
        ),
      )
    return row?.c ?? 0
  }

  async listClaimedMissions(
    userId: string,
    audience: CourseAudience,
    periodKeys: string[],
  ): Promise<Set<string>> {
    if (periodKeys.length === 0) return new Set()
    const rows = await this.db
      .select({ slug: missionClaims.missionSlug, period: missionClaims.periodKey })
      .from(missionClaims)
      .where(
        and(
          eq(missionClaims.userId, userId),
          eq(missionClaims.audience, audience),
          inArray(missionClaims.periodKey, periodKeys),
        ),
      )
    return new Set(rows.map((r) => `${r.slug}:${r.period}`))
  }

  async claimMission(input: ClaimMissionInput): Promise<ClaimMissionResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${input.userId}`}, 0))`,
      )
      // Idempotência do PRÊMIO: 1 linha por (perfil, missão, período). Conflito = já resgatou.
      const claimed = await tx
        .insert(missionClaims)
        .values({
          id: randomUUID(),
          userId: input.userId,
          audience: input.audience,
          missionSlug: input.missionSlug,
          periodKey: input.periodKey,
          claimedAt: input.now,
        })
        .onConflictDoNothing({
          target: [
            missionClaims.userId,
            missionClaims.audience,
            missionClaims.missionSlug,
            missionClaims.periodKey,
          ],
        })
        .returning({ id: missionClaims.id })

      const [profile] = await tx
        .select({
          coinBalance: gamificationProfiles.coinBalance,
          coinsEarnedToday: gamificationProfiles.coinsEarnedToday,
          coinsEarnedDate: gamificationProfiles.coinsEarnedDate,
          lifetimeCoinsEarned: gamificationProfiles.lifetimeCoinsEarned,
        })
        .from(gamificationProfiles)
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
        .limit(1)
      const balance = profile?.coinBalance ?? 0
      if (claimed.length === 0) {
        return { claimed: false, xpAwarded: 0, coinsAwarded: 0, coinBalance: balance }
      }

      // Moedas do prêmio CONTAM no teto diário (anti-bypass ético).
      const earnedTodayBase =
        profile?.coinsEarnedDate === input.today ? (profile?.coinsEarnedToday ?? 0) : 0
      const cap = applyDailyCap([input.rewardCoins], earnedTodayBase, DAILY_COIN_CAP)
      const coinsAwarded = cap.totalGranted
      const coinBalance = balance + coinsAwarded
      const newLifetime = (profile?.lifetimeCoinsEarned ?? 0) + coinsAwarded
      if (coinsAwarded > 0) {
        await tx.insert(coinEvents).values({
          id: randomUUID(),
          userId: input.userId,
          audience: input.audience,
          sourceType: 'mission_reward',
          sourceId: `${input.missionSlug}:${input.periodKey}`,
          amount: coinsAwarded,
          balanceAfter: coinBalance,
          createdAt: input.now,
        })
      }
      // XP do prêmio é absoluto no perfil (idempotência = o claim). NÃO mexe no streak.
      await tx
        .update(gamificationProfiles)
        .set({
          xp: sql`${gamificationProfiles.xp} + ${input.rewardXp}`,
          coinBalance,
          coinsEarnedToday: earnedTodayBase + coinsAwarded,
          coinsEarnedDate: input.today,
          lifetimeCoinsEarned: newLifetime,
          updatedAt: input.now,
        })
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
      const saverBadges = coinsSaverBadgeSlugs(newLifetime)
      if (saverBadges.length > 0) {
        await tx
          .insert(userBadges)
          .values(
            saverBadges.map((slug) => ({
              id: randomUUID(),
              userId: input.userId,
              audience: input.audience,
              badgeSlug: slug,
              unlockedAt: input.now,
            })),
          )
          .onConflictDoNothing({
            target: [userBadges.userId, userBadges.audience, userBadges.badgeSlug],
          })
      }
      return { claimed: true, xpAwarded: input.rewardXp, coinsAwarded, coinBalance }
    })
  }

  async buyStreakFreeze(input: BuyStreakFreezeInput): Promise<BuyStreakFreezeResult> {
    return this.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`gamification:${input.userId}`}, 0))`,
      )
      const [profile] = await tx
        .select({
          balance: gamificationProfiles.coinBalance,
          freezes: gamificationProfiles.streakFreezes,
        })
        .from(gamificationProfiles)
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
        .limit(1)
      const balance = profile?.balance ?? 0
      const freezes = profile?.freezes ?? 0
      if (freezes >= MAX_STREAK_FREEZES) {
        return { ok: false, code: 'MAX_FREEZES', freezes, balance }
      }
      // Idempotência: a MESMA compra já debitou? (duplo-clique). Reusa o ledger de moeda.
      const [existing] = await tx
        .select({ id: coinEvents.id })
        .from(coinEvents)
        .where(
          and(
            eq(coinEvents.userId, input.userId),
            eq(coinEvents.audience, input.audience),
            eq(coinEvents.sourceType, 'spend_streak_freeze'),
            eq(coinEvents.sourceId, input.idempotencyKey),
          ),
        )
        .limit(1)
      if (existing) return { ok: true, freezes, balance }
      if (balance < input.price)
        return { ok: false, code: 'INSUFFICIENT_BALANCE', freezes, balance }

      const balanceAfter = balance - input.price
      await tx.insert(coinEvents).values({
        id: randomUUID(),
        userId: input.userId,
        audience: input.audience,
        sourceType: 'spend_streak_freeze',
        sourceId: input.idempotencyKey,
        amount: -input.price,
        balanceAfter,
        createdAt: input.now,
      })
      await tx
        .update(gamificationProfiles)
        .set({ coinBalance: balanceAfter, streakFreezes: freezes + 1, updatedAt: input.now })
        .where(
          and(
            eq(gamificationProfiles.userId, input.userId),
            eq(gamificationProfiles.audience, input.audience),
          ),
        )
      return { ok: true, freezes: freezes + 1, balance: balanceAfter }
    })
  }

  async setVacation(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    from: string | null,
    to: string | null,
    now: Date,
  ): Promise<void> {
    // O perfil pode não existir ainda (criança que nunca pontuou querendo agendar férias):
    // upsert garante a linha. `accountId` imutável (só no INSERT).
    await this.db
      .insert(gamificationProfiles)
      .values({
        id: randomUUID(),
        userId,
        accountId,
        audience,
        xp: 0,
        streakCurrent: 0,
        streakBest: 0,
        lastActivityDate: null,
        privileged: false,
        vacationFrom: from,
        vacationTo: to,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [gamificationProfiles.userId, gamificationProfiles.audience],
        set: { vacationFrom: from, vacationTo: to, updatedAt: now },
      })
  }

  async getLeagueMembership(
    userId: string,
    audience: CourseAudience,
    weekKey: string,
  ): Promise<LeagueMembershipRecord | null> {
    const [row] = await this.db
      .select({ weekKey: leagueMembership.weekKey, tier: leagueMembership.tier })
      .from(leagueMembership)
      .where(
        and(
          eq(leagueMembership.userId, userId),
          eq(leagueMembership.audience, audience),
          eq(leagueMembership.weekKey, weekKey),
        ),
      )
      .limit(1)
    return row ?? null
  }

  async getMostRecentLeagueMembership(
    userId: string,
    audience: CourseAudience,
    beforeWeekKey: string,
  ): Promise<LeagueMembershipRecord | null> {
    // weekKey = `w:YYYY-MM-DD` → ordem lexicográfica == cronológica (data ISO fixa).
    const [row] = await this.db
      .select({ weekKey: leagueMembership.weekKey, tier: leagueMembership.tier })
      .from(leagueMembership)
      .where(
        and(
          eq(leagueMembership.userId, userId),
          eq(leagueMembership.audience, audience),
          lt(leagueMembership.weekKey, beforeWeekKey),
        ),
      )
      .orderBy(desc(leagueMembership.weekKey))
      .limit(1)
    return row ?? null
  }

  async createLeagueMembership(
    userId: string,
    accountId: string,
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    now: Date,
  ): Promise<void> {
    await this.db
      .insert(leagueMembership)
      .values({ id: randomUUID(), userId, accountId, audience, weekKey, tier, createdAt: now })
      .onConflictDoNothing({
        target: [leagueMembership.userId, leagueMembership.audience, leagueMembership.weekKey],
      })
  }

  async listLeagueCohort(
    audience: CourseAudience,
    weekKey: string,
    tier: string,
    now: Date,
  ): Promise<string[]> {
    const accountsWithEntitlement = this.db
      .select({ accountId: entitlements.userId })
      .from(entitlements)
      .leftJoin(courses, entitlementInAudience(audience))
      .where(activeAudienceAccessPredicate(audience, now))
    const rows = await this.db
      .select({ userId: leagueMembership.userId })
      .from(leagueMembership)
      .leftJoin(
        gamificationProfiles,
        and(
          eq(gamificationProfiles.userId, leagueMembership.userId),
          eq(gamificationProfiles.audience, audience),
        ),
      )
      .where(
        and(
          eq(leagueMembership.audience, audience),
          eq(leagueMembership.weekKey, weekKey),
          eq(leagueMembership.tier, tier),
          inArray(leagueMembership.accountId, accountsWithEntitlement),
          or(isNull(gamificationProfiles.userId), eq(gamificationProfiles.privileged, false)),
        ),
      )
    return rows.map((r) => r.userId)
  }

  async sumWeeklyXp(
    audience: CourseAudience,
    userIds: string[],
    from: Date,
    to: Date,
  ): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map()
    const rows = await this.db
      .select({ userId: xpEvents.userId, total: sum(xpEvents.amount) })
      .from(xpEvents)
      .where(
        and(
          eq(xpEvents.audience, audience),
          inArray(xpEvents.userId, userIds),
          gte(xpEvents.createdAt, from),
          lt(xpEvents.createdAt, to),
        ),
      )
      .groupBy(xpEvents.userId)
    return new Map(rows.map((r) => [r.userId, Number(r.total ?? 0)]))
  }
}
