import {
  PINTA_INVENTORY_READER_VERSION,
  pintaCanWriteNativeSchema,
} from '@sistemazero/core/creations'
import {
  PINTA_CAUSAL_LIMITS,
  type PintaCausalManifest,
  PintaCausalManifestSchema,
} from '@sistemazero/core/creations/pinta-causal'
import type { PintaMemoryAsset } from '../core/assetMemory'
import { utf8ByteLength } from '../core/jsonBytes'
import { embeddedTilesetOf } from '../core/mapResourceVersions'
import {
  isObjectLayer,
  isTileLayer,
  isTilesetKind,
  PINTA_MAX_SCHEMA,
  type PintaAssetReferenceRole,
  pintaAssetSchema,
  sanitizePintaAsset,
  type TilemapCells,
  tileLayerTilesetId,
  tilemapOfAsset,
  visitPintaAssetDependencies,
} from '../core/project'
import {
  decodeRegionMapDocument,
  decodeRegionSetDocument,
  encodeRegionMapDocument,
  encodeRegionSetDocument,
} from '../core/regionDocument'
import { pintaDoorSelectors } from '../core/sceneMapClosure'
import { cellTile } from '../tiles/cell'
import { createTileCellReader, mapCellBounds } from '../tiles/mapCells'
import {
  canReadPintaBackupEnvelope,
  decodePintaBackupAsset,
  encodePintaBackupAsset,
  envelopeVersionFor,
  MAX_BACKUP_FILE_BYTES,
} from './projectJson'
import { admitsRegionBackupBuffers, REGION_BACKUP_VERSION } from './regionBackup'

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : null
}

/** Compare the JSON the writer would emit, including presence of fields and array order. */
function matchesEncoding(value: unknown, encoded: unknown): boolean {
  if (value === encoded) return true
  if (Array.isArray(value) || Array.isArray(encoded))
    return (
      Array.isArray(value) &&
      Array.isArray(encoded) &&
      value.length === encoded.length &&
      value.every((element, index) => matchesEncoding(element, encoded[index]))
    )
  const original = record(value)
  const canonical = record(encoded)
  if (!original || !canonical) return false
  let writtenKeys = 0
  for (const [key, data] of Object.entries(canonical)) {
    // The native writer's JSON.stringify omits an undefined optional object field.
    if (data === undefined) continue
    writtenKeys++
    if (!Object.hasOwn(original, key) || !matchesEncoding(original[key], data)) return false
  }
  return writtenKeys === Object.keys(original).length
}

/** The old writer did not store a platform array; its reader defined every slot as false. */
function encodedWithLegacyPlatform(raw: JsonRecord, encoded: JsonRecord): JsonRecord {
  if (!Object.hasOwn(raw, 'platform') && Array.isArray(encoded.platform)) {
    const { platform, ...rest } = encoded
    if (platform.every((value) => value === false)) return rest
  }
  return encoded
}

function matchesAssetEncoding(raw: JsonRecord, encoded: JsonRecord, regional: boolean): boolean {
  if (matchesEncoding(raw, encoded)) return true
  if (regional) return false
  switch (raw.kind) {
    case 'tileset':
    case 'vector-tileset':
      return matchesEncoding(raw, encodedWithLegacyPlatform(raw, encoded))
    case 'map-set': {
      const rawMap = record(raw.map)
      const canonicalMap = record(encoded.map)
      if (!rawMap || !canonicalMap) return false
      const { map: _rawMap, ...rawSet } = raw
      const { map: _canonicalMap, ...canonicalSet } = encoded
      return (
        matchesEncoding(rawSet, canonicalSet) && matchesAssetEncoding(rawMap, canonicalMap, false)
      )
    }
    case 'tilemap': {
      const { resources: rawVersions, ...rawMap } = raw
      const { resources: canonicalVersions, ...canonicalMap } = encoded
      if (!Array.isArray(rawVersions) || !Array.isArray(canonicalVersions)) return false
      if (rawVersions.length !== canonicalVersions.length) return false
      return (
        matchesEncoding(rawMap, canonicalMap) &&
        rawVersions.every((value, index) => {
          const authorialVersion = record(value)
          const canonicalVersion = record(canonicalVersions[index])
          if (!authorialVersion || !canonicalVersion) return false
          const { asset: rawAsset, ...rawFields } = authorialVersion
          const { asset: canonicalAsset, ...canonicalFields } = canonicalVersion
          const original = record(rawAsset)
          const reconstructed = record(canonicalAsset)
          return (
            !!original &&
            !!reconstructed &&
            matchesEncoding(rawFields, canonicalFields) &&
            matchesAssetEncoding(original, reconstructed, false)
          )
        })
      )
    }
    default:
      return false
  }
}

