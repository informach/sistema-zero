import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import {
  createDbConnection,
  type DbConnection,
} from '../../src/infrastructure/persistence/drizzle/db'
import { DrizzleLiveRepository } from '../../src/infrastructure/persistence/drizzle/live.repository'
import { InMemoryLiveCourses } from '../fakes/live-in-memory'
import { persistLiveCourse } from './live-course-rows'
import { prepareTestDatabase } from './test-database'

const databaseUrl = await prepareTestDatabase('sistemazero_live_test')
if (!databaseUrl)
  console.warn('[tests/db] Postgres indisponível: desempenho da sala não medido em banco real.')

/**
 * A real class: 8 children and the teacher polling the room (3 s) and beating (5 s) at once,
 * in a cohort whose PAST encounters carry a full history (participants and messages). The room
 * must answer fast and must not grow with the number of encounters of the cohort.
 */
const ROUNDS = 12
const PAST_MESSAGES = 400
const percentile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]!
}
const ms = (value: number) => Math.round(value * 10) / 10

describe.skipIf(!databaseUrl)('desempenho da sala com 9 participantes (PostgreSQL real)', () => {
  let connection: DbConnection
  const courses = new InMemoryLiveCourses((course, blocks) =>
    persistLiveCourse(connection, course, blocks),
  )
  const results: Record<string, unknown>[] = []
  beforeAll(() => {
    connection = createDbConnection(databaseUrl as string)
  })
  afterAll(async () => {
    if (results.length) console.table(results)
    await connection?.close()
  })

  async function classroom(encounters: number) {
    const now = new Date('2026-11-07T17:00:00.000Z')
    const startsAt = (index: number) =>
      new Date(now.getTime() + (index - encounters + 1) * 7 * 86_400_000)
    const repository = new DrizzleLiveRepository(connection.db)
    // The class clock starts at the encounter and runs in real time.
    const started = Date.now()
    const service = new LiveService(
      repository,
      () => new Date(now.getTime() + (Date.now() - started)),
      { assertOwnership: async () => ({ name: 'Criança' }) },
      { mediaReady: true, courses },
    )
    const teacher: LiveActor = {
      id: randomUUID(),
      accountId: randomUUID(),
      name: 'Ana',
      staff: true,
    }
    const children: LiveActor[] = Array.from({ length: 8 }, (_, index) => ({
      id: randomUUID(),
      accountId: randomUUID(),
      name: `Criança ${index + 1}`,
      staff: false,
    }))
    const { course } = courses.add({ lessons: encounters, sections: 6 })
    const { cohort, sessions } = await service.createCohort(teacher, course.id, {
      title: 'Turma medida',
      timeZone: 'America/Sao_Paulo',
      capacity: 8,
      accessDays: 366,
      teacherIds: [teacher.id],
      // The last encounter is today; the earlier ones already happened, a week apart.
      schedule: Array.from({ length: encounters }, (_, index) => ({
        startsAt: startsAt(index).toISOString(),
        endsAt: new Date(startsAt(index).getTime() + 3_600_000).toISOString(),
      })),
    })
    await service.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
    for (const child of children)
      await service.enroll(teacher, cohort.id, {
        accountId: child.accountId,
        learnerId: child.id,
        learnerName: child.name,
      })
    const session = sessions.at(-1)!
    // Past encounters: ended, each with the whole class and a long conversation.
    await repository.transaction(cohort.id, (aggregate) => {
      for (const occurrence of aggregate.occurrences) {
        if (occurrence.id === session.occurrenceId) continue
        occurrence.state = 'ended'
        occurrence.participants = children.map((child) => ({
          learnerId: child.id,
          displayName: child.name,
          deviceId: randomUUID(),
          admission: 'admitted',
          joinedAt: occurrence.startsAt,
          seenAt: occurrence.startsAt,
          handAt: null,
          helpAt: null,
          microphoneLocked: false,
          cameraLocked: false,
          turnGranted: false,
          muteEpoch: 0,
        }))
        occurrence.messages = Array.from({ length: PAST_MESSAGES }, (_, index) => ({
          id: randomUUID(),
          authorId: children[index % 8]!.id,
          authorName: 'Criança',
          role: 'learner' as const,
          text: `Mensagem ${index} do encontro: olha o meu jogo pulando!`,
          createdAt: occurrence.startsAt,
          removed: false,
          pinned: false,
        }))
      }
    })
    const devices = new Map(children.map((child) => [child.id, randomUUID()]))
    await service.control(teacher, session.id, undefined, { kind: 'start' })
    for (const child of children) {
      await service.join(child, session.id, { deviceId: devices.get(child.id)!, takeover: false })
      await service.control(teacher, session.id, undefined, { kind: 'admit', learnerId: child.id })
    }
    return { service, teacher, children, devices, session, cohort }
  }

  async function measure(encounters: number) {
    const f = await classroom(encounters)
    const everyone = [f.teacher, ...f.children]
    const room: number[] = []
    const beat: number[] = []
    const timed = async (bucket: number[], work: () => Promise<unknown>) => {
      const begin = performance.now()
      await work()
      bucket.push(performance.now() - begin)
    }
    const version = async () =>
      (
        await connection.sql`
          select xmin::text as version from members.live_occurrences
          where id = ${f.session.occurrenceId}`
      )[0]?.version as string
    let occurrence = ''
    for (let round = 0; round < ROUNDS; round++) {
      // The first report of each child IS news; from the second round on, nothing is new.
      if (round === 1) occurrence = await version()
      // Everyone polls the room at the same moment, then everyone beats.
      await Promise.all(
        everyone.map((actor) => timed(room, () => f.service.room(actor, f.session.id))),
      )
      await Promise.all(
        everyone.map((actor) =>
          timed(beat, () =>
            f.service.heartbeat(
              actor,
              f.session.id,
              f.devices.get(actor.id) ?? randomUUID(),
              actor.staff ? undefined : { stepId: null, saveState: 'saved' },
            ),
          ),
        ),
      )
    }
    const after = await version()
    const result = {
      encontros: encounters,
      'sala p50 ms': ms(percentile(room, 50)),
      'sala p95 ms': ms(percentile(room, 95)),
      'batimento p50 ms': ms(percentile(beat, 50)),
      'batimento p95 ms': ms(percentile(beat, 95)),
      'ocorrência regravada sem novidade': occurrence !== after,
    }
    results.push(result)
    return result
  }

  test('a sala e o batimento com a turma de 1 e de 24 encontros', async () => {
    await measure(1)
    const small = await measure(1)
    const large = await measure(24)
    // Beats with nothing new never rewrite the occurrence document.
    expect(small['ocorrência regravada sem novidade']).toBe(false)
    expect(large['ocorrência regravada sem novidade']).toBe(false)
    // The room does not grow with the encounters of the cohort (generous margin: CI noise).
    expect(large['sala p50 ms']).toBeLessThan(small['sala p50 ms'] * 3 + 20)
    expect(large['batimento p50 ms']).toBeLessThan(small['batimento p50 ms'] * 3 + 20)
  }, 180_000)
})
