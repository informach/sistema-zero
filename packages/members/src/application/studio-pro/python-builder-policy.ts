import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import { ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import type { StudioProRevisionV2 } from '@sistemazero/core/studio/pro-revision'
import { createPythonBuilderPolicyResult } from '@sistemazero/core/studio/python-builder-authorization'
import type { StudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioFreeRuntimeDecisionSchema } from '@sistemazero/core/studio/runtime-authorization'
import {
  createStudioRuntimeCatalog,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { StudioRuntimeSubjectSchema } from '@sistemazero/core/studio/runtime-subject'
import type { AuthorizeFreeRuntimeService } from '../studio/authorize-free-runtime.service'

/** Shares the Complete Studio's current product, achievement and catalog policy.
 * Lease/source ownership remains with StudioBuilderService, never with this decision. */
export class StudioPythonBuilderPolicy {
  constructor(
    private readonly runtime: Pick<AuthorizeFreeRuntimeService, 'execute'>,
    private readonly available: boolean,
  ) {}

  async execute(
    actor: StudioAiActor,
    base: StudioProRevisionV2,
    snapshot: StudioPythonExecutionMetadata,
    operation: 'analyze' | 'execute',
    signal: AbortSignal,
  ) {
    signal.throwIfAborted()
    if (!this.available)
      throw new ValidationError('O construtor Python não está configurado neste ambiente.')
    const owner = { ...actor }
    const configuration = structuredClone(base.configuration)
    const projectId = base.projectId
    const executionRevision = snapshot.revision
    if (
      configuration.programmingLanguage !== 'python' ||
      snapshot.projectId !== base.projectId ||
      canonicalJson(snapshot.configuration) !==
        canonicalJson({
          runtime: configuration.runtime,
          extensions: configuration.extensions,
          python: configuration.python,
        })
    )
      throw new ValidationError('A autorização precisa corresponder à revisão Python da proposta.')
    const subject = StudioRuntimeSubjectSchema.parse({
      formatVersion: 3,
      id: base.projectId,
      kind: 'pro',
      mode: 'code',
      programmingLanguage: 'python',
      runtime: configuration.runtime,
      installedExtensions: configuration.extensions,
      proMeta: { templateId: base.templateId },
      python: configuration.python,
      requirements: base.files['requirements.txt'] ?? '',
    })
    const decision = StudioFreeRuntimeDecisionSchema.parse(
      await awaitWithSignal(
        () =>
          this.runtime.execute(
            { ...owner, audience: owner.audience ?? 'kids', readOnly: false },
            {
              context: {
                kind: 'free',
                audience: owner.audience ?? 'kids',
                projectId,
              },
              subject,
              revision: executionRevision,
              operation,
            },
          ),
        signal,
      ),
    )
    const subjectSha256 = await sha256Hex(canonicalJson(subject))
    if (
      decision.actor.userId !== owner.userId ||
      decision.actor.accountId !== owner.accountId ||
      canonicalJson(decision.context) !==
        canonicalJson({
          kind: 'free',
          audience: owner.audience ?? 'kids',
          projectId,
        }) ||
      decision.projectId !== projectId ||
      decision.revision !== executionRevision ||
      decision.operation !== operation ||
      decision.subjectSha256 !== subjectSha256 ||
      canonicalJson(decision.runtime) !== canonicalJson(configuration.runtime)
    )
      throw new ValidationError('A decisão não corresponde à revisão Python autorizada.')
    const catalog = await createStudioRuntimeCatalog(decision.catalog)
    const release = selectStudioRuntimeRelease(catalog, configuration.runtime)
    if (!release) throw new ValidationError('A release Python autorizada está ausente.')
    const result = await createPythonBuilderPolicyResult(
      { runtimeRelease: release },
      configuration.runtime,
    )
    signal.throwIfAborted()
    return result
  }
}
