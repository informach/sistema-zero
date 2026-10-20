import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import { buildPythonAssetBundle } from '../core/pythonAssets'
import { assertPythonVisualDraftSettled } from '../python/blocks/workspaceDraft'
import { pythonFilesToTree, refinePythonProjectDocument } from '../state/pythonProjectValidation'
import type { ExportFileMap } from './fileMap'
import { buildPythonSourceMetadata } from './pythonSourceMetadata'
import type { SourceFilesResult } from './sourceExport'
import { captureSourceExportCatalog } from './sourceRuntimeCatalog'

/** Desktop source uses the learner's Python files and native libraries, never the browser adapter. */
export async function buildPythonSourceFiles(
  raw: unknown,
  catalog?: StudioRuntimeCatalog | null,
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
  const metadata = await buildPythonSourceMetadata({
    project,
    sourceFiles,
    directories,
    assets: bundle.manifest,
    occupiedFiles: Object.keys(files),
    runtimeCatalog,
  })
  Object.assign(files, metadata.files)
  for (const path of directories) files[`${path}/`] = new Uint8Array()
  return { files, warnings: metadata.warnings }
}
