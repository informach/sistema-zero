import { isStudioProTemplateId } from './pro-templates'
import { type StudioProjectDocument, StudioProjectDocumentSchema } from './project-document'
import { STUDIO_PROJECT_FORMAT_VERSION } from './project-format'

export interface StudioJavaScriptV2AuthoringProject {
  formatVersion: typeof STUDIO_PROJECT_FORMAT_VERSION
  programmingLanguage?: 'javascript'
  runtime?: never
  python?: never
  name: string
  files: { 'index.html': string; 'style.css': string; 'script.js': string }
  installedExtensions: { id: string; version: string; installedAt: number }[]
  [key: string]: unknown
}

/** The two formats already admitted by the current lesson authoring contract. */
export type StudioAuthoringProject = StudioProjectDocument | StudioJavaScriptV2AuthoringProject

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max

/** Current authoring formats, without converting historical programs or accepting unknown kinds. */
export function isStudioAuthoringProject(project: unknown): project is StudioAuthoringProject {
  if (record(project) && project.formatVersion === 3)
    return StudioProjectDocumentSchema.safeParse(project).success
  if (!record(project) || !record(project.files)) return false
  const files = project.files
  return (
    project.formatVersion === STUDIO_PROJECT_FORMAT_VERSION &&
    (project.programmingLanguage === undefined || project.programmingLanguage === 'javascript') &&
    project.runtime === undefined &&
    project.python === undefined &&
    (project.kind === undefined || project.kind === 'classic' || project.kind === 'pro') &&
    (project.kind !== 'pro' ||
      (record(project.tree) &&
        record(project.proMeta) &&
        isStudioProTemplateId(project.proMeta.templateId))) &&
    text(project.name, 200) &&
    ['index.html', 'style.css', 'script.js'].every((name) => typeof files[name] === 'string') &&
    Array.isArray(project.installedExtensions) &&
    project.installedExtensions.every(
      (extension: unknown) =>
        record(extension) &&
        text(extension.id, 80) &&
        text(extension.version, 40) &&
        typeof extension.installedAt === 'number',
    )
  )
}
