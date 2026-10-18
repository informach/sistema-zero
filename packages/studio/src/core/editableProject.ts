import type { Project } from './project'
import type { PythonProjectDocument } from './pythonProject'

export type {
  PythonClassicProjectDocument,
  PythonProjectDocument,
  PythonProProjectDocument,
} from './pythonProject'
export type JavaScriptEditableProject = Project

/** Validated editor payloads. Legacy JavaScript stays readable during writer migration. */
export type EditableStudioProject = JavaScriptEditableProject | PythonProjectDocument

export function isPythonProject(project: EditableStudioProject): project is PythonProjectDocument {
  return 'programmingLanguage' in project && project.programmingLanguage === 'python'
}

/** A JavaScript-specific surface must not interpret Python files or its visual cache. */
export function javaScriptProject(
  project: EditableStudioProject | null | undefined,
): Project | null {
  return project && !isPythonProject(project) ? project : null
}
