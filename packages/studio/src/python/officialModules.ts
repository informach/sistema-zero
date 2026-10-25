import type { PythonProjectDocument } from '../core/editableProject'
import { PGZERO_EXTENSION } from '../runtime/python/pgzero/contract'
import { PYGAME_EXTENSION } from '../runtime/python/pygame/contract'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'

const modules = [
  'random',
  'math',
  'time',
  'turtle',
  'pgzero',
  'pgzrun',
  'pygame',
  'pinta',
  'sz_audio',
] as const
const shadowableModules = ['random', 'math', 'turtle', 'pygame', 'pinta', 'sz_audio'] as const
export type PythonOfficialModule = (typeof modules)[number]

/** What decides the official modules: the project's paths, entry point and extensions. */
export interface PythonModuleContext {
  paths: readonly string[]
  entrypoint: string
  extensionIds: readonly string[]
}
function moduleContext(project: PythonProjectDocument): PythonModuleContext {
  return {
    paths: Object.keys(project.kind === 'classic' ? project.files : project.tree),
    entrypoint: project.python.entrypoint,
    extensionIds: project.installedExtensions.map((extension) => extension.id),
  }
}

/** Metadata only; shared by assistance and authoring without loading the visual codecs. */
export function pythonShadowedModules(
  project: PythonProjectDocument,
): (typeof shadowableModules)[number][] {
  return shadowedAmong(moduleContext(project), shadowableModules)
}

function shadowedAmong<T extends string>(
  { paths: files, entrypoint }: PythonModuleContext,
  candidates: readonly T[],
): T[] {
  const entryDirectory = entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1)
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
  return pythonOfficialModulesFor(moduleContext(project))
}

/** The same decision from the project's paths (tools that read a game folder, not a document). */
export function pythonOfficialModulesFor(context: PythonModuleContext) {
  const shadowed = new Set<string>(shadowedAmong(context, modules))
  const installed = (id: string) => context.extensionIds.includes(id)
  return new Set(
    modules.filter(
      (module) =>
        !shadowed.has(module) &&
        (module !== 'turtle' || installed(TURTLE_EXTENSION.id)) &&
        ((module !== 'pgzero' && module !== 'pgzrun') || installed(PGZERO_EXTENSION.id)) &&
        ((module !== 'pygame' && module !== 'pinta') || installed(PYGAME_EXTENSION.id)),
    ),
  )
}
