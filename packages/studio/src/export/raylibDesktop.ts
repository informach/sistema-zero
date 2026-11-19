import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import { RAYLIB_CENARIO_SOURCES } from '../runtime/python/raylib/cenarioSources.generated'
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
 * modules and the WebGL renderer) never enters the export. The portable learner helper
 * cenario.py accompanies it unless an author module/package takes precedence. Media is in the
 * folders raylib opens (`images/`, `sounds/`, `music/`, `fonts/`, `models/`).
 */
export function buildRaylibDesktopFiles(input: {
  occupied: readonly string[]
  directories: readonly string[]
  entrypoint?: string
}) {
  const free = (path: string) =>
    !studioPortableFileConflict([...input.occupied, path], [...input.directories])
  let requirementsPath = 'requisitos-raylib.txt'
  for (let index = 2; !free(requirementsPath); index++)
    requirementsPath = `requisitos-raylib-${index}.txt`
  const files: ExportFileMap = {
    [requirementsPath]: `${RAYLIB_UPSTREAM.package}==${RAYLIB_UPSTREAM.version}\n`,
  }
  const entrypoint = input.entrypoint ?? 'main.py',
    base = entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1),
    helper = `${base}cenario.py`,
    // A package of this name also wins, even if there is no cenario.py file.
    authorModule =
      input.occupied.some((p) =>
        [base, ''].some((b) => {
          const path = p.toLowerCase(),
            module = `${b}cenario`.toLowerCase()
          return path === `${module}.py` || path.startsWith(`${module}/`)
        }),
      ) ||
      input.directories.some((p) =>
        [base, ''].some((b) => p.toLowerCase() === `${b}cenario`.toLowerCase()),
      )
  if (!authorModule && free(helper)) files[helper] = RAYLIB_CENARIO_SOURCES['cenario.py']
  return { files, requirementsPath, generated: Object.keys(files).sort() }
}
