import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import { PYGAME_DESKTOP_FONTS } from '../runtime/python/pygame/desktopFonts.generated'
import { PYGAME_DESKTOP_SOURCES } from '../runtime/python/pygame/desktopSources.generated'
import type { ExportFileMap } from './fileMap'

/**
 * What a Pygame-ce game needs on the computer besides pygame-ce itself: the learner module
 * `pinta` (Pinta drawings, maps and the platform fonts) and those fonts in fontes/. Each file
 * goes along unless it would collide with one of the learner's (same path, a file where a
 * folder is needed, or the same name in other letter case): the learner's own file wins, and a
 * learner's fontes/ folder still receives the platform fonts it does not have.
 */
export function buildPygameDesktopFiles(input: {
  occupied: readonly string[]
  directories: readonly string[]
  entrypoint?: string
}): { files: ExportFileMap; generated: string[] } {
  const occupied = [...input.occupied]
  const files: ExportFileMap = {}
  const entrypoint = input.entrypoint ?? 'main.py'
  const base = entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1)
  const add = (path: string, bytes: ExportFileMap[string]) => {
    path = `${base}${path}`
    if (studioPortableFileConflict([...occupied, path], input.directories)) return
    files[path] = bytes
    occupied.push(path)
  }
  add('pinta.py', PYGAME_DESKTOP_SOURCES['pinta.py'])
  for (const [path, dataUrl] of Object.entries(PYGAME_DESKTOP_FONTS))
    add(
      path,
      Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (char) => char.charCodeAt(0)),
    )
  return { files, generated: Object.keys(files).sort() }
}
