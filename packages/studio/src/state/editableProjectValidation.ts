import type { StudioProBuildLimits } from '@sistemazero/core/studio/pro-build'
import { STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION } from '@sistemazero/core/studio/project-format'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { EditableStudioProject } from '../core/editableProject'
import {
  isDocumentRecord,
  ProjectDocumentError,
  projectFormatVersion,
} from '../core/projectDocument'
import { copyLocalRevision } from './projectStorageRevision'
import { prepareProjectForHost } from './projectValidation'

/** One language dispatch for storage, host snapshots and recovery; never guesses Python as JS. */
export async function prepareEditableStudioProject(
  raw: unknown,
  options: { proBuildLimits?: StudioProBuildLimits } = {},
): Promise<EditableStudioProject | null> {
  if (raw == null) return null
  const policy = {
    proBuildLimits: options.proBuildLimits ? { ...options.proBuildLimits } : undefined,
  }
  const version = projectFormatVersion(raw)
  const captured = copyStudioProjectJson(raw)
  if (!isDocumentRecord(captured) || !isDocumentRecord(raw)) throw new Error('Documento inválido.')
  const snapshot =
    typeof captured.id === 'string'
      ? copyLocalRevision(raw as { id: string }, { ...captured, id: captured.id })
      : captured
  if (version !== STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION) {
    if (captured.programmingLanguage !== undefined && captured.programmingLanguage !== 'javascript')
      throw new ProjectDocumentError('invalid-document', 'Projetos Python precisam do formato 3.')
    return prepareProjectForHost(snapshot, policy)
  }
  if (captured.programmingLanguage === 'python') {
    // Python-specific validation/hash code is absent from the legacy JS load path.
    const { refinePythonProjectDocument } = await import('./pythonProjectValidation')
    return refinePythonProjectDocument(snapshot)
  }
  const { refineJavaScriptProjectDocument } = await import('./javaScriptProjectValidation')
  return refineJavaScriptProjectDocument(snapshot, policy)
}
