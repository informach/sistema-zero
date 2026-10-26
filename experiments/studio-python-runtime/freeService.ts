import {
  initialKidsJourneyPolicy,
  KIDS_CREATOR_CAPABILITIES,
} from '../../packages/core/src/journey'
import { StudioAuthoringCatalogSchema } from '../../packages/core/src/studio/authoring-catalog'
import { StudioFreeRuntimeRequestSchema } from '../../packages/core/src/studio/runtime-authorization'
import type { StudioRuntimeRelease } from '../../packages/core/src/studio/runtime-catalog'
import { KidsJourneyQueryService } from '../../packages/members/src/application/kids-journey/kids-journey-query.service'
import { AuthorizeFreeRuntimeService } from '../../packages/members/src/application/studio/authorize-free-runtime.service'
import {
  FreeStudioAccessService,
  type FreeStudioActor,
} from '../../packages/members/src/application/studio/free-studio-access.service'
import { AccessDeniedError } from '../../packages/members/src/domain/entitlement/entitlement.errors'
import type {
  KidsJourneyProfileSnapshot,
  KidsJourneySnapshot,
} from '../../packages/members/src/domain/ports/kids-journey-repository.port'
import { createStudioAuthoringPolicy } from '../../packages/members/src/domain/studio/authoring-policy'
import { createStudioRuntimeHosts } from '../../packages/members/src/domain/studio/runtime-hosts'
import { createStudioRuntimePolicy } from '../../packages/members/src/domain/studio/runtime-policy'
import { PYTHON_PROGRAMMING_CODECS } from '../../packages/studio/src/python/blocks/catalog'
import { PYTHON_PGZERO_CODECS } from '../../packages/studio/src/python/extensions/pgzero/catalog'
import { PYTHON_TURTLE_CODECS } from '../../packages/studio/src/python/extensions/turtle/catalog'

/** Local qualification only: real free authorization/catalog, controlled account/product/achievement ports. */
export async function createFreeRuntimeProbe(release: StudioRuntimeRelease, origin: string) {
  const actor: FreeStudioActor = {
    audience: 'kids',
    userId: '55555555-5555-4555-8555-555555555555',
    accountId: '66666666-6666-4666-8666-666666666666',
    privileged: false,
    readOnly: false,
  }
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const codecs = [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS, ...PYTHON_PGZERO_CODECS]
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
        blockIds: codecs.map(({ id }) => id),
        categoryIds: [...new Set(codecs.map(({ category }) => category))],
      },
    ],
  })
  let permitted = true
  let failures = 0
  const requests: { operation: string; bytes: number; projectId: string }[] = []
  const service = new AuthorizeFreeRuntimeService(
    new FreeStudioAccessService(
      {
        async execute() {
          return {
            grants: [],
            communities: permitted ? ['estudio-completo'] : [],
            hasMaster: false,
            hasMasterKids: false,
          }
        },
      },
      {
        async execute() {
          // Controlled course achievements for this QA owner; never an equivalence from JS.
          return { blocks: codecs.map(({ id }) => id) }
        },
      },
      new KidsJourneyQueryService({
        async readSnapshot(owners): Promise<KidsJourneySnapshot> {
          const profiles = new Map<string, KidsJourneyProfileSnapshot>()
          for (const owner of owners) {
            if (owner.userId !== actor.userId || owner.accountId !== actor.accountId)
              throw new AccessDeniedError('Unknown local probe owner')
            profiles.set(owner.userId, {
              ...owner,
              registered: true,
              milestones: [],
              earned: {
                level: 'god',
                capabilities: [...KIDS_CREATOR_CAPABILITIES],
                courseAccess: { entry: [], expanded: [], reward: [] },
              },
            })
          }
          return {
            policy: {
              phase: 'published',
              version: 1,
              policy: initialKidsJourneyPolicy(),
              updatedAt: new Date('2026-10-19T00:00:00.000Z'),
            },
            catalog: [],
            profiles,
          }
        },
      }),
    ),
    await createStudioRuntimePolicy(
      configuration,
      createStudioRuntimeHosts(configuration.catalog, [{ runtime, origin }]),
    ),
    await createStudioAuthoringPolicy(configuration),
  )
  return {
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname === '/free-probe/setup') {
        permitted = true
        failures = url.searchParams.get('failure') === '1' ? 1 : 0
        requests.length = 0
        return Response.json({ viewerId: actor.userId })
      }
      if (url.pathname === '/free-probe/revoke') {
        permitted = false
        return Response.json({ ok: true })
      }
      if (url.pathname === '/free-probe/requests') return Response.json(requests)
      if (!['/api/studio/free-options', '/api/studio/free-runtime'].includes(url.pathname))
        return null
      try {
        if (url.pathname.endsWith('free-options')) {
          if (failures-- > 0)
            return Response.json(
              { error: { message: 'Falha transitória da prova.' } },
              { status: 503 },
            )
          return Response.json(await service.options(actor), {
            headers: { 'cache-control': 'private, no-store' },
          })
        }
        const text = await request.text()
        const input = StudioFreeRuntimeRequestSchema.parse(JSON.parse(text))
        requests.push({
          operation: input.operation,
          projectId: input.subject.id,
          bytes: new TextEncoder().encode(text).byteLength,
        })
        return Response.json(await service.execute(actor, input), {
          headers: { 'cache-control': 'private, no-store' },
        })
      } catch (error) {
        return Response.json(
          {
            error: {
              code: 'RUNTIME_DENIED',
              message: error instanceof Error ? error.message : 'Recusado',
            },
          },
          {
            status: error instanceof AccessDeniedError ? 403 : 400,
            headers: { 'cache-control': 'private, no-store' },
          },
        )
      }
    },
  }
}
