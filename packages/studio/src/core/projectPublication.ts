import {
  type EditableStudioProject,
  isPythonProject,
  type PythonProjectDocument,
} from './editableProject'
import type { Project } from './project'

/** Local link reference only. Owner, active revision and capabilities are server-owned. */
export function projectPublicationId(project: EditableStudioProject): string | undefined {
  return isPythonProject(project) && project.kind === 'classic'
    ? project.publication?.playId
    : project.proMeta?.publication?.playId
}

export function withoutProjectPublication(project: Project): Project
export function withoutProjectPublication(project: PythonProjectDocument): PythonProjectDocument
export function withoutProjectPublication(project: EditableStudioProject): EditableStudioProject
export function withoutProjectPublication(project: EditableStudioProject): EditableStudioProject {
  if (isPythonProject(project)) {
    if (project.kind === 'classic') {
      const { publication: _publication, ...rest } = project
      return rest
    }
    const { publication: _publication, ...proMeta } = project.proMeta
    return { ...project, proMeta }
  }
  if (project.kind === 'pro' && project.proMeta) {
    const { publication: _publication, ...proMeta } = project.proMeta
    return { ...project, proMeta }
  }
  return project
}
