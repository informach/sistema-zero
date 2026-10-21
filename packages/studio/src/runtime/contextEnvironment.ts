import {
  createContextualPythonLanguageProvider,
  createPythonAnalysisAuthorization,
} from '../python/language/contextProvider'
import {
  type ContextualRuntimeEnvironmentOptions,
  createContextualRuntimeEnvironmentCore,
} from './contextEnvironmentCore'
import type { StudioRuntimeEnvironment } from './environment'

/** Editor hosts (free, lesson, live, Admin): the contextual runtime with code analysis. */
export function createContextualRuntimeEnvironment(
  options: ContextualRuntimeEnvironmentOptions,
): Promise<StudioRuntimeEnvironment> {
  return createContextualRuntimeEnvironmentCore(options, {
    createContextualPythonLanguageProvider,
    createPythonAnalysisAuthorization,
  })
}
