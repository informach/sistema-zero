import type { EditableStudioProject } from '../core/editableProject'
import { projectFormatVersion, SUPPORTED_PROJECT_FORMAT_VERSION } from '../core/projectDocument'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { sanitizeCloudProjectSnapshot } from './projectValidation'

export async function prepareEditableCloudProject(
  raw: unknown,
  options: { expectedId?: string } = {},
): Promise<{ project: EditableStudioProject; warnings: string[] }> {
  const expectedId = options.expectedId
  if (projectFormatVersion(raw) !== SUPPORTED_PROJECT_FORMAT_VERSION)
    return sanitizeCloudProjectSnapshot(raw, { expectedId })
  const project = await prepareEditableStudioProject(raw)
  if (!project || (expectedId !== undefined && project.id !== expectedId))
    throw new Error('Snapshot recusado: o projeto tem outra identidade.')
  return { project, warnings: [] }
}
