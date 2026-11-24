import type { StudioProBuildLimits } from '@sistemazero/core/studio/pro-build'
import {
  STUDIO_PROJECT_FORMAT_VERSION,
  STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
} from '@sistemazero/core/studio/project-format'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import type { EditableStudioProject } from '../core/editableProject'
import {
  PRIVATE_REGIONAL_PROJECT,
  type PrivateRegionalProjectReadOptions,
} from '../core/pintaRegionalReference'
import {
  isDocumentRecord,
  ProjectDocumentError,
  projectFormatVersion,
} from '../core/projectDocument'
import { assertScene3DAssets } from '../core/scene3d/validacao'
import { copyLocalRevision } from './projectStorageRevision'
import { isPrivateRegionalProjectScope } from './projectStorageRuntime'
import { prepareProjectForHost } from './projectValidation'

/** One language dispatch for storage, host snapshots and recovery; never guesses Python as JS. */
export async function prepareEditableStudioProject(
  raw: unknown,
  options: { proBuildLimits?: StudioProBuildLimits } & PrivateRegionalProjectReadOptions = {},
): Promise<EditableStudioProject | null> {
  if (raw == null) return null
  const proBuildLimits = options.proBuildLimits ? { ...options.proBuildLimits } : undefined
  const scope = options[PRIVATE_REGIONAL_PROJECT]
  if (scope && !isPrivateRegionalProjectScope(scope))
    throw new Error('A captura regional requer um perfil de teste local.')
  const version = projectFormatVersion(raw)
  const captured = copyStudioProjectJson(raw)
  if (!isDocumentRecord(captured) || !isDocumentRecord(raw)) throw new Error('Documento inválido.')
  const regionalMaterials =
    scope &&
    (version === STUDIO_PROJECT_FORMAT_VERSION ||
      version === STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION)
      ? await (await import('../core/pintaRegionalProjectAdmission')).admitRegionalProjectAssets(
          captured.assets,
          scope.signal,
        )
      : undefined
  const policy = { proBuildLimits, regionalMaterials }
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
    return refinePythonProjectDocument(snapshot, { regionalMaterials })
  }
  const { refineJavaScriptProjectDocument } = await import('./javaScriptProjectValidation')
  const project = refineJavaScriptProjectDocument(snapshot, policy)
  await assertScene3DAssets(project.assets ?? [])
  return project
}
