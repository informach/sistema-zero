import type { StudioAiActor } from '@sistemazero/core/ai-credits'
import { canonicalJson } from '@sistemazero/core/creations'
import { ValidationError } from '@sistemazero/core/errors'
import { awaitWithSignal } from '@sistemazero/core/http'
import type { StudioProRevisionV2 } from '@sistemazero/core/studio/pro-revision'
import type { StudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
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
    const configuration = base.configuration
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
    await awaitWithSignal(
      () =>
        this.runtime.execute(
          { ...actor, audience: actor.audience ?? 'kids', readOnly: false },
          {
            context: {
              kind: 'free',
              audience: actor.audience ?? 'kids',
              projectId: base.projectId,
            },
            subject,
            revision: snapshot.revision,
            operation,
          },
        ),
      signal,
    )
    signal.throwIfAborted()
  }
}
