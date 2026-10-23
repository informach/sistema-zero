import type { StudioLiveRuntimeRequest } from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { LiveService } from '../../src/application/live/live.service'
import { LiveWorkspaceService } from '../../src/application/live/live-workspace.service'
import { AuthorizeLiveRuntimeService } from '../../src/application/studio/authorize-live-runtime.service'
import type { LiveActor } from '../../src/domain/ports/live-repository.port'
import { createStudioRuntimeHosts } from '../../src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../src/domain/studio/runtime-policy'
import { InMemoryLiveCourses, InMemoryLiveRepository } from './live-in-memory'
import { InMemoryLiveWorkspaceRepository } from './live-workspace-in-memory'
import { authoringFixture } from './studio-authoring-policy'

export async function studioLiveRuntimeFixture(
  kind: 'classic' | 'pro' = 'classic',
  language: 'javascript' | 'python' = 'python',
) {
  let now = new Date('2026-11-07T17:00:00Z')
  const clock = () => now
  const fixture = await authoringFixture(language, kind)
  const policy = await createStudioRuntimePolicy(
    fixture.configuration,
    createStudioRuntimeHosts(
      fixture.configuration.catalog,
      language === 'python'
        ? [{ runtime: fixture.project.runtime, origin: 'https://runtime.example.test' }]
        : [],
    ),
  )
  const rooms = new InMemoryLiveRepository()
  const courses = new InMemoryLiveCourses()
  const live = new LiveService(
    rooms,
    clock,
    { assertOwnership: async () => ({ name: 'Alice' }) },
    { mediaReady: true, courses },
  )
  const records = new InMemoryLiveWorkspaceRepository(rooms)
  const continuation = { available: false, calls: 0, onCheck: async () => {} }
  const workspace = new LiveWorkspaceService(records, live, clock, undefined, {
    canContinue: async () => {
      continuation.calls++
      await continuation.onCheck()
      return continuation.available
    },
  })
  const service = new AuthorizeLiveRuntimeService(workspace, policy, () => now.getTime())
  const child: LiveActor = {
    id: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    name: 'Alice',
    staff: false,
  }
  const teacher: LiveActor = {
    id: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    name: 'Professora',
    staff: true,
  }
  const { course, lessons } = courses.add({ lessons: 1 })
  const lesson = lessons[0]
  if (!lesson) throw new Error('Fixture requires a lesson')
  const block = courses.addStudioBlock(course.id, lesson.id, {
    initialProject: fixture.project,
    studio: { pythonLevel: 2, allowedModes: ['blocks', 'bridge', 'code'] },
  })
  const { cohort, sessions } = await live.createCohort(teacher, course.id, {
    title: 'Oficina Python',
    capacity: 5,
    accessDays: 30,
    timeZone: 'America/Sao_Paulo',
    teacherIds: [teacher.id],
    schedule: [{ startsAt: now.toISOString(), endsAt: '2026-11-07T18:00:00Z' }],
  })
  const session = sessions[0]
  if (!session) throw new Error('Fixture requires a session')
  await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
  await live.enroll(teacher, cohort.id, {
    learnerId: child.id,
    accountId: child.accountId,
    learnerName: child.name,
  })
  const opened = await workspace.openForBlock(child, session.id, block.blockId)
  const deviceId = crypto.randomUUID()
  const claimed = await workspace.forSession(session.id).claim(child, opened.id, deviceId, false)
  const request: StudioLiveRuntimeRequest = {
    context: {
      kind: 'live',
      workspaceId: opened.id,
      sessionId: session.id,
      blockId: block.blockId,
      deviceId,
      writerEpoch: claimed.writerEpoch,
    },
    expectedWorkspaceRevision: claimed.revision,
    operation: 'execute',
    revision: 'b'.repeat(64),
    subject: studioRuntimeSubject({ ...fixture.project, id: opened.id }),
  }
  return {
    fixture,
    service,
    workspace,
    records,
    rooms,
    courses,
    live,
    course,
    cohort,
    session,
    child,
    teacher,
    request,
    claimed,
    block,
    continuation,
    advance(ms: number) {
      now = new Date(now.getTime() + ms)
    },
  }
}
