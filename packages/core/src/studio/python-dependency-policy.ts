import type { StudioDependencyLock } from './project-environment'

/**
 * The current browser provider has no external-package installer. Turtle is an
 * optional runtime extension, not a pip dependency. A caller-recomputed SHA is
 * not evidence that a requirements declaration was resolved or installed.
 * Future package profiles must add their actual resolver before widening this policy.
 * Draft/source export remains independent from this execution/publication boundary.
 */
export function pythonExternalDependenciesIssue(
  requirements: string,
  lock: Pick<StudioDependencyLock, 'packages'>,
): string | null {
  if (
    lock.packages.length ||
    requirements.split(/\r\n?|\n/).some((line) => {
      const value = line.trim()
      return value !== '' && !value.startsWith('#')
    })
  )
    return 'Este ambiente ainda não instala pacotes externos. Use apenas comentários no requirements.txt; Turtle é uma extensão do Estúdio.'
  return null
}
