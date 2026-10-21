import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { lessonStudioProjectId } from '@sistemazero/core/studio/lesson-project-id'
import { StudioProjectCurationSchema } from '@sistemazero/core/studio/project-capabilities'
import { studioProjectContinuityIssue } from '@sistemazero/core/studio/project-continuity'
import {
  type StudioLessonRuntimeDecision,
  StudioLessonRuntimeDecisionSchema,
  type StudioLessonRuntimeRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import { LiveConflictError } from '../../domain/live/live.errors'
import type { StudioLessonOwner } from '../../domain/ports/studio-lesson-binding-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import type { OpenLessonStudioService } from './open-lesson-studio.service'

const DECISION_TTL_MS = 30_000

/** No persistence or cached entitlement: this same check precedes each server operation. */
export class AuthorizeLessonRuntimeService {
  constructor(
    private readonly lessons: Pick<OpenLessonStudioService, 'execute'>,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
  ) {}

  async execute(
    actor: StudioLessonOwner & {
      privileged: boolean
      readOnly: boolean
      audience?: 'kids' | 'adult'
    },
    context: { lessonId: string; blockId: string },
    request: StudioLessonRuntimeRequest,
  ): Promise<StudioLessonRuntimeDecision> {
    if (actor.readOnly)
      throw new AccessDeniedError('A prévia de suporte não inicia operações neste projeto.')
    // No confirm parameter: authorization must never admit, change or replace a baseline.
    const baseline = await this.lessons.execute({ ...actor, ...context })
    if (!baseline.bound || baseline.readOnly || baseline.id !== request.baselineId)
      throw new LiveConflictError('Reabra a aula para confirmar o vínculo do projeto preservado.')
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const project = request.subject
    if (project.id !== lessonStudioProjectId(context.blockId, actor.userId))
      throw new ValidationError('A identidade do projeto não corresponde a este perfil e aula.')
    if (studioProjectContinuityIssue(project, baseline.configuration.initialProject))
      throw new LiveConflictError('O ambiente precisa corresponder ao projeto original da aula.')
    const { level, pythonLevel, allowBlocks, allowCategories, allowedModes, allowLevelReveal } =
      baseline.configuration
    const curation = StudioProjectCurationSchema.parse({
      level,
      pythonLevel,
      allowBlocks,
      allowCategories,
      allowedModes,
      allowLevelReveal,
    })
    const resolved = this.policy.authorize({
      project,
      operation: request.operation,
      curation,
      // A published Pro lesson grants its scoped editor. This does not grant the free Pro app,
      // installation, a terminal, or access to any other lesson/project. `publish` and `assist`
      // survive only when the release declares them; the Mural still checks showcase eligibility.
      grantedCapabilities: [
        'edit',
        'execute',
        'pause',
        'publish',
        'export-source',
        'python-repl',
        'assist',
      ],
    })
    const issuedAt = this.clock()
    return StudioLessonRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.userId, accountId: actor.accountId },
      context: { kind: 'lesson', ...context, baselineId: baseline.id },
      projectId: project.id,
      revision: request.revision,
      subjectSha256: await sha256Hex(canonicalJson(project)),
      runtime: project.runtime,
      releaseStatus: resolved.releaseStatus,
      operation: request.operation,
      capabilities: [...resolved.capabilities],
      grantedExtensionIds: [...resolved.grantedExtensionIds],
      catalog: resolved.catalog,
      blockIds: [...resolved.blockIds],
      curation,
      frame: { url: resolved.frame.url, allowedOrigins: [...resolved.frame.allowedOrigins] },
      issuedAt,
      expiresAt: issuedAt + DECISION_TTL_MS,
    })
  }
}
