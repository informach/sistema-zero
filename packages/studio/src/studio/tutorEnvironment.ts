import type { StudioTutorEnvironment } from '@sistemazero/core/studio/tutor-environment'
import { type EditableStudioProject, isPythonProject } from '../core/editableProject'
import { pythonShadowedModules } from '../python/officialModules'

/** Detached metadata. The BFF must separately authorize this project's current host context. */
export function buildStudioTutorEnvironment(
  project: EditableStudioProject,
): StudioTutorEnvironment {
  const extensions = project.installedExtensions.map(({ id, version }) => ({ id, version }))
  if (isPythonProject(project))
    return {
      version: 1,
      programmingLanguage: 'python',
      runtime: { ...project.runtime },
      pythonVersion: project.python.dependencyLock.pythonVersion,
      entrypoint: project.python.entrypoint,
      extensions,
      shadowedModules: pythonShadowedModules(project),
    }
  return {
    version: 1,
    programmingLanguage: 'javascript',
    ...(project.runtime ? { runtime: { ...project.runtime } } : {}),
    extensions,
  }
}
