import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  isStudioPortablePath,
  isStudioPythonAssetPath,
  studioPortableFileConflict,
} from '@sistemazero/core/studio/project-environment'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  STUDIO_PYTHON_MATERIAL_DATA_LIMITS,
  STUDIO_PYTHON_MATERIAL_LIMITS,
} from '@sistemazero/core/studio/python-material-policy'
import { decodeProjectAsset, digestAssetBytes, pythonAssetFileExtension } from './assetBinary'
import { assertPintaImageAssetBytes } from './pintaImageAsset'
import { type ProjectAsset, sanitizeProjectAssets } from './projectAssets'
import { assertProjectContentPreserved } from './projectDocumentGuards'

export interface PythonAssetManifestEntry {
  id: string
  name: string
  kind: ProjectAsset['kind']
  path: string
  mime: string
  bytes: number
  sha256: string
  /** Covers all source metadata, including the captured Pinta recipe/provenance/output. */
  metadataSha256: string
  source: ProjectAsset['source']
  libId?: string
  libOrigin?: ProjectAsset['libOrigin']
  libRevision?: number
  pintaImage?: ProjectAsset['pintaImage']
  license?: ProjectAsset['license']
  width?: number
  height?: number
}

export interface PythonAssetBundle {
  manifest: { version: 1; assets: PythonAssetManifestEntry[] }
  /** Exact media bytes; no web bootstrap, generated script or synthetic HTML. */
  files: ReadonlyMap<string, Uint8Array<ArrayBuffer>>
}

/** Callers still compare input/output to reject any lossy normalization. */
export function sanitizePythonProjectAssets(assets: unknown) {
  return sanitizeProjectAssets(assets, {
    materialPath: isStudioPythonAssetPath,
    dataLimits: STUDIO_PYTHON_MATERIAL_DATA_LIMITS,
  })
}

/**
 * Materializes the project's media for the Python filesystem and source export.
 * Pinta flattening/frame selection happens at import, never implicitly here.
 * Called for a captured run/export/revision, not on every editor keystroke.
 */
export async function buildPythonAssetBundle(
  assets: readonly ProjectAsset[] = [],
  layout: { files: readonly string[]; directories?: readonly string[] } = { files: [] },
): Promise<PythonAssetBundle> {
  const input = copyStudioProjectJson({ assets, layout }) as {
    assets: ProjectAsset[]
    layout: { files: string[]; directories?: string[] }
  }
  const validated = sanitizePythonProjectAssets(input.assets)
  assertProjectContentPreserved({ assets: input.assets }, { assets: validated })
  const directories = input.layout.directories ?? []
  if ([...input.layout.files, ...directories].some((path) => !isStudioPortablePath(path)))
    throw new Error('A estrutura Python contém um caminho inválido.')
  if (new Set(validated.map((asset) => asset.id)).size !== validated.length)
    throw new Error('Dois materiais usam o mesmo identificador.')

  const entries: PythonAssetManifestEntry[] = []
  const files = new Map<string, Uint8Array<ArrayBuffer>>()
  let totalBytes = 0
  for (const asset of validated) {
    const { mime, bytes } = decodeProjectAsset(asset.dataUrl)
    totalBytes += bytes.byteLength
    const limit =
      asset.kind === 'image'
        ? STUDIO_PYTHON_MATERIAL_LIMITS.imageBytes
        : STUDIO_PYTHON_MATERIAL_LIMITS.audioBytes
    if (bytes.byteLength > limit || totalBytes > STUDIO_PYTHON_MATERIAL_LIMITS.totalBytes)
      throw new Error('Os materiais Python excedem o limite de bytes do perfil.')
    // Python preserves portable FLAC (and every WAV MIME name) without changing the historical
    // JS materializer's fallback names for these MIME types.
    const extension = pythonAssetFileExtension(mime, asset.kind)
    const path = asset.proPath ?? `assets/${await sha256Hex(asset.id)}.${extension}`
    if (!isStudioPythonAssetPath(path))
      throw new Error(`O material ${asset.name} precisa de um formato de mídia portátil.`)
    if (files.has(path)) throw new Error(`Dois materiais usam o caminho ${path}.`)
    const { dataUrl: _dataUrl, ...metadata } = asset
    const sha256 = await digestAssetBytes(bytes)
    assertPintaImageAssetBytes(asset, bytes, sha256)
    files.set(path, bytes)
    entries.push({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      path,
      mime,
      bytes: bytes.byteLength,
      sha256,
      metadataSha256: await sha256Hex(canonicalJson(metadata)),
      source: asset.source,
      ...(asset.libId ? { libId: asset.libId } : {}),
      ...(asset.libOrigin ? { libOrigin: asset.libOrigin } : {}),
      ...(asset.libRevision ? { libRevision: asset.libRevision } : {}),
      ...(asset.pintaImage ? { pintaImage: asset.pintaImage } : {}),
      ...(asset.license ? { license: asset.license } : {}),
      ...(asset.width ? { width: asset.width } : {}),
      ...(asset.height ? { height: asset.height } : {}),
    })
  }
  if (studioPortableFileConflict([...input.layout.files, ...files.keys()], directories))
    throw new Error('Um material colide com outro arquivo ou pasta do projeto Python.')
  return { manifest: { version: 1, assets: entries }, files }
}
