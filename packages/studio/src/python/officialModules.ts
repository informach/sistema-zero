import type { PythonProjectDocument } from '../core/editableProject'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import { RAYLIB_EXTENSION_IDS } from '../runtime/python/raylib/contract'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'

const modules = [
  'random',
  'math',
  'time',
  'turtle',
  'pgzero',
  'pgzrun',
  'pyray',
  'raylib',
  'sz_audio',
] as const
const shadowableModules = ['random', 'math', 'turtle', 'sz_audio'] as const
export type PythonOfficialModule = (typeof modules)[number]

/** Metadata only; shared by assistance and authoring without loading the visual codecs. */
export function pythonShadowedModules(
  project: PythonProjectDocument,
): (typeof shadowableModules)[number][] {
  return shadowedAmong(project, shadowableModules)
}

function shadowedAmong<T extends string>(
  project: PythonProjectDocument,
  candidates: readonly T[],
): T[] {
  const files = Object.keys(project.kind === 'classic' ? project.files : project.tree)
  const entryDirectory = project.python.entrypoint.slice(
    0,
    project.python.entrypoint.lastIndexOf('/') + 1,
  )
  return candidates.filter((module) => {
    if (module === 'sz_audio') {
      // A namespace directory does not hide the later regular provided package.
      // .pyi is author-owned analysis metadata, not a claim that CPython executes it.
      return [
        `${entryDirectory}${module}.py`,
        `${entryDirectory}${module}.pyi`,
        `${entryDirectory}${module}/__init__.py`,
        `${entryDirectory}${module}/__init__.pyi`,
      ].some((path) => files.includes(path))
    }
    // Preserve the existing conservative stdlib/visual-authoring recognition.
    return files.some((path) =>
      ['', entryDirectory].some(
        (base) => path === `${base}${module}.py` || path.startsWith(`${base}${module}/`),
      ),
    )
  })
}

/** A project module wins over the bundled module; never label that call as the official API. */
export function pythonOfficialModules(project: PythonProjectDocument) {
  const shadowed = new Set<string>(shadowedAmong(project, modules))
  return new Set(
    modules.filter(
      (module) =>
        !shadowed.has(module) &&
        (module !== 'turtle' ||
          project.installedExtensions.some((extension) => extension.id === TURTLE_EXTENSION.id)) &&
        ((module !== 'pgzero' && module !== 'pgzrun') ||
          project.installedExtensions.some((extension) => extension.id === PGZERO_EXTENSION.id)) &&
        ((module !== 'pyray' && module !== 'raylib') ||
          project.installedExtensions.some((extension) =>
            (RAYLIB_EXTENSION_IDS as readonly string[]).includes(extension.id),
          )),
    ),
  )
}
