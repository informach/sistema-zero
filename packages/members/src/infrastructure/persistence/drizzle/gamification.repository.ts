import { randomUUID } from 'node:crypto'
import { and, count, countDistinct, eq, gt, isNull, or, sql } from 'drizzle-orm'
import type { CourseAudience } from '../../../domain/course/course'
import type { BadgeSlug } from '../../../domain/gamification/badges'
import {
  advanceStreak,
  courseBadgeSlugs,
  quizPerfectBadgeSlugs,
  streakBadgeSlugs,
} from '../../../domain/gamification/gamification'
import type {
  AwardInput,
  AwardResult,
  GamificationProfileRecord,
  GamificationRanking,
  GamificationRepository,
} from '../../../domain/ports/gamification-repository.port'
import type { Database } from './db'
import { courses, entitlements, gamificationProfiles, userBadges, xpEvents } from './schema'

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
      }

      // Streak/lastActivityDate só avançam com evento novo de XP REAL (amount
      // > 0) — MARCOS (course_complete/quiz_perfect, amount 0) não movem streak
      // (regra: "só atividade que rende XP conta"); badges concedem mesmo assim.
      if (newEvents.some((e) => e.amount > 0)) {
        streak = advanceStreak(
          {
            streakCurrent: profile?.streakCurrent ?? 0,
            streakBest: profile?.streakBest ?? 0,
            lastActivityDate: profile?.lastActivityDate ?? null,
          },
          input.today,
        )
        totalXp += xpAwarded
        // Valores absolutos calculados sob o lock — o upsert não precisa de
        // incremento relativo no banco.
        await tx
          .insert(gamificationProfiles)
          .values({
            id: randomUUID(),
            userId: input.userId,
            audience: input.audience,
            xp: totalXp,
            streakCurrent: streak.current,
            streakBest: streak.best,
            lastActivityDate: input.today,
            privileged: input.privileged,
            createdAt: input.now,
            updatedAt: input.now,
          })
          .onConflictDoUpdate({
            target: [gamificationProfiles.userId, gamificationProfiles.audience],
            set: {
              xp: totalXp,
              streakCurrent: streak.current,
              streakBest: streak.best,
              lastActivityDate: input.today,
              privileged: input.privileged,
              updatedAt: input.now,
            },
          })
        for (const slug of streakBadgeSlugs(streak.current)) badgeCandidates.add(slug)
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

      return { xpAwarded, totalXp, streak, newEvents, badgesUnlocked }
    })
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
      xp: row.xp,
      streakCurrent: row.streakCurrent,
      streakBest: row.streakBest,
      lastActivityDate: row.lastActivityDate,
    }
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

  async getRanking(userId: string, audience: CourseAudience): Promise<GamificationRanking> {
    // Coorte da vitrine: quem tem matrícula (qualquer status) em curso da
    // audiência — o elo é `entitlements.course_ref = courses.slug` (convenção
    // do pacote). Rankings adult/kids são SEPARADOS por construção, e EQUIPE
    // (perfil `privileged`) fica fora — só cliente ranqueia.
    const cohortJoin = and(eq(courses.slug, entitlements.courseRef), eq(courses.audience, audience))
    // XP/perfil são POR VITRINE — o ranking kids compara só o XP kids.
    const profileJoin = and(
      eq(gamificationProfiles.userId, entitlements.userId),
      eq(gamificationProfiles.audience, audience),
    )

    const [profile] = await this.db
      .select({ xp: gamificationProfiles.xp })
      .from(gamificationProfiles)
      .where(
        and(eq(gamificationProfiles.userId, userId), eq(gamificationProfiles.audience, audience)),
      )
      .limit(1)
    const myXp = profile?.xp ?? 0

    const [[totalRow], [aheadRow]] = await Promise.all([
      // Sem perfil = nunca pontuou → cliente por presunção (equipe só é
      // conhecida quando pontua — members não consulta roles do auth).
      this.db
        .select({ c: countDistinct(entitlements.userId) })
        .from(entitlements)
        .innerJoin(courses, cohortJoin)
        .leftJoin(gamificationProfiles, profileJoin)
        .where(or(isNull(gamificationProfiles.userId), eq(gamificationProfiles.privileged, false))),
      // Competition ranking ("1224"): só XP ESTRITAMENTE maior conta — empate
      // divide a posição (alunos sem perfil têm XP 0 e nunca ficam à frente).
      this.db
        .select({ c: countDistinct(entitlements.userId) })
        .from(entitlements)
        .innerJoin(courses, cohortJoin)
        .innerJoin(gamificationProfiles, profileJoin)
        .where(and(gt(gamificationProfiles.xp, myXp), eq(gamificationProfiles.privileged, false))),
    ])

    return { position: (aheadRow?.c ?? 0) + 1, totalStudents: totalRow?.c ?? 0 }
  }
}
