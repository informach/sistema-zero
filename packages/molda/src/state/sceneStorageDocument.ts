import { isMoldaAssetId } from '../core/id'
import { structuredBytes } from '../core/structuredBytes'
import type { MoldaSceneDocument, SceneImageLayer } from '../scene/document'
import { SCENE_LIMITS } from '../scene/limits'
import {
  readSceneDocument,
  readSceneDocumentStructure,
  readSceneImageStructure,
  type SceneDocumentStructure,
  type SceneDocumentStructureRead,
  type SceneImageStructure,
} from '../scene/readDocument'
import * as v from '../scene/validation'
import {
  checkScenePixelBytes,
  readScenePixelReference,
  SceneBlobError,
  type ScenePixelReference,
  sameScenePixelBytes,
  scenePixelHash,
} from './sceneBlob'

export type SceneStoredImageLayer = Omit<SceneImageLayer, 'pixels'> & {
  pixels: ScenePixelReference
}
export type SceneStoredImage = SceneImageStructure<ScenePixelReference>
export type SceneStoredDocument = SceneDocumentStructure<SceneStoredImage>
export interface SceneStorageManifest {
  formatVersion: 2
  storageVersion: 2
  kind: 'molda-scene-storage'
  id: string
  document: SceneStoredDocument
}
export interface PreparedSceneStorage {
  manifest: SceneStorageManifest
  blobs: ReadonlyMap<string, Uint8Array>
  logicalBytes: number
}

function requireStructure<Image>(
  read: SceneDocumentStructureRead<Image>,
): SceneDocumentStructure<Image> {
  if (read.status === 'unsupported')
    throw new SceneBlobError('unsupported', 'Esta criação usa outra versão do Molda.')
  if (read.status === 'invalid') throw new SceneBlobError('invalid', read.message)
  return read.document
}

function readImages<Pixel>(
  raw: unknown,
  readPixels: (raw: unknown, bytes: number) => Pixel,
): SceneImageStructure<Pixel>[] {
  const budget = { pixels: 0, layers: 0 }
  return v
    .list(raw, 'images', SCENE_LIMITS.images)
    .map((raw, i) => readSceneImageStructure(raw, `images[${i}]`, budget, readPixels))
}

/** Owns typed fields/references, but only hydration can prove cross-references and pixel integrity. */
export function readSceneStorageManifest(raw: unknown): SceneStorageManifest {
  try {
    const row = v.record(raw, 'storage')
    const format = v.number(row.formatVersion, 'formatVersion', 1, Number.MAX_SAFE_INTEGER, true)
    if (format !== 2)
      throw new SceneBlobError('unsupported', 'Esta criação usa outra versão do Molda.')
    const version = v.number(row.storageVersion, 'storageVersion', 1, Number.MAX_SAFE_INTEGER, true)
    if (version !== 2)
      throw new SceneBlobError('unsupported', 'Esta cópia usa outra versão de armazenamento.')
    v.record(row, 'storage', ['formatVersion', 'storageVersion', 'kind', 'id', 'document'])
    v.requireScene(
      row.kind === 'molda-scene-storage' && isMoldaAssetId(row.id),
      'storage',
      'Cópia inválida.',
    )
    const document = requireStructure(
      readSceneDocumentStructure(row.document, (raw) => readImages(raw, readScenePixelReference)),
    )
    v.requireScene(document.id === row.id, 'id', 'A cópia pertence a outra criação.')
    const sizes = new Map<string, number>()
    for (const image of document.images)
      for (const { pixels } of image.layers) {
        const size = sizes.get(pixels.hash)
        v.requireScene(
          size === undefined || size === pixels.byteLength,
          'pixels',
          'Referências divergentes.',
        )
        sizes.set(pixels.hash, pixels.byteLength)
      }
    return {
      formatVersion: 2,
      storageVersion: 2,
      kind: 'molda-scene-storage',
      id: row.id,
      document,
    }
  } catch (error) {
    if (error instanceof v.SceneValidationError) throw new SceneBlobError('invalid', error.message)
    throw error
  }
}

/** Pure storage codec. No IDB, cache, timestamps, IDs, authorial transforms or writer activation. */
export async function prepareSceneStorage(
  source: MoldaSceneDocument,
  signal?: AbortSignal,
): Promise<PreparedSceneStorage> {
  signal?.throwIfAborted()
  // The shared structure readers check ALL image/layer budgets without copying pixels.
  // The complete native reader then acquires pixels once and checks the document relationships.
  const fields = requireStructure(
    readSceneDocumentStructure(source, (raw) =>
      readImages(raw, (raw, bytes) => {
        checkScenePixelBytes(raw, bytes)
        return raw
      }),
    ),
  )
  const document = requireStructure(readSceneDocument(fields))
  const logicalBytes = structuredBytes(document)
  const blobs = new Map<string, Uint8Array>()
  const images: SceneStoredImage[] = []
  for (const image of document.images) {
    const layers: SceneStoredImageLayer[] = []
    for (const layer of image.layers) {
      const hash = await scenePixelHash(layer.pixels, signal)
      const existing = blobs.get(hash)
      if (existing) {
        if (!sameScenePixelBytes(existing, layer.pixels))
          throw new SceneBlobError(
            'integrity',
            'Duas camadas têm a mesma referência e pixels diferentes.',
          )
      } else blobs.set(hash, layer.pixels)
      layers.push({
        ...layer,
        pixels: {
          kind: 'scene-pixels',
          algorithm: 'sha256',
          hash,
          byteLength: layer.pixels.byteLength,
        },
      })
    }
    images.push({ ...image, layers })
  }
  signal?.throwIfAborted()
  return {
    manifest: {
      formatVersion: 2,
      storageVersion: 2,
      kind: 'molda-scene-storage',
      id: document.id,
      document: { ...document, images },
    },
    blobs,
    logicalBytes,
  }
}

export async function hydrateSceneStorage(
  raw: unknown,
  blobs: ReadonlyMap<string, unknown>,
  signal?: AbortSignal,
): Promise<MoldaSceneDocument> {
  signal?.throwIfAborted()
  const manifest = readSceneStorageManifest(raw)
  const sources = new Map<string, Uint8Array>()
  // Validate the entire referenced set before copying. Do not visit opaque/unreferenced entries.
  for (const image of manifest.document.images)
    for (const { pixels } of image.layers) {
      if (sources.has(pixels.hash)) continue
      if (!blobs.has(pixels.hash))
        throw new SceneBlobError('missing', 'Faltam pixels nesta cópia guardada.')
      const source = blobs.get(pixels.hash)
      checkScenePixelBytes(source, pixels.byteLength)
      sources.set(pixels.hash, source)
    }
  const captured = new Map([...sources].map(([hash, bytes]) => [hash, new Uint8Array(bytes)]))
  for (const [hash, pixels] of captured)
    if ((await scenePixelHash(pixels, signal)) !== hash)
      throw new SceneBlobError('integrity', 'Os pixels guardados não correspondem à criação.')
  signal?.throwIfAborted()
  const document = requireStructure(
    readSceneDocument({
      ...manifest.document,
      images: manifest.document.images.map((image) => ({
        ...image,
        layers: image.layers.map((layer) => ({
          ...layer,
          pixels: captured.get(layer.pixels.hash),
        })),
      })),
    }),
  )
  signal?.throwIfAborted()
  return document
}
