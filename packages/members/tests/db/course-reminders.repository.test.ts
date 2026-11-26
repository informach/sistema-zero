import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import type { CourseReminderCandidate } from '../../src/domain/ports/course-reminders-repository.port'
import {
  DrizzleCourseRemindersRepository,
  DrizzleCourseStartsRepository,
} from '../../src/infrastructure/persistence/drizzle/course-reminders.repository'
import type { DbConnection } from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleRenewalReminderRepository } from '../../src/infrastructure/persistence/drizzle/renewal-reminder.repository'
import { openKidsJourneyTestDatabase, optInKidsJourneyDatabase } from './kids-journey-database'

/**
 * O SQL dos lembretes do curso, do "começaram o curso do presente" e dos dias de surpresa
 * (25/11/2026) sobre o histórico REAL de migrations (os fakes reimplementam as consultas).
 * Banco local descartável `kids_journey_*` em `COURSE_REMINDERS_TEST_DATABASE_URL`; sem ela, pula.
 * Relógio em 2033 e ids sorteados: nada de outro arquivo cai nas janelas daqui.
 */
const url = optInKidsJourneyDatabase('COURSE_REMINDERS_TEST_DATABASE_URL')

describe.skipIf(!url)('lembretes do curso e dias de surpresa: Postgres real', () => {
  let conn: DbConnection
  const NOW = new Date('2033-05-10T15:00:00Z')
  const DAY = 86_400_000
  const course = { id: randomUUID(), slug: `curso-${randomUUID().slice(0, 8)}` }
  const parents = { id: randomUUID(), slug: `pais-${randomUUID().slice(0, 8)}` }
  const moduleId = randomUUID()
  const parentsModule = randomUUID()
  const [lesson1, lesson2, draft, parentsLesson] = [
    randomUUID(),
    randomUUID(),
    randomUUID(),
    randomUUID(),
  ] as const
  const acc: string[] = Array.from({ length: 12 }, () => randomUUID())
  const profile = randomUUID()
  const shared = randomUUID() // perfil ligado a DUAS contas: fica de fora

  beforeAll(async () => {
    conn = await openKidsJourneyTestDatabase(url!)
    const sql = conn.sql
    await sql`insert into members.courses (id, slug, title, status, audience, created_at, updated_at)
      values (${course.id}, ${course.slug}, 'Cadê', 'published', 'kids', now(), now())`
    await sql`insert into members.courses (id, slug, title, status, audience, learner, created_at, updated_at)
      values (${parents.id}, ${parents.slug}, 'Guia', 'published', 'kids', 'parents', now(), now())`
    await sql`insert into members.modules (id, course_id, title, sort_order, created_at, updated_at)
      values (${moduleId}, ${course.id}, 'M', 0, now(), now()),
             (${parentsModule}, ${parents.id}, 'M', 0, now(), now())`
    await sql`insert into members.lessons (id, module_id, course_id, slug, title, sort_order, is_published, created_at, updated_at)
      values (${lesson1}, ${moduleId}, ${course.id}, 'a1', 'A1', 0, true, now(), now()),
             (${lesson2}, ${moduleId}, ${course.id}, 'a2', 'A2', 1, true, now(), now()),
             (${draft}, ${moduleId}, ${course.id}, 'a3', 'A3', 2, false, now(), now()),
             (${parentsLesson}, ${parentsModule}, ${parents.id}, 'p1', 'P1', 0, true, now(), now())`
    // acc[0]: o perfil dele navegou (começou). acc[1]: nada. acc[2]: concluiu pelo perfil.
    // acc[3]: o perfil compartilhado com acc[4] (posse ambígua, não conta para ninguém).
    await sql`insert into members.gamification_profiles (id, user_id, account_id, created_at, updated_at)
      values (${randomUUID()}, ${profile}, ${acc[2]!}, now(), now()),
             (${randomUUID()}, ${shared}, ${acc[3]!}, now(), now())`
    await sql`insert into members.lesson_navigation (user_id, account_id, lesson_id, section_id, updated_at)
      values (${randomUUID()}, ${acc[0]!}, ${lesson1}, ${randomUUID()}, ${new Date(NOW.getTime() - 9 * DAY).toISOString()}),
             (${shared}, ${acc[4]!}, ${lesson1}, ${randomUUID()}, now())`
    await sql`insert into members.gamification_profiles (id, user_id, account_id, created_at, updated_at)
      select ${randomUUID()}, user_id, account_id, now(), now()
        from members.lesson_navigation where account_id = ${acc[0]!}`
    await sql`insert into members.lesson_completions (id, user_id, lesson_id, course_id, completed_at)
      values (${randomUUID()}, ${profile}, ${lesson1}, ${course.id}, ${new Date(NOW.getTime() - 3 * DAY).toISOString()}),
             (${randomUUID()}, ${profile}, ${lesson2}, ${course.id}, ${new Date(NOW.getTime() - 2 * DAY).toISOString()}),
             (${randomUUID()}, ${acc[5]!}, ${parentsLesson}, ${parents.id}, ${new Date(NOW.getTime() - DAY).toISOString()})`
  })

  afterAll(async () => {
    if (!conn) return
    await conn.sql`delete from members.entitlement_lifecycle_messages_sent where entitlement_id in (
      select id from members.entitlements where user_id in ${conn.sql(acc)})`
    await conn.sql`delete from members.entitlements where user_id in ${conn.sql(acc)}`
    await conn.sql`delete from members.courses where id in ${conn.sql([course.id, parents.id])}`
    await conn.close()
  })

  async function grant(row: {
    account: string
    courseRef?: string
    grantedAt: string
    sourceKind?: 'payment' | 'manual'
    sourceId?: string
    subscriptionId?: string | null
    expiresAt?: Date | null
    status?: string
    snapshot?: Record<string, unknown>
    accessType?: string
  }) {
    const id = randomUUID()
    await conn.sql`insert into members.entitlements
      (id, user_id, product_id, product_kind, access_type, course_ref, snapshot, status, source_kind,
       source_id, subscription_id, granted_at, expires_at, idempotency_key, created_at, updated_at)
      values (${id}, ${row.account}, ${randomUUID()}, 'course', ${row.accessType ?? 'course'},
        ${row.courseRef ?? course.slug}, ${JSON.stringify(row.snapshot ?? {})}::jsonb, ${row.status ?? 'active'},
        ${row.sourceKind ?? 'payment'}, ${row.sourceId ?? 'pay'}, ${row.subscriptionId ?? null},
        ${row.grantedAt}::timestamptz, ${row.expiresAt?.toISOString() ?? null}, ${id}, now(), now())`
    return id
  }

  async function allCandidates(repo: DrizzleCourseRemindersRepository, limit: number) {
    const seen: CourseReminderCandidate[] = []
    let cursor = null
    for (let page = 0; page < 50; page++) {
      const { candidates, next } = await repo.listCandidates(NOW, limit, cursor)
      seen.push(...candidates)
      if (!next) break
      cursor = next
    }
    return seen.filter((c) => acc.includes(c.accountId))
  }

  test('candidatos: régua da matrícula, progresso por conta, keyset sem perder linha e conclusão por qualquer matrícula', async () => {
    const repo = new DrizzleCourseRemindersRepository(conn.db)
    // O mesmo milissegundo com microssegundos diferentes, na fronteira das páginas.
    const ids = {
      started: await grant({ account: acc[0]!, grantedAt: '2033-05-01T10:00:00.123456Z' }),
      idle: await grant({
        account: acc[1]!,
        grantedAt: '2033-05-01T10:00:00.123400Z',
        sourceKind: 'manual',
        sourceId: 'scholarship:abc',
      }),
      done: await grant({ account: acc[2]!, grantedAt: '2033-05-01T10:00:00.123300Z' }),
      ambiguous: await grant({ account: acc[3]!, grantedAt: '2033-05-01T10:00:00.123200Z' }),
      parents: await grant({
        account: acc[5]!,
        courseRef: parents.slug,
        grantedAt: '2033-05-01T09:00:00Z',
      }),
    }
    // Fora da régua: cortesia do admin, assinatura, vencida, inativa, Desafio.
    await grant({
      account: acc[6]!,
      grantedAt: '2033-05-02T00:00:00Z',
      sourceKind: 'manual',
      sourceId: 'admin:1',
    })
    await grant({ account: acc[7]!, grantedAt: '2033-05-02T00:00:00Z', subscriptionId: 'sub-1' })
    await grant({
      account: acc[8]!,
      grantedAt: '2033-05-02T00:00:00Z',
      expiresAt: new Date(NOW.getTime() - DAY),
    })
    await grant({ account: acc[9]!, grantedAt: '2033-05-02T00:00:00Z', status: 'revoked' })
    await grant({
      account: acc[10]!,
      grantedAt: '2033-05-02T00:00:00Z',
      courseRef: 'desafio-primeiro-jogo',
    })

    for (const limit of [1, 2, 3, 500]) {
      const found = await allCandidates(repo, limit)
      expect(found.map((c) => c.entitlementId).sort()).toEqual(Object.values(ids).sort())
    }
    const byId = new Map((await allCandidates(repo, 500)).map((c) => [c.entitlementId, c]))
    expect(byId.get(ids.started)).toMatchObject({
      started: true,
      completed: false,
      courseTitle: 'Cadê',
      audience: 'kids',
      learner: 'child',
      lastActivityAt: new Date(NOW.getTime() - 9 * DAY),
    })
    expect(byId.get(ids.idle)).toMatchObject({
      started: false,
      completed: false,
      lastActivityAt: null,
    })
    expect(byId.get(ids.done)).toMatchObject({
      started: true,
      completed: true,
      completedAt: new Date(NOW.getTime() - 2 * DAY),
    })
    expect(byId.get(ids.ambiguous)).toMatchObject({ started: false })
    // O guia dos pais: o próprio responsável estuda.
    expect(byId.get(ids.parents)).toMatchObject({
      learner: 'parents',
      completed: true,
      started: true,
    })

    // Enviados: por conta e curso, de qualquer matrícula; a conclusão tira a conta do lote.
    await repo.markSent(ids.idle, '2033-05-01', 'course_not_started', NOW)
    await repo.markSent(ids.idle, '2033-05-01', 'course_not_started', NOW) // idempotente
    const again = await grant({
      account: acc[1]!,
      grantedAt: '2033-04-01T00:00:00Z',
      sourceKind: 'manual',
      sourceId: 'scholarship:def',
    })
    const idle = (await allCandidates(repo, 500)).filter((c) => c.accountId === acc[1])
    expect(idle.map((c) => c.entitlementId).sort()).toEqual([ids.idle, again].sort())
    expect(idle.every((c) => c.sentKinds.join() === 'course_not_started')).toBe(true)
    await repo.markSent(again, '2033-04-01', 'course_completed', NOW)
    expect((await allCandidates(repo, 500)).some((c) => c.accountId === acc[1])).toBe(false)

    // "Começaram o curso do presente": entre as contas pedidas, as que começaram.
    const starts = new DrizzleCourseStartsRepository(conn.db)
    expect(
      (await starts.startedAccounts(course.slug, [acc[0]!, acc[1]!, acc[2]!, acc[3]!]))?.sort(),
    ).toEqual([acc[0]!, acc[2]!].sort())
    expect(await starts.startedAccounts('nao-existe', [acc[0]!])).toBeNull()
    expect(await starts.startedAccounts(course.slug, [])).toEqual([])
  })

  test('dias de surpresa: fim divulgado gravado ou calculado, janela de 72 h, uma vez por matrícula', async () => {
    const repo = new DrizzleRenewalReminderRepository(conn.db)
    const WINDOW = 72 * 3_600_000
    const policy = { mode: 'fixed', durationValue: 15, durationUnit: 'days' }
    const account = acc[11]!
    const realEnd = new Date(NOW.getTime() + 8 * DAY)
    // Gravado: divulgado acabou há 1 h.
    const recorded = await grant({
      account,
      grantedAt: '2033-05-03T15:00:00Z',
      sourceKind: 'manual',
      sourceId: 'scholarship:bonus-a',
      expiresAt: realEnd,
      snapshot: {
        advertisedAccessDays: 7,
        accessPolicy: policy,
        advertisedEndsAt: new Date(NOW.getTime() - 3_600_000).toISOString(),
      },
    })
    // Sem o campo gravado: conta antiga (fim real menos 8 dias = agora menos 1 dia).
    const computed = await grant({
      account,
      courseRef: parents.slug,
      grantedAt: '2033-05-02T15:00:00Z',
      sourceKind: 'manual',
      sourceId: 'scholarship:bonus-b',
      expiresAt: new Date(NOW.getTime() + 7 * DAY),
      snapshot: { advertisedAccessDays: 7, accessPolicy: policy, giftAudience: 'adult' },
    })
    // Fora: ainda no prazo divulgado, fora da janela, sem dias a mais, prazo em meses.
    await grant({
      account,
      grantedAt: '2033-05-09T15:00:00Z',
      expiresAt: new Date(NOW.getTime() + 14 * DAY),
      snapshot: { advertisedAccessDays: 7, accessPolicy: policy },
    })
    await grant({
      account,
      grantedAt: '2033-04-20T15:00:00Z',
      expiresAt: new Date(NOW.getTime() + DAY),
      snapshot: {
        advertisedAccessDays: 7,
        accessPolicy: policy,
        advertisedEndsAt: new Date(NOW.getTime() - 4 * DAY).toISOString(),
      },
    })
    await grant({
      account,
      grantedAt: '2033-05-03T15:00:00Z',
      expiresAt: new Date(NOW.getTime() + 8 * DAY),
      snapshot: { advertisedAccessDays: 15, accessPolicy: policy },
    })
    await grant({
      account,
      grantedAt: '2033-05-03T15:00:00Z',
      expiresAt: new Date(NOW.getTime() + 8 * DAY),
      snapshot: { advertisedAccessDays: 7, accessPolicy: { ...policy, durationUnit: 'months' } },
    })
    const due = (await repo.listBonusDaysEntitlements(NOW, WINDOW, 50)).filter(
      (r) => r.userId === account,
    )
    expect(due.map((r) => r.id).sort()).toEqual([recorded, computed].sort())
    expect(due.find((r) => r.id === recorded)).toMatchObject({
      audience: 'kids',
      courseTitle: 'Cadê',
      extraDays: 8,
      sourceId: 'scholarship:bonus-a',
    })
    expect(due.find((r) => r.id === computed)).toMatchObject({
      audience: 'adult',
      courseTitle: 'Guia',
      extraDays: 8,
    })
    // O dedupe do envio (`gift_bonus_days` na data do fim real) tira a matrícula da lista.
    await conn.sql`insert into members.entitlement_lifecycle_messages_sent (entitlement_id, expires_on, message_kind)
      values (${recorded}, ${realEnd.toISOString().slice(0, 10)}, 'gift_bonus_days')`
    expect(
      (await repo.listBonusDaysEntitlements(NOW, WINDOW, 50))
        .filter((r) => r.userId === account)
        .map((r) => r.id),
    ).toEqual([computed])
  })
})
