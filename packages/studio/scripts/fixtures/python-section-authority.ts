import { StudioAuthoringCatalogSchema } from '@sistemazero/core/studio/authoring-catalog'
import { StudioAuthoringRuntimeRequestSchema } from '@sistemazero/core/studio/runtime-authorization'
import {
  createStudioRuntimeCatalog,
  type StudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { AuthorizeAuthoringRuntimeService } from '../../../members/src/application/studio/authorize-authoring-runtime.service'
import { createStudioRuntimeHosts } from '../../../members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../../members/src/domain/studio/runtime-policy'
import { createStudioProjectDocument } from '../../src/core/projectFactory'

/** Real authoring policy/service behind HTTP; fixed QA staff and an in-memory draft port.
 * This does not represent session authentication, gateway, SQL, SDK or production approval. */
export async function createSectionBrowserAuthority(release: StudioRuntimeRelease, origin: string) {
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const rawCatalog: Parameters<typeof createStudioRuntimeCatalog>[0] = {
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: ['avancado'],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
    releases: [release],
  }
  const catalog = await createStudioRuntimeCatalog(rawCatalog)
  const configuration = StudioAuthoringCatalogSchema.parse({
    version: 1,
    catalog: rawCatalog,
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
    createStudioRuntimeHosts(catalog, [{ runtime, origin }]),
  )
  const actor = {
    userId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    privileged: true,
    readOnly: false,
  }
  const lessonId = crypto.randomUUID(),
    draftRevision = crypto.randomUUID()
  const projects = await Promise.all(
    (['classic', 'pro'] as const).map(async (kind) => ({
      kind,
      blockId: crypto.randomUUID(),
      project: await createStudioProjectDocument(
        { id: crypto.randomUUID(), name: 'Objetivos Python', programmingLanguage: 'python', kind },
        { runtime, catalog, releaseStatus: 'active' },
      ),
    })),
  )
  const service = new AuthorizeAuthoringRuntimeService(
    {
      async readStudioRuntimeContext(requestedLesson, blockId) {
        const stored = projects.find((item) => item.blockId === blockId)
        return requestedLesson === lessonId && stored
          ? {
              revision: draftRevision,
              block: { kind: 'studio', environment: stored.project, curation: {} },
            }
          : null
      },
    },
    policy,
  )
  const requests: unknown[] = []
  return {
    configuration: { userId: actor.userId, lessonId, draftRevision, projects },
    requests,
    async handle(request: Request) {
      if (request.method !== 'POST') return new Response(null, { status: 405 })
      const raw = await request.json()
      const parsed = StudioAuthoringRuntimeRequestSchema.safeParse(raw)
      if (!parsed.success)
        return Response.json(
          { error: { code: 'INVALID_REQUEST', message: parsed.error.message } },
          { status: 422 },
        )
      try {
        const decision = await service.execute(actor, parsed.data)
        requests.push({ request: parsed.data, decision })
        return Response.json(decision)
      } catch (error) {
        requests.push({
          request: parsed.data,
          error: error instanceof Error ? error.message : String(error),
        })
        return Response.json(
          {
            error: {
              code: 'AUTHORITY_DENIED',
              message: error instanceof Error ? error.message : String(error),
            },
          },
          { status: 409 },
        )
      }
    },
  }
}
