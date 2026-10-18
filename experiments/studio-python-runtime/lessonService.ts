import { StudioAuthoringCatalogSchema } from '../../packages/core/src/studio/authoring-catalog'
import { lessonStudioProjectId } from '../../packages/core/src/studio/lesson-project-id'
import { StudioLessonRuntimeRequestSchema } from '../../packages/core/src/studio/runtime-authorization'
import type { StudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { AuthorizeLessonRuntimeService } from '../../packages/members/src/application/studio/authorize-lesson-runtime.service'
import { AccessDeniedError } from '../../packages/members/src/domain/entitlement/entitlement.errors'
import { studioLessonBaseline } from '../../packages/members/src/domain/studio/lesson-baseline'
import { createStudioRuntimeHosts } from '../../packages/members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../packages/members/src/domain/studio/runtime-policy'
import { createAuthoringRuntimeProbe } from './authoringService'
import { runtimeFixtureProject } from './fixtures'
import { createFreeRuntimeProbe } from './freeService'
import { createLiveRuntimeProbe } from './liveService'

/** Real authorization service/policy; enrollment and published baseline are controlled fixtures.
 * This local-only harness does not qualify authentication, gateway, BFF or SQL. */
export async function createLessonRuntimeProbe(release: StudioRuntimeRelease, origin: string) {
  const userId = '11111111-1111-4111-8111-111111111111'
  const lessonId = '22222222-2222-4222-8222-222222222222'
  const blockId = '33333333-3333-4333-8333-333333333333'
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const configuration = StudioAuthoringCatalogSchema.parse({
    version: 1,
    catalog: {
      releases: [release],
      profiles: [
        {
          id: release.profileId,
          languages: ['python'],
          kinds: ['classic', 'pro'],
          modes: ['blocks', 'bridge', 'code'],
          levels: [],
          releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
        },
      ],
    },
    releases: [
      {
        runtime,
        status: 'active',
        proTemplateIds: ['python-blank'],
        blockIds: ['py_print'],
        categoryIds: ['python-basics'],
      },
    ],
  })
  const policy = await createStudioRuntimePolicy(
    configuration,
    createStudioRuntimeHosts(configuration.catalog, [{ runtime, origin }]),
  )
  let permitted = true
  let baseline: ReturnType<typeof studioLessonBaseline> | undefined
  const requests: { operation: string; revision: string; bytes: number }[] = []
  const service = new AuthorizeLessonRuntimeService(
    {
      execute: async () => {
        if (!permitted || !baseline)
          throw new AccessDeniedError('O acesso a esta aula foi encerrado.')
        return { ...baseline, bound: true, readOnly: false }
      },
    },
    policy,
  )
  return {
    authoring: createAuthoringRuntimeProbe(policy, runtime),
    live: createLiveRuntimeProbe(policy, runtime),
    free: await createFreeRuntimeProbe(release, origin),
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname === '/lesson-probe/setup') {
        const classic = url.searchParams.get('kind') === 'classic'
        const project = await runtimeFixtureProject(
          classic ? 'classic-turtleDrawing' : 'turtleDrawing',
        )
        project.id = lessonStudioProjectId(blockId, userId)
        project.runtime = runtime
        project.python.dependencyLock.runtimeManifestSha256 = release.manifestSha256
        baseline = studioLessonBaseline({
          lessonId,
          blockId,
          courseId: '44444444-4444-4444-8444-444444444444',
          configuration: { initialProject: project, pythonLevel: 2 },
        })
        permitted = true
        requests.length = 0
        return Response.json({
          project,
          scope: { userId, lessonId, blockId, baselineId: baseline.id },
        })
      }
      if (url.pathname === '/lesson-probe/revoke') {
        permitted = false
        return Response.json({ ok: true })
      }
      if (url.pathname === '/lesson-probe/requests') return Response.json(requests)
      if (url.pathname !== `/api/members/lessons/${lessonId}/blocks/${blockId}/studio-runtime`)
        return null
      const text = await request.text()
      const input = StudioLessonRuntimeRequestSchema.parse(JSON.parse(text))
      requests.push({
        operation: input.operation,
        revision: input.revision,
        bytes: new TextEncoder().encode(text).byteLength,
      })
      try {
        return Response.json(
          await service.execute(
            { userId, accountId: userId, privileged: false, readOnly: false },
            { lessonId, blockId },
            input,
          ),
        )
      } catch (error) {
        return Response.json(
          {
            error: {
              code: 'RUNTIME_DENIED',
              message: error instanceof Error ? error.message : 'Recusado',
            },
          },
          { status: error instanceof AccessDeniedError ? 403 : 400 },
        )
      }
    },
  }
}
