import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { StudioProjectCurationSchema } from '@sistemazero/core/studio/project-capabilities'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import {
  StudioAuthoringRuntimeDecisionSchema,
  type StudioAuthoringRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { LessonDraftConflictError } from '../../domain/learning/lesson-draft.errors'
import type { LessonDraftRepository } from '../../domain/ports/lesson-draft-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'

/** Staff may preview unpublished work. Draft revision is read afresh, never a client grant. */
export class AuthorizeAuthoringRuntimeService {
  constructor(
    private readonly drafts: Pick<LessonDraftRepository, 'readStudioRuntimeContext'>,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(
    actor: { userId: string; accountId: string; privileged: boolean; readOnly: boolean },
    request: StudioAuthoringRuntimeRequest,
  ) {
    if (!actor.privileged || actor.readOnly)
      throw new AccessDeniedError('Somente a equipe ativa pode executar o projeto de autoria.')
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const context = request.context
    const draft = await this.drafts.readStudioRuntimeContext(context.lessonId, context.blockId)
    if (!draft || draft.revision !== context.draftRevision) throw new LessonDraftConflictError()
    const block = draft.block
    if (context.blockId !== null && block?.kind !== 'studio')
      throw new ValidationError('O bloco de Estúdio não pertence a este rascunho.')
    // An author may change language/template before saving; rehearsal follows the stored block.
    if (
      context.purpose === 'rehearsal' &&
      (!block || studioProjectContinuityIssue(request.subject, block.environment))
    )
      throw new ValidationError('O ambiente do ensaio precisa corresponder ao bloco do rascunho.')
    const curation = StudioProjectCurationSchema.parse(
      context.purpose === 'rehearsal' && block ? block.curation : {},
    )
    const resolved = this.policy.authorize({
      project: request.subject,
      operation: request.operation,
      curation,
      grantedCapabilities: ['edit', 'execute', 'pause', 'export-source', 'python-repl'],
    })
    if (resolved.releaseStatus !== 'active')
      throw new AccessDeniedError('Escolha um ambiente ativo para a autoria desta aula.')
    const issuedAt = this.clock()
    return StudioAuthoringRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.userId, accountId: actor.accountId },
      context,
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
      expiresAt: issuedAt + 30_000,
    })
  }
}
