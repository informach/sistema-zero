import type { Project } from '#core'

/**
 * Extensões já gravadas no projeto que o host ainda não liberou para esta
 * experiência. O projeto é preservado como está e só deixa de abrir até a
 * carreira autorizar todas elas.
 */
export function disallowedProjectExtensions(
  project: Pick<Project, 'installedExtensions'>,
  allowedExtensionIds?: readonly string[],
): string[] {
  if (allowedExtensionIds === undefined) return []
  const allowed = new Set(allowedExtensionIds)
  return project.installedExtensions
    .map((extension) => extension.id)
    .filter((id) => !allowed.has(id))
}
