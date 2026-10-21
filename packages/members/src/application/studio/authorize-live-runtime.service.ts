import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  type StudioLiveProBuildRequest,
  StudioLiveProSnapshotSchema,
} from '@sistemazero/core/studio/live-pro-runtime'
import { StudioProjectCurationSchema } from '@sistemazero/core/studio/project-capabilities'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  StudioLiveRuntimeDecisionSchema,
  type StudioLiveRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
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

  async proSnapshot(actor: LiveActor, raw: StudioLiveProBuildRequest) {
    const request = structuredClone(raw)
    const snapshot = await this.workspace
      .forSession(request.context.sessionId ?? undefined)
      .proBuildSnapshot(actor, request)
    if (snapshot.project.formatVersion === 3) {
      if (!this.policy)
        throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
      this.policy.authorizeProBuild({
        project: studioRuntimeSubject(StudioProjectDocumentSchema.parse(snapshot.project)),
        operation: 'execute',
        curation: StudioProjectCurationSchema.parse(snapshot.binding?.curation ?? {}),
        grantedCapabilities: ['edit', 'execute', 'export-source'],
      })
    }
    const now = this.clock()
    const lease = Date.parse(snapshot.workspace.leaseExpiresAt ?? '')
    if (!Number.isFinite(lease) || lease <= now)
      throw new AccessDeniedError('A autoria mudou. Reabra o projeto para continuar.')
    return StudioLiveProSnapshotSchema.parse({
      context: request.context,
      actor: { userId: actor.id, accountId: actor.accountId },
      workspaceRevision: snapshot.workspace.revision,
      project: snapshot.project,
      projectSha256: snapshot.projectSha256,
      templateId: snapshot.templateId,
      expiresAt: Math.min(now + 30_000, lease),
    })
  }

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
      // Publication uses the separate live-publication context; Zappy needs the release's
      // `assist`, which a read-only observer may keep without any editing right.
      grantedCapabilities: snapshot.author
        ? ['edit', 'execute', 'pause', 'export-source', 'python-repl', 'assist']
        : ['assist'],
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
