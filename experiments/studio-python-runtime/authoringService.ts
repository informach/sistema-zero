import type { LessonDraft } from '../../packages/core/src/learning'
import { studioProjectContinuityReference } from '../../packages/core/src/studio/project-continuity'
import type { StudioRuntimeSelection } from '../../packages/core/src/studio/project-environment'
import { StudioAuthoringRuntimeRequestSchema } from '../../packages/core/src/studio/runtime-authorization'
import { AuthorizeAuthoringRuntimeService } from '../../packages/members/src/application/studio/authorize-authoring-runtime.service'
import { AccessDeniedError } from '../../packages/members/src/domain/entitlement/entitlement.errors'
import { LessonDraftConflictError } from '../../packages/members/src/domain/learning/lesson-draft.errors'
import type { StudioRuntimePolicy } from '../../packages/members/src/domain/studio/runtime-policy'
import { runtimeFixtureProject } from './fixtures'

/** Real authoring service; actor and draft storage are controlled, local-only fixtures. */
export function createAuthoringRuntimeProbe(
  policy: StudioRuntimePolicy,
  runtime: StudioRuntimeSelection,
) {
  const userId = '11111111-1111-4111-8111-111111111111'
  const lessonId = '22222222-2222-4222-8222-222222222222'
  const blockId = '33333333-3333-4333-8333-333333333333'
  let permitted = true
  let draft: LessonDraft | undefined
  const requests: { operation: string; revision: string; bytes: number }[] = []
  const service = new AuthorizeAuthoringRuntimeService(
    {
      readStudioRuntimeContext: async (_lessonId, requestedBlockId) => {
        if (!draft) return null
        const block = draft.document.blocks.find((item) => item.id === requestedBlockId)
        return {
          revision: draft.revision,
          block: block
            ? {
                kind: block.content.kind,
                environment: studioProjectContinuityReference(block.content.initialProject),
                curation: { pythonLevel: block.content.pythonLevel },
              }
            : null,
        }
      },
    },
    policy,
  )
  return {
    async fetch(request: Request) {
      const url = new URL(request.url)
      if (url.pathname === '/authoring-probe/setup') {
        const project = await runtimeFixtureProject(
          url.searchParams.get('kind') === 'classic' ? 'classic-turtleDrawing' : 'turtleDrawing',
        )
        project.runtime = runtime
        project.python.dependencyLock.runtimeManifestSha256 = runtime.manifestSha256
        const purpose = url.searchParams.get('purpose') === 'rehearsal' ? 'rehearsal' : 'authoring'
        draft = {
          lessonId,
          revision: crypto.randomUUID(),
          publishedRevision: crypto.randomUUID(),
          isPublished: false,
          canUndoRestore: false,
          updatedBy: userId,
          updatedAt: new Date().toISOString(),
          document: {
            title: 'Aula em edição',
            slug: 'aula',
            estimatedMinutes: null,
            sections: [],
            attachments: [],
            plannedVideos: [],
            blocks: [
              { id: blockId, content: { kind: 'studio', initialProject: project, pythonLevel: 2 } },
            ],
          },
        }
        permitted = true
        requests.length = 0
        return Response.json({
          project,
          scope: {
            userId,
            context: {
              kind: 'authoring',
              lessonId,
              draftRevision: draft.revision,
              blockId,
              purpose,
            },
          },
        })
      }
      if (url.pathname === '/authoring-probe/revoke') {
        permitted = false
        return Response.json({ ok: true })
      }
      if (url.pathname === '/authoring-probe/requests') return Response.json(requests)
      if (url.pathname !== '/api/members/studio/authoring-runtime') return null
      const text = await request.text()
      const candidate = StudioAuthoringRuntimeRequestSchema.parse(JSON.parse(text))
      requests.push({
        operation: candidate.operation,
        revision: candidate.revision,
        bytes: new TextEncoder().encode(text).byteLength,
      })
      try {
        return Response.json(
          await service.execute(
            { userId, accountId: userId, privileged: permitted, readOnly: false },
            candidate,
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
          {
            status:
              error instanceof AccessDeniedError
                ? 403
                : error instanceof LessonDraftConflictError
                  ? 409
                  : 400,
          },
        )
      }
    },
  }
}
