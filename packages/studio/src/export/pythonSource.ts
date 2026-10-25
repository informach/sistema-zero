import { studioPortableFileConflict } from '@sistemazero/core/studio/project-environment'
import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonAssetBundle } from '../core/pythonAssets'
import { assertPythonVisualDraftSettled } from '../python/blocks/workspaceDraft'
import { hasPygameExtension } from '../runtime/python/pygame/contract'
import { hasTurtleExtension } from '../runtime/python/turtle/contract'
import { TURTLE_PINTA_SHAPES_SOURCES } from '../runtime/python/turtle/formasDoPinta.generated'
import { pythonFilesToTree, refinePythonProjectDocument } from '../state/pythonProjectValidation'
import type { ExportFileMap } from './fileMap'
import { browserSvgRasterizer, hasPgzeroExtension, type SvgRasterizer } from './pgzeroDesktop'
import { buildPythonSourceMetadata } from './pythonSourceMetadata'
import { buildRaylibDesktopFiles, hasRaylibExtension } from './raylibDesktop'
import type { SourceFilesResult } from './sourceExport'
import { captureSourceExportCatalog } from './sourceRuntimeCatalog'

/** Desktop source uses the learner's Python files and native libraries, never the browser adapter. */
export async function buildPythonSourceFiles(
  raw: unknown,
  catalog?: StudioRuntimeCatalog | null,
  options: { rasterizeSvg?: SvgRasterizer } = {},
): Promise<SourceFilesResult> {
  const runtimeCatalog = captureSourceExportCatalog(catalog)
  const project = await refinePythonProjectDocument(raw)
  assertPythonVisualDraftSettled(project)
  const tree = project.kind === 'pro' ? project.tree : pythonFilesToTree(project.files)
  const sourceFiles: Record<string, string> = Object.fromEntries(
    Object.entries(tree).flatMap(([path, node]) =>
      node.kind === 'file' ? [[path, node.content]] : [],
    ),
  )
  const directories = Object.entries(tree).flatMap(([path, node]) =>
    node.kind === 'dir' ? [path] : [],
  )
  const files: ExportFileMap = { ...sourceFiles }
  const bundle = await buildPythonAssetBundle(project.assets, {
    files: Object.keys(files),
    directories,
  })
  for (const [path, bytes] of bundle.files) files[path] = bytes
  let pgzero = null
  if (hasPgzeroExtension(project)) {
    const { buildPgzeroDesktopFiles } = await import('./pgzeroDesktop')
    pgzero = await buildPgzeroDesktopFiles({
      assets: bundle.manifest.assets,
      bundle: bundle.files,
      occupied: Object.keys(files),
      directories,
      rasterize: options.rasterizeSvg ?? browserSvgRasterizer,
    })
    Object.assign(files, pgzero.files)
  }
  const raylib = hasRaylibExtension(project)
    ? buildRaylibDesktopFiles({ occupied: Object.keys(files), directories })
    : null
  if (raylib) Object.assign(files, raylib.files)
  // A Turtle game that uses Pinta drawings as shapes takes the module along, next to the main
  // file (where `import formas_do_pinta` looks first). The child's own file of that name wins.
  if (
    hasTurtleExtension(project.installedExtensions) &&
    Object.values(sourceFiles).some((text) => /\bformas_do_pinta\b/.test(text))
  ) {
    const entrypoint = project.python.entrypoint
    const path = `${entrypoint.slice(0, entrypoint.lastIndexOf('/') + 1)}formas_do_pinta.py`
    if (!(path in files) && !studioPortableFileConflict([...Object.keys(files), path], directories))
      files[path] = TURTLE_PINTA_SHAPES_SOURCES['formas_do_pinta.py']!
  }
  let pygameFiles: string[] = []
  if (hasPygameExtension(project.installedExtensions)) {
    const { buildPygameDesktopFiles } = await import('./pygameDesktop')
    const desktop = buildPygameDesktopFiles({ occupied: Object.keys(files), directories })
    Object.assign(files, desktop.files)
    pygameFiles = desktop.generated
  }
  const metadata = await buildPythonSourceMetadata({
    project,
    sourceFiles,
    directories,
    assets: bundle.manifest,
    occupiedFiles: Object.keys(files),
    runtimeCatalog,
    pgzero,
    raylib,
    pygameFiles,
  })
  Object.assign(files, metadata.files)
  for (const path of directories) files[`${path}/`] = new Uint8Array()
  return { files, warnings: metadata.warnings }
}
