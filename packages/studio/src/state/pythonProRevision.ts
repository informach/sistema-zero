import {
  createStudioProRevision,
  STUDIO_PRO_REVISION_LIMITS,
  type StudioProRevisionV2,
} from '@sistemazero/core/studio/pro-revision'
import { encodeAssetBase64 } from '../core/assetBinary'
import { buildPythonAssetBundle } from '../core/pythonAssets'
import { refinePythonProProjectDocument } from './pythonProProjectValidation'

export class PythonProRevisionUnavailableError extends Error {
  readonly code = 'asset-manifest-too-large'
  constructor() {
    super(
      'A descrição dos materiais excede o limite da revisão. Os arquivos originais foram preservados.',
    )
    this.name = 'PythonProRevisionUnavailableError'
  }
}

export async function capturePythonProRevision(raw: unknown): Promise<StudioProRevisionV2> {
  return (await captureRevision(raw, false)).base
}

export async function capturePythonProRevisionPayload(raw: unknown) {
  return captureRevision(raw, true)
}

/** Language-specific projection into the existing CAS protocol; no second edit history. */
async function captureRevision(raw: unknown, includeBinaries: boolean) {
  const project = await refinePythonProProjectDocument(raw)
  const files: Record<string, string> = Object.fromEntries(
    Object.entries(project.tree).flatMap(([path, node]) =>
      node.kind === 'file' ? [[path, node.content]] : [],
    ),
  )
  const directories = Object.entries(project.tree).flatMap(([path, node]) =>
    node.kind === 'dir' ? [path] : [],
  )
  const bundle = await buildPythonAssetBundle(project.assets, {
    files: Object.keys(files),
    directories,
  })
  const assets = JSON.stringify(bundle.manifest)
  if (assets.length > STUDIO_PRO_REVISION_LIMITS.maxAssetManifestChars)
    throw new PythonProRevisionUnavailableError()
  const assetFiles = Object.fromEntries(
    bundle.manifest.assets.map((asset) => [asset.path, asset.sha256]),
  )
  const base = await createStudioProRevision({
    version: 2,
    projectId: project.id,
    templateId: project.proMeta.templateId,
    files,
    directories,
    assets,
    assetFiles,
    configuration: {
      programmingLanguage: 'python',
      runtime: project.runtime,
      extensions: project.installedExtensions.map(({ id, version }) => ({ id, version })),
      python: project.python,
    },
  })
  const binaries: Record<string, { base64: string; sha256: string }> = {}
  if (includeBinaries)
    for (const [path, bytes] of bundle.files)
      binaries[path] = { base64: encodeAssetBase64(bytes), sha256: assetFiles[path]! }
  return { base, binaries }
}
