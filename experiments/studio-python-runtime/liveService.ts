import type { StudioRuntimeSelection } from '../../packages/core/src/studio/project-environment'
import { StudioLiveRuntimeRequestSchema } from '../../packages/core/src/studio/runtime-authorization'
import { LiveService } from '../../packages/members/src/application/live/live.service'
import { LiveWorkspaceService } from '../../packages/members/src/application/live/live-workspace.service'
import { AuthorizeLiveRuntimeService } from '../../packages/members/src/application/studio/authorize-live-runtime.service'
import type { LiveActor } from '../../packages/members/src/domain/ports/live-repository.port'
import type { StudioRuntimePolicy } from '../../packages/members/src/domain/studio/runtime-policy'
import {
  InMemoryLiveCourses,
  InMemoryLiveRepository,
} from '../../packages/members/tests/fakes/live-in-memory'
import { liveRuntimeHttpFixture } from '../../packages/members/tests/fakes/live-runtime-http'
import { InMemoryLiveWorkspaceRepository } from '../../packages/members/tests/fakes/live-workspace-in-memory'
import { runtimeFixtureProject } from './fixtures'

/** Local qualification only: real room/workspace/policy services; controlled actors and storage. */
export function createLiveRuntimeProbe(
  policy: StudioRuntimePolicy,
  runtime: StudioRuntimeSelection,
) {
  async function setup(kind: 'classic' | 'pro', workload: 'drawing' | 'f1') {
    const rooms = new InMemoryLiveRepository()
    const courses = new InMemoryLiveCourses()
    const clock = () => new Date()
    const live = new LiveService(
      rooms,
      clock,
      { assertOwnership: async () => ({ name: 'Alice' }) },
      { mediaReady: true, courses },
    )
    const records = new InMemoryLiveWorkspaceRepository(rooms)
    const workspace = new LiveWorkspaceService(records, live, clock)
    const service = new AuthorizeLiveRuntimeService(workspace, policy)
    const actor = (staff: boolean): LiveActor => ({
      id: crypto.randomUUID(),
      accountId: crypto.randomUUID(),
      name: staff ? 'Professora' : 'Alice',
      staff,
    })
    const child = actor(false),
      teacher = actor(true)
    const devices = { child: crypto.randomUUID(), teacher: crypto.randomUUID() }
    const { course, lessons } = courses.add({ lessons: 1 })
    const lesson = lessons[0]
    if (!lesson) throw new Error('Probe lesson missing')
    const fixture = workload === 'f1' ? 'turtleF1' : 'turtleDrawing'
    const project = await runtimeFixtureProject(kind === 'classic' ? `classic-${fixture}` : fixture)
    project.runtime = runtime
    project.python.dependencyLock.runtimeManifestSha256 = runtime.manifestSha256
    const block = courses.addStudioBlock(course.id, lesson.id, {
      initialProject: project,
      studio: { pythonLevel: 2, allowedModes: kind === 'classic' ? ['bridge'] : ['code'] },
    })
    const { cohort, sessions } = await live.createCohort(teacher, course.id, {
      title: 'Oficina Python',
      capacity: 5,
      accessDays: 30,
      timeZone: 'America/Sao_Paulo',
      teacherIds: [teacher.id],
      schedule: [
        {
          startsAt: new Date(Date.now() - 60_000).toISOString(),
          endsAt: new Date(Date.now() + 3_600_000).toISOString(),
        },
      ],
    })
    const session = sessions[0]
    if (!session) throw new Error('Probe session missing')
    await live.updateCohort({ ...teacher, admin: true }, cohort.id, { status: 'open' })
    await live.enroll(teacher, cohort.id, {
      learnerId: child.id,
      accountId: child.accountId,
      learnerName: child.name,
    })
    await live.control(teacher, session.id, undefined, { kind: 'start' })
    await live.join(teacher, session.id, { deviceId: devices.teacher, takeover: false })
    await live.join(child, session.id, { deviceId: devices.child, takeover: false })
    await live.control(teacher, session.id, undefined, { kind: 'admit', learnerId: child.id })
    const opened = await workspace.openForBlock(child, session.id, block.blockId)
    const app = liveRuntimeHttpFixture(workspace, service, 'local-probe')
    return { rooms, records, live, cohort, session, block, opened, child, teacher, devices, app }
  }
  let current: Awaited<ReturnType<typeof setup>> | undefined
  const requests: {
    actorId: string
    operation: string
    epoch: number
    revision: number
    bytes: number
  }[] = []
  return {
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname === '/live-probe/setup') {
        current = await setup(
          url.searchParams.get('kind') === 'classic' ? 'classic' : 'pro',
          url.searchParams.get('workload') === 'f1' ? 'f1' : 'drawing',
        )
        requests.length = 0
        return Response.json({ ok: true })
      }
      if (!current)
        return Response.json({ error: { message: 'Create the probe first' } }, { status: 409 })
      const f = current
      if (url.pathname === '/live-probe/actor') {
        const role = url.searchParams.get('role') === 'teacher' ? 'teacher' : 'child'
        return Response.json(
          {
            sessionId: f.session.id,
            blockId: f.block.blockId,
            workspaceId: f.opened.id,
            actorId: f[role].id,
            learnerId: f.child.id,
            role: role === 'teacher' ? 'teacher' : 'learner',
            deviceId: f.devices[role],
          },
          {
            headers: {
              'set-cookie': `studio-live-probe=${role}; Path=/; HttpOnly; SameSite=Strict`,
            },
          },
        )
      }
      if (url.pathname === '/live-probe/state')
        return Response.json({ workspace: await f.records.find(f.opened.id), requests })
      if (url.pathname === '/live-probe/revoke') {
        const aggregate = f.rooms.cohorts.get(f.cohort.id)
        if (!aggregate?.grants[0]) throw new Error('Probe grant missing')
        aggregate.grants[0].revokedAt = new Date().toISOString()
        return Response.json({ ok: true })
      }
      if (!url.pathname.startsWith('/api/live/') && !url.pathname.startsWith('/api/admin/live/'))
        return null
      const role = /(?:^|;\s*)studio-live-probe=teacher(?:;|$)/.test(
        request.headers.get('cookie') ?? '',
      )
        ? 'teacher'
        : 'child'
      const actor = f[role]
      // The fixture has no video panel; refresh actual supervision through the room service.
      // This is not a production identity/access shortcut: actors/storage are explicitly fake.
      await f.live.join(f.teacher, f.session.id, { deviceId: f.devices.teacher, takeover: false })
      const source = request.method === 'GET' ? undefined : await request.text()
      if (url.pathname.endsWith('/runtime') && source) {
        const body = StudioLiveRuntimeRequestSchema.parse(JSON.parse(source))
        requests.push({
          actorId: actor.id,
          operation: body.operation,
          epoch: body.context.writerEpoch,
          revision: body.expectedWorkspaceRevision,
          bytes: new TextEncoder().encode(source).byteLength,
        })
      }
      const upstream = new URL(url)
      upstream.pathname = upstream.pathname.replace(/^\/api\//, '/members/')
      return f.app.handle(
        new Request(upstream, {
          method: request.method,
          body: source,
          headers: {
            'content-type': 'application/json',
            'x-internal-token': 'local-probe',
            'x-auth-user-id': actor.id,
            'x-auth-account-id': actor.accountId,
            'x-auth-user-status': 'active',
            'x-auth-user-role': actor.staff ? 'staff' : 'member',
          },
        }),
      )
    },
  }
}