function nestedSchemaIsKnown(encoded: JsonRecord, ceiling: number): boolean {
  if (Object.hasOwn(encoded, 'schema')) {
    if (
      typeof encoded.schema !== 'number' ||
      !Number.isSafeInteger(encoded.schema) ||
      encoded.schema < 0 ||
      encoded.schema > ceiling
    )
      return false
  }
  if (encoded.kind === 'map-set') {
    const map = record(encoded.map)
    return !!map && map.kind === 'tilemap' && nestedSchemaIsKnown(map, ceiling)
  }
  if (encoded.kind !== 'tilemap' || encoded.resources === undefined) return true
  return (
    Array.isArray(encoded.resources) &&
    encoded.resources.every((version) => {
      const snapshot = record(record(version)?.asset)
      return (
        !!snapshot &&
        snapshot.kind !== 'tilemap' &&
        snapshot.kind !== 'map-set' &&
        nestedSchemaIsKnown(snapshot, PINTA_MAX_SCHEMA)
      )
    })
  )
}

type CausalReference = PintaCausalManifest['refs'][number]

function referencesOf(asset: PintaMemoryAsset): CausalReference[] {
  const dependencies = new Map<
    string,
    {
      id: string
      roles: Set<PintaAssetReferenceRole>
      bits?: Uint8Array
      implicitArtSlotZero?: true
    }
  >()
  visitPintaAssetDependencies(asset, (id, role) => {
    const known = dependencies.get(id)
    if (known) known.roles.add(role)
    else {
      if (dependencies.size >= PINTA_CAUSAL_LIMITS.readEdges)
        throw new RangeError('Limite de referências do manifesto excedido')
      dependencies.set(id, { id, roles: new Set([role]) })
    }
  })

  function mark(id: string, tile: number): void {
    const ref = dependencies.get(id)
    if (!ref) return
    if (tile < 0 || tile >= PINTA_CAUSAL_LIMITS.tiles) throw new RangeError('Índice fora da folha')
    ref.bits ??= new Uint8Array(PINTA_CAUSAL_LIMITS.tiles / 8)
    const bits = ref.bits
    const byte = tile >> 3
    bits[byte] = bits[byte]! | (1 << (tile & 7))
  }

  const map = tilemapOfAsset(asset)
  if (map) {
    const bounds = mapCellBounds(map)
    for (const layer of map.layers) {
      if (isTileLayer<TilemapCells>(layer)) {
        const id = tileLayerTilesetId(map, layer)
        if (dependencies.has(id))
          createTileCellReader(layer.cells, bounds).visitOccupied(bounds, (cell) =>
            mark(id, cellTile(cell)),
          )
      } else if (isObjectLayer(layer)) {
        for (const { art } of layer.objects) {
          if (!art) continue
          if (art.tile !== undefined) mark(art.assetId, art.tile)
          else {
            const ref = dependencies.get(art.assetId)
            if (ref) ref.implicitArtSlotZero = true
          }
        }
      }
    }
  }
  return [...dependencies.keys()].sort().map((id) => {
    const { roles, bits, implicitArtSlotZero } = dependencies.get(id)!
    return {
      id,
      roles: [...roles].sort(),
      ...(bits
        ? { indices: Array.from(bits, (byte) => byte.toString(16).padStart(2, '0')).join('') }
        : {}),
      ...(implicitArtSlotZero ? { implicitArtSlotZero } : {}),
    }
  })
}

interface DecodedDocument {
  asset: PintaMemoryAsset
  encoded: unknown
  requiredNativeSchema: number
}

