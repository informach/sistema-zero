import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { isGallerySubmission } from '@sistemazero/core/learning'
import {
  StudioMasteryReviewRuntimeDecisionSchema,
  type StudioMasteryReviewRuntimeSourceRequest,
} from '@sistemazero/core/studio/runtime-authorization'
import { studioRuntimeSubject } from '@sistemazero/core/studio/runtime-subject'
import { refinePythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { preparePythonExecutionSnapshot } from '@sistemazero/studio/server-python-snapshot'
import { AccessDeniedError } from '../../domain/entitlement/entitlement.errors'
import type { MasteryRepository } from '../../domain/ports/mastery-repository.port'
import { ValidationError } from '../../domain/shared/errors'
import type { StudioRuntimePolicy } from '../../domain/studio/runtime-policy'
import type { StudioGallerySourceService } from '../learning/studio-gallery-source.service'

/** Every start/restart rereads the retained evidence and the currently allowed runtime release. */
export class AuthorizeMasteryReviewRuntimeService {
  constructor(
    private readonly submissions: Pick<MasteryRepository, 'findSubmission'>,
    private readonly policy: StudioRuntimePolicy | undefined,
    private readonly clock: () => number = Date.now,
    private readonly gallery?: Pick<StudioGallerySourceService, 'load'>,
  ) {}

  async execute(
    actor: { userId: string; accountId: string; privileged: boolean; readOnly: boolean },
    request: StudioMasteryReviewRuntimeSourceRequest,
    signal: AbortSignal = AbortSignal.timeout(50_000),
  ) {
    signal.throwIfAborted()
    if (!actor.privileged || actor.readOnly || actor.userId !== actor.accountId)
      throw new AccessDeniedError('Use sua própria conta da equipe para revisar Maestrias.')
    if (!this.policy)
      throw new AccessDeniedError('O ambiente de execução ainda não está disponível.')
    const submission = await this.submissions.findSubmission(request.context.submissionId)
    if (!submission) throw new AccessDeniedError('Entrega de Maestria não encontrada.')
    const payload = submission.evidence.payload
    const raw =
      payload && typeof payload === 'object' && 'project' in payload ? payload.project : null
    let document = raw
    if (isGallerySubmission(raw)) {
      if (
        raw.tool !== 'studio' ||
        raw.items.length !== 1 ||
        !request.gallerySource ||
        !this.gallery
      )
        throw new ValidationError('Abra a cópia preservada deste projeto na revisão.')
      document = await this.gallery.load(request.gallerySource, raw.items[0]!, signal)
    } else if (request.gallerySource) {
      throw new ValidationError('Esta entrega não utiliza uma cópia da galeria.')
    }
    const project = await refinePythonProjectDocument(document).catch(() => {
      throw new ValidationError('Esta entrega não contém um projeto Python válido para execução.')
    })
    const snapshot = await preparePythonExecutionSnapshot(project)
    signal.throwIfAborted()
    const subject = studioRuntimeSubject(project)
    const curation = {
      pythonLevel: 3 as const,
      allowedModes: [subject.mode],
      allowLevelReveal: false,
    }
    const operation = request.operation ?? 'execute'
    const resolved = this.policy.authorize({
      project: subject,
      operation,
      curation,
      grantedCapabilities: operation === 'analyze' ? [] : ['execute', 'pause'],
      ...(operation === 'analyze' ? { allowReadOnlyAnalysis: true } : {}),
    })
    const issuedAt = this.clock()
    return StudioMasteryReviewRuntimeDecisionSchema.parse({
      version: 1,
      actor: { userId: actor.userId, accountId: actor.accountId },
      context: request.context,
      projectId: project.id,
      revision: snapshot.revision,
      subjectSha256: await sha256Hex(canonicalJson(subject)),
      runtime: subject.runtime,
      operation,
      ...resolved,
      capabilities:
        operation === 'analyze'
          ? []
          : resolved.capabilities.filter((value) => value === 'execute' || value === 'pause'),
      blockIds: [],
      curation,
      issuedAt,
      expiresAt: issuedAt + 30_000,
    })
  }
}
