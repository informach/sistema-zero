import {
  decodeProjectAsset as decodeProAsset,
  digestAssetBytes as digest,
  projectAssetFileExtension,
} from './assetBinary'
import { courseModelDataUrl, preloadCourseModels } from './courseModels'
import { PRO_ASSET_DIRECTORY, PRO_ASSET_MANIFEST, validProAssetPath } from './proAssetPaths'
import {
  asset3DManifest,
  assetManifest,
  assetMetaManifest,
  isValidAssetDataUrl,
  PROJECT_ASSET_LIMITS,
  type ProjectAsset,
  soundManifest,
} from './project'
import { type ProModelMetadata, readProModelMetadata } from './proModelMetadata'
import type { ProjectTree } from './proProject'

export interface ProAssetManifestEntry {
  id: string
  name: string
  kind: ProjectAsset['kind']
  path: string
  url: string
  mime: string
  bytes: number
  sha256: string
  source: ProjectAsset['source']
  origin?: ProjectAsset['libOrigin']
  libraryId?: string
  license?: ProjectAsset['license']
  width?: number
  height?: number
  model?: ProModelMetadata
  sprite?: ProjectAsset['sprite']
  tileset?: ProjectAsset['tileset']
  tilemap?: Omit<NonNullable<ProjectAsset['tilemap']>, 'tileset'> & {
    tileset: { url: string; width: number; height: number; sha256: string; bytes: number }
  }
}

export interface ProAssetBundle {
  manifest: { version: 1; assets: ProAssetManifestEntry[] }
  files: ReadonlyMap<string, Uint8Array>
}

export { decodeProjectAsset as decodeProAsset } from './assetBinary'

const cache = new WeakMap<
  ProjectAsset,
  Promise<{ entry: ProAssetManifestEntry; files: Map<string, Uint8Array> }>
>()
const legacyCache = new WeakMap<readonly ProjectAsset[], Promise<Uint8Array>>()
function materialize(asset: ProjectAsset) {
  const cached = cache.get(asset)
  if (cached) return cached
  const promise = (async () => {
    // Modelo da biblioteca dos cursos: o arquivo de verdade (carregado antes pelo bundle).
    const dataUrl = courseModelDataUrl(asset) ?? asset.dataUrl
    if (!isValidAssetDataUrl(dataUrl, asset.kind, asset.originalFileName))
      throw new Error(`O material ${asset.name} não é válido.`)
    const { mime, bytes } = decodeProAsset(dataUrl)
    const identity = await digest(new TextEncoder().encode(asset.id))
    const extension = projectAssetFileExtension(mime, asset.kind)
    const path = asset.proPath ?? `${PRO_ASSET_DIRECTORY}/${identity}.${extension}`
    if (!validProAssetPath(path))
      throw new Error(`O caminho do material ${asset.name} não é válido.`)
    const files = new Map([[path, bytes]])
    const entry: ProAssetManifestEntry = {
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      path,
      url: path.slice('public/'.length),
      mime,
      bytes: bytes.length,
      sha256: await digest(bytes),
      source: asset.source,
      ...(asset.libOrigin ? { origin: asset.libOrigin } : {}),
      ...(asset.libId ? { libraryId: asset.libId } : {}),
      ...(asset.license ? { license: asset.license } : {}),
      ...(asset.width ? { width: asset.width } : {}),
      ...(asset.height ? { height: asset.height } : {}),
      ...(asset.sprite ? { sprite: asset.sprite } : {}),
      ...(asset.tileset ? { tileset: asset.tileset } : {}),
    }
    if (asset.kind === 'model3d') {
      const metadata = readProModelMetadata(bytes)
      if (metadata) entry.model = metadata
    }
    if (asset.tilemap) {
      const { tileset, ...map } = asset.tilemap
      const sheet = decodeProAsset(tileset.dataUrl)
      const sheetPath = `${PRO_ASSET_DIRECTORY}/${identity}-tiles.${projectAssetFileExtension(sheet.mime, undefined, 'png')}`
      files.set(sheetPath, sheet.bytes)
      entry.tilemap = {
        ...map,
        tileset: {
          url: sheetPath.slice('public/'.length),
          width: tileset.width,
          height: tileset.height,
          sha256: await digest(sheet.bytes),
          bytes: sheet.bytes.length,
        },
      }
    }
    return { entry, files }
  })()
  cache.set(asset, promise)
  void promise.catch(() => cache.delete(asset))
  return promise
}

/** Called on asset changes/export, never on each keystroke. Bytes stay outside source and prompts. */
export async function buildProAssetBundle(
  assets: readonly ProjectAsset[] = [],
  tree?: ProjectTree,
  options: { legacyRuntime?: boolean } = {},
): Promise<ProAssetBundle> {
  if (
    assets.length > PROJECT_ASSET_LIMITS.maxAssetsCount ||
    assets.reduce((n, asset) => n + asset.dataUrl.length, 0) >
      PROJECT_ASSET_LIMITS.maxAssetsTotalChars
  )
    throw new Error('Os materiais ultrapassaram o limite do projeto.')
  await preloadCourseModels(assets)
  const files = new Map<string, Uint8Array>()
  const entries: ProAssetManifestEntry[] = []
  const ids = new Set<string>()
  // Sequential decoding bounds peak memory; immutable assets reuse their cached bytes and digest.
  for (const asset of assets) {
    if (ids.has(asset.id)) throw new Error('Dois materiais usam o mesmo identificador.')
    ids.add(asset.id)
    const result = await materialize(asset)
    for (const [path, bytes] of result.files) {
      if ([...files.keys()].some((existing) => existing.toLowerCase() === path.toLowerCase()))
        throw new Error(`Dois materiais usam o caminho ${path}.`)
      files.set(path, bytes)
    }
    entries.push(result.entry)
  }
  const manifest = { version: 1 as const, assets: entries }
  files.set(PRO_ASSET_MANIFEST, new TextEncoder().encode(JSON.stringify(manifest, null, 2)))
  if (options.legacyRuntime) {
    let runtime = legacyCache.get(assets)
    if (!runtime) {
      runtime = import('../preview/assetsBridge').then(({ buildAssetsRuntime }) =>
        new TextEncoder().encode(
          buildAssetsRuntime(
            assetManifest(assets),
            assetMetaManifest(assets),
            soundManifest(assets),
            asset3DManifest(assets),
          ),
        ),
      )
      legacyCache.set(assets, runtime)
      void runtime.catch(() => legacyCache.delete(assets))
    }
    files.set('public/sz-assets.js', await runtime)
  }
  if (tree)
    for (const path of files.keys()) {
      for (const [existing, node] of Object.entries(tree)) {
        const compared = existing.toLowerCase()
        const target = path.toLowerCase()
        if (
          compared === target ||
          (node.kind === 'file' && target.startsWith(`${compared}/`)) ||
          compared.startsWith(`${target}/`)
        )
          throw new Error(
            `O material e o código usam o mesmo caminho: ${path}. Renomeie o arquivo de código.`,
          )
      }
    }
  return { manifest, files }
}
