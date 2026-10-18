import type { StudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import { StudioPythonPlaytestRecipeSchema } from '@sistemazero/core/studio/python-playtest'
import { StudioPythonValidationReportSchema } from '@sistemazero/core/studio/python-validation'

/** Controlled service receipts for transport/acceptance tests, never real-execution evidence. */
export function controlledPythonBuilderReport(
  snapshot: StudioPythonExecutionMetadata,
  recipeInput: unknown = { version: 1 },
  mode: 'passed' | 'compile-failed' | 'playtest-failed' = 'passed',
) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  return StudioPythonValidationReportSchema.parse({
    version: 1,
    projectId: snapshot.projectId,
    recipe,
    status: mode === 'passed' ? 'passed' : 'failed',
    inspection: {
      version: 1,
      revision: snapshot.revision,
      runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
      pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
      status: mode === 'compile-failed' ? 'failed' : 'passed',
      files: snapshot.files
        .filter((file) => /\.pyi?$/.test(file.path))
        .map((file, index) => ({
          path: file.path,
          sha256: file.sha256,
          status: mode === 'compile-failed' && index === 0 ? 'failed' : 'passed',
          diagnostics:
            mode === 'compile-failed' && index === 0
              ? [{ message: 'controlled syntax error' }]
              : [],
        })),
    },
    ...(mode === 'compile-failed'
      ? {}
      : {
          execution: {
            version: 1,
            projectId: snapshot.projectId,
            revision: snapshot.revision,
            runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
            pythonVersion: snapshot.configuration.python.dependencyLock.pythonVersion,
            instanceId: crypto.randomUUID(),
            runId: crypto.randomUUID(),
            recipe,
            status: mode === 'passed' ? 'passed' : 'failed',
            started: true,
            stopped: true,
            stateBeforeStop: mode === 'passed' ? 'completed' : 'failed',
            observedDurationMs: recipe.observeMs,
            stdout: '',
            stderr: '',
            omittedChars: 0,
            errors: mode === 'passed' ? [] : ['controlled execution failure'],
            input: { stdinRequests: 0, stdinSubmitted: 0, keysDispatched: 0, clicksDispatched: 0 },
          },
        }),
  })
}
