import { randomUUID } from 'node:crypto'
import { LiveService } from '../../src/application/live/live.service'
import type { LiveRepository } from '../../src/domain/ports/live-repository.port'
import { InMemoryLiveRepository } from './live-in-memory'

export async function liveFixture(repository: LiveRepository = new InMemoryLiveRepository()) {
  let now = new Date()
  const teacher = { id: randomUUID(), accountId: randomUUID(), name: 'Professora', staff: true }
  const child = { id: randomUUID(), accountId: randomUUID(), name: 'Criadora', staff: false }
  const deviceId = randomUUID()
  const live = new LiveService(
    repository,
    () => now,
    {
      assertOwnership: async () => ({ name: child.name }),
    },
    { mediaReady: true },
  )
  const program = await live.createProgram(teacher, {
    title: 'Oficina',
    description: 'Criar juntos',
    lessons: [{ title: 'Encontro', instructions: 'Criar', starterProjectId: null, materials: [] }],
  })
  const {
    cohort,
    sessions: [session],
  } = await live.createCohort(teacher, program.id, {
    title: 'Turma',
    timeZone: 'America/Sao_Paulo',
    capacity: 8,
    accessDays: 30,
    teacherIds: [teacher.id],
    schedule: [
      {
        startsAt: new Date(now.getTime() - 60_000).toISOString(),
        endsAt: new Date(now.getTime() + 3_600_000).toISOString(),
      },
    ],
  })
  await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
  await live.enroll(teacher, cohort.id, {
    accountId: child.accountId,
    learnerId: child.id,
    learnerName: child.name,
  })
  async function control(command: Parameters<LiveService['control']>[3]) {
    const room = await live.room(teacher, session!.id)
    return live.control(teacher, session!.id, room.occurrence!.version, command)
  }
  async function start() {
    await control({ kind: 'start' })
    await live.join(child, session!.id, { deviceId, takeover: false })
    await control({ kind: 'admit', learnerId: child.id })
  }
  return {
    repository,
    teacher,
    child,
    deviceId,
    live,
    cohort,
    session: session!,
    control,
    start,
    clock: () => now,
    advance(ms: number) {
      now = new Date(now.getTime() + ms)
    },
  }
}
