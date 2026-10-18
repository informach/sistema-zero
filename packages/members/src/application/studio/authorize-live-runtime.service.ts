import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioProjectCurationSchema } from '@sistemazero/core/studio/project-capabilities'
import {
  StudioLiveRuntimeDecisionSchema,
  type StudioLiveRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { LiveActor } from '../../domain/ports/live-repository.port'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import type { LiveWorkspaceService } from '../live/live-workspace.service'

export class AuthorizeLiveRuntimeService {
  constructor(
    private readonly workspace: LiveWorkspaceService,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(actor: LiveActor, request: StudioLiveRuntimeRequest) {
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const snapshot = await this.workspace
      .forSession(request.context.sessionId ?? undefined)
      .runtimeContext(actor, request)
    // The library already opens without lesson curation. It still needs current continuation
    // rights and the exact saved environment, and never unlocks a new free Pro project.
    const curation = StudioProjectCurationSchema.parse(snapshot.binding?.curation ?? {})
    const resolved = this.policy.authorize({
      project: request.subject,
      operation: request.operation,
      curation,
      grantedCapabilities: snapshot.author
        ? ['edit', 'execute', 'pause', 'export-source', 'python-repl']
        : [],
      allowReadOnlyAnalysis: !snapshot.author,
    })
    const issuedAt = this.clock()
    const leaseUntil = Date.parse(snapshot.workspace.leaseExpiresAt ?? '')
    if (snapshot.author && (!Number.isFinite(leaseUntil) || leaseUntil <= issuedAt))
      throw new AccessDeniedError('A autoria mudou. Reabra o projeto para continuar.')
    return StudioLiveRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.id, accountId: actor.accountId },
      context: request.context,
      workspaceRevision: snapshot.workspace.revision,
      baselineId: snapshot.binding?.baselineId ?? null,
      projectId: request.subject.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(request.subject)),
      runtime: request.subject.runtime,
      releaseStatus: resolved.releaseStatus,
      operation: request.operation,
      capabilities: resolved.capabilities,
      grantedExtensionIds: resolved.grantedExtensionIds,
      catalog: resolved.catalog,
      blockIds: resolved.blockIds,
      curation,
      frame: resolved.frame,
      issuedAt,
      expiresAt: snapshot.author ? Math.min(issuedAt + 30_000, leaseUntil) : issuedAt + 30_000,
    })
  }
}