function decodeDocument(
  raw: JsonRecord,
  backupVersion: number,
  regional: boolean,
): DecodedDocument | null {
  const decoded = decodePintaBackupAsset(raw, true)
  if (regional) {
    if (raw.kind === 'tilemap') {
      const asset = decodeRegionMapDocument(decoded)
      return (
        asset && {
          asset,
          encoded: encodeRegionMapDocument(asset, encodePintaBackupAsset),
          requiredNativeSchema: REGION_BACKUP_VERSION,
        }
      )
    }
    if (raw.kind === 'map-set') {
      const asset = decodeRegionSetDocument(decoded)
      return (
        asset && {
          asset,
          encoded: encodeRegionSetDocument(asset, encodePintaBackupAsset),
          requiredNativeSchema: REGION_BACKUP_VERSION,
        }
      )
    }
    return null
  }
  const asset = sanitizePintaAsset(decoded)
  if (!asset || backupVersion < envelopeVersionFor([asset])) return null
  return {
    asset,
    encoded: encodePintaBackupAsset(asset),
    requiredNativeSchema: pintaAssetSchema(asset),
  }
}

export interface PintaCausalDocument {
  asset: PintaMemoryAsset
  manifest: PintaCausalManifest
}

export interface PintaCausalDocumentExpectation {
  itemId: string
  kind: string
  formatVersion: number
  /** Private codec admission for local qualification. The cloud writer does not select it. */
  allowRegions?: boolean
}

/** Reads one exact native backup entry, or leaves its bytes opaque for recovery. */
export function inspectPintaCausalDocument(
  text: string,
  expected: PintaCausalDocumentExpectation,
): PintaCausalDocument | null {
  if (
    !Number.isSafeInteger(expected.formatVersion) ||
    expected.formatVersion < 1 ||
    expected.formatVersion > PINTA_INVENTORY_READER_VERSION ||
    text.length > MAX_BACKUP_FILE_BYTES ||
    utf8ByteLength(text) > MAX_BACKUP_FILE_BYTES
  )
    return null
  try {
    const doc = record(JSON.parse(text))
    if (
      doc?.format !== 'pinta-gallery' ||
      typeof doc.version !== 'number' ||
      !Number.isSafeInteger(doc.version) ||
      !Array.isArray(doc.assets) ||
      doc.assets.length !== 1 ||
      Object.keys(doc).length !== 3
    )
      return null

    const regional = doc.version === REGION_BACKUP_VERSION && expected.allowRegions === true
    if (!regional && !canReadPintaBackupEnvelope(doc.version)) return null
    const raw = record(doc.assets[0])
    const cap = regional ? REGION_BACKUP_VERSION : PINTA_MAX_SCHEMA
    if (
      !raw ||
      raw.id !== expected.itemId ||
      raw.kind !== expected.kind ||
      !nestedSchemaIsKnown(raw, cap) ||
      !admitsRegionBackupBuffers([raw])
    )
      return null

    const decoded = decodeDocument(raw, doc.version, regional)
    if (!decoded || decoded.asset.kind !== raw.kind || decoded.asset.id !== raw.id) return null
    const { asset, requiredNativeSchema } = decoded
    const encoded = record(decoded.encoded)
    const nativeSchema = typeof raw.schema === 'number' ? raw.schema : 0
    const readsSchema = regional
      ? nativeSchema === requiredNativeSchema
      : pintaCanWriteNativeSchema(
          Math.max(nativeSchema, requiredNativeSchema),
          expected.formatVersion,
        )
    if (!readsSchema || !encoded || !matchesAssetEncoding(raw, encoded, regional)) return null

    const map = tilemapOfAsset(asset)
    const privateDefault = map && embeddedTilesetOf(map)
    const result = PintaCausalManifestSchema.safeParse({
      version: 1,
      itemId: asset.id,
      name: asset.name,
      kind: asset.kind,
      nativeSchema,
      backupVersion: doc.version,
      requiredNativeSchema,
      refs: referencesOf(asset),
      doorSelectors: [...new Set(pintaDoorSelectors(asset))].sort(),
      ...(isTilesetKind(asset)
        ? { sheet: { tileSize: asset.tileSize, count: asset.tiles.length } }
        : {}),
      ...(privateDefault
        ? {
            embeddedDefaultLayout: { kind: privateDefault.kind, tileSize: privateDefault.tileSize },
          }
        : {}),
    })
    return result.success ? { asset, manifest: result.data } : null
  } catch {
    return null
  }
}
