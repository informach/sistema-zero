import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import type { StudioPythonInspectionReport } from '@sistemazero/core/studio/python-inspection'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import type { validateStudioPythonRevision } from '@sistemazero/core/studio/python-runtime-client'
import { StudioPythonValidationReportSchema } from '@sistemazero/core/studio/python-validation'

/** Controlled transport fixture only. Real interpreter/cleanup evidence comes from SDK/Docker QA. */
export async function controlledPythonValidation(
  options: Pick<Parameters<typeof validateStudioPythonRevision>[0], 'snapshot' | 'recipe'>,
  inspection: StudioPythonInspectionReport,
  healthy = true,
) {
  const snapshot = await verifyStudioPythonExecutionMetadata(options.snapshot)
  const recipe = StudioPythonPlaytestRecipeSchema.parse(options.recipe)
  const compiled = inspection.status === 'passed'
  return StudioPythonValidationReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    recipe,
    inspection,
    status: compiled && healthy ? 'passed' : 'failed',
    ...(compiled
      ? {
          execution: {
            version: 1,
            projectId: snapshot.projectId,
            revision: snapshot.revision,
            runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
            pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
            instanceId: crypto.randomUUID(),
            runId: crypto.randomUUID(),
            recipe,
            status: healthy ? 'passed' : 'failed',
            started: true,
            stopped: true,
            stateBeforeStop: healthy ? 'completed' : 'failed',
            observedDurationMs: recipe.observeMs,
            stdout: '',
            stderr: '',
            omittedChars: 0,
            errors: healthy ? [] : ['Erro real de execução no transporte controlado'],
            input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
          },
        }
      : {}),
  })
}
