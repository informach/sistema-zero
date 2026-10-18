import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  StudioLivePublicationRuntimeDecisionSchema,
  type StudioLivePublicationRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { LiveConflictError } from '../../domain/live/live.errors'
import type { LiveActor } from '../../domain/ports/live-repository.port'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import type { LiveWorkspaceService } from '../live/live-workspace.service'

export class AuthorizeLivePublicationRuntimeService {
  constructor(
    private readonly workspace: Pick<LiveWorkspaceService, 'showcaseSnapshot'>,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
  ) {}
  async execute(actor: LiveActor, request: StudioLivePublicationRuntimeRequest) {
    if (!this.policy) throw new AccessDeniedError('O ambiente deste projeto não está disponível.')
    // Fresh owner, continuation, saved revision and completed teacher-assistance checks.
    // Publishing a saved revision neither acquires nor renews an editing device lease.
    const snapshot = await this.workspace.showcaseSnapshot(
      actor,
      request.context.workspaceId,
      request.context.workspaceRevision,
    )
    const parsed = StudioProjectDocumentSchema.safeParse(snapshot.project)
    if (
      !parsed.success ||
      parsed.data.programmingLanguage !== 'python' ||
      canonicalJson(studioRuntimeSubject(parsed.data)) !== canonicalJson(request.subject)
    )
      throw new LiveConflictError('O projeto precisa corresponder à revisão guardada na oficina.')
    const curation = {
      pythonLevel: 3 as const,
      allowedModes: [request.subject.mode],
      allowLevelReveal: false,
    }
    const resolved = this.policy.authorize({
      project: request.subject,
      operation: 'execute',
      curation,
      grantedCapabilities: ['execute', 'pause'],
    })
    const issuedAt = this.clock()
    return StudioLivePublicationRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.id, accountId: actor.accountId },
      context: request.context,
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: request.subject.runtime,
      operation: 'execute',
      ...resolved,
      capabilities: resolved.capabilities.filter(
        (capability) => capability === 'execute' || capability === 'pause',
      ),
      blockIds: [],
      curation,
      issuedAt,
      expiresAt: issuedAt + 30_000,
    })
  }
}
