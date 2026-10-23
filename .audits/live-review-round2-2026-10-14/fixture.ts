import { randomUUID } from 'node:crypto'
import { LiveService } from '../../packages/members/src/application/live/live.service'
import { InMemoryLiveRepository } from '../../packages/members/tests/fakes/live-in-memory'
import type { LiveRepository } from '../../packages/members/src/domain/ports/live-repository.port'

export async function fixture(repository: LiveRepository = new InMemoryLiveRepository()) {
  let now = new Date()
  const teacher = { id: randomUUID(), accountId: randomUUID(), name: 'Professora', staff: true }
  const child = { id: randomUUID(), accountId: randomUUID(), name: 'Criadora', staff: false }
  const deviceId = randomUUID()
  const live = new LiveService(repository, () => now, {
    assertOwnership: async () => ({ name: child.name }),
  }, { mediaReady: true })
  const program = await live.createProgram(teacher, {
    title: 'Review isolado', description: 'Reprodução de defeitos',
    lessons: [{ title: 'Encontro', instructions: 'Criar', starterProjectId: null, materials: [] }],
  })
  const { cohort, sessions: [session] } = await live.createCohort(teacher, program.id, {
    title: 'Review', timeZone: 'America/Sao_Paulo', capacity: 8, accessDays: 30,
    teacherIds: [teacher.id], schedule: [{
      startsAt: new Date(now.getTime() - 60_000).toISOString(),
      endsAt: new Date(now.getTime() + 3_600_000).toISOString(),
    }],
  })
  await live.updateCohort(teacher, cohort.id, 'open')
  await live.enroll(teacher, cohort.id, { accountId: child.accountId, learnerId: child.id, learnerName: child.name })
  async function control(command: Parameters<LiveService['control']>[3]) {
    const room = await live.room(teacher, session!.id)
    return live.control(teacher, session!.id, room.occurrence!.version, command)
  }
  async function start() {
    await control({ kind: 'start' })
    await live.join(child, session!.id, { deviceId, takeover: false })
    await control({ kind: 'admit', learnerId: child.id })
  }
  return { repository, teacher, child, deviceId, live, cohort, session: session!, control, start,
    clock: () => now,
    advance(ms: number) { now = new Date(now.getTime() + ms) },
  }
}
