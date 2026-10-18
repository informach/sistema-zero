import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { StudioRuntimeSelection } from '@sistemazero/core/studio/project-environment'
import type { StudioPythonAnalysisAuthorization } from '@sistemazero/core/studio/python-language-authorization'
import type { PythonLanguageProvider } from '@sistemazero/core/studio/python-language-results'
import type { StudioRuntimeOperation } from '@sistemazero/core/studio/runtime-authorization'
import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import type { StudioRuntimeLoadInput, StudioRuntimeRegistry } from './registry'

/** Supplied by the host, independently of the learner's editable document. */
export interface StudioRuntimeEnvironment {
  /** Context lifetime. Revocation or host disposal closes parsers and running sessions. */
  signal?: AbortSignal
  pythonLanguage?: PythonLanguageProvider
  createPythonLanguage?(project: () => StudioProjectDocument | null): PythonLanguageProvider
  /** Owns fresh host context and holds a live journal only until the BFF policy acknowledgement. */
  requestPythonAssistance?(
    project: () => StudioProjectDocument | null,
    send: (
      authorization: StudioPythonAnalysisAuthorization,
      signal: AbortSignal,
    ) => Promise<Response>,
  ): Promise<Response>
  /** Host-qualified visual APIs for an exact runtime release, never supplied by the project. */
  pythonAuthoring?: readonly {
    runtime: StudioRuntimeSelection
    blockIds: readonly string[]
  }[]
  catalog: StudioRuntimeCatalog
  registry: StudioRuntimeRegistry
  access(project: StudioProjectDocument): StudioRuntimeLoadInput['access']
  /** Contextual hosts authorize the actual snapshot before starting it or dispatching a command.
   * Inert/test hosts and already-authorized embedded adapters can omit this hook. */
  authorize?(input: {
    project: StudioProjectDocument
    operation: StudioRuntimeOperation
    revision: string
    signal: AbortSignal
  }): Promise<void>
  /** Fresh execution + source export permission, resolved only from the host's approved frame. */
  resolvePythonWebExport?(input: {
    project: StudioProjectDocument
    revision: string
    signal: AbortSignal
  }): Promise<{ metadataURL: string; directoryURL: string }>
  /** The approved distribution that provides parsing, separate from learner execution. */
  resolvePythonAnalysis(
    project: StudioProjectDocument,
    signal: AbortSignal,
  ): Promise<{ url: string; allowedOrigins: readonly string[] }>
}
