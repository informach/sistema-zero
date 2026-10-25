import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import { RAYLIB_EXTENSION_IDS, RAYLIB_UPSTREAM } from '../runtime/python/raylib/contract'
import type { ExportFileMap } from './fileMap'

export function hasRaylibExtension(project: { installedExtensions: readonly { id: string }[] }) {
  return project.installedExtensions.some((extension) =>
    (RAYLIB_EXTENSION_IDS as readonly string[]).includes(extension.id),
  )
}

/**
 * On the computer the game runs on the real raylib-python-cffi, the package the Studio's own
 * `pyray`/`raylib` follow. Only the requirement goes with it: the browser engine (the Studio's
 * modules and the WebGL renderer) never enters the export, and the media is already in the
 * folders raylib opens (`images/`, `sounds/`, `music/`, `fonts/`, `models/`).
 */
export function buildRaylibDesktopFiles(input: {
  occupied: readonly string[]
  directories: readonly string[]
}) {
  const free = (path: string) =>
    !studioPortableFileConflict([...input.occupied, path], [...input.directories])
  let requirementsPath = 'requisitos-raylib.txt'
  for (let index = 2; !free(requirementsPath); index++)
    requirementsPath = `requisitos-raylib-${index}.txt`
  const files: ExportFileMap = {
    [requirementsPath]: `${RAYLIB_UPSTREAM.package}==${RAYLIB_UPSTREAM.version}\n`,
  }
  return { files, requirementsPath }
}
