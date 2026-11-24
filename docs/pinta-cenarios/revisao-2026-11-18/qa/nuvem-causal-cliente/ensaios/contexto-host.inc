import { beforeEach, expect, test } from 'bun:test'
import { pintaWriteFormatVersion } from '@sistemazero/core/creations'
import {
  type PintaCausalEntry,
  type PintaCausalIntent,
  pintaCausalIntentHash,
} from '@sistemazero/core/creations/pinta-causal'
import { pintaLocalRevisionOf } from '../../../pinta/src/core/localAssetOrigin'
import type { PintaAsset } from '../../../pinta/src/core/project'
import {
  createTilemapAsset,
  createTilesetAsset,
  isTileLayer,
  withPintaSchemaStamp,
} from '../../../pinta/src/core/project'
import { assetFromJson, assetToJson } from '../../../pinta/src/export/assetJson'
import { clearIdbMock } from '../../../pinta/src/testing/idbMock'
import { remapTilesetConsumers } from '../../../pinta/src/tiles/tilesetConsumers'
import { addTile, removeTile } from '../../../pinta/src/tiles/tilesetOps'
import type {
  CloudCreationSummary,
  CreationsCloud,
  SnapshotProducer,
  UploadedListener,
} from '../../src/lib/creations-cloud'
import { createMemorySyncedMarks } from '../../src/lib/creations-sync'
import { PintaCausalRequestError, pintaCausalGzipHash } from '../../src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox } from '../../src/lib/pinta-causal-queue'
import {
  createCloudMirroredPintaPersistence,
  createMemoryPintaFormatMemory,
} from '../../src/lib/pinta-cloud-persistence'

const { createPintaCausalPersistence, createPintaPersistence, PintaLocalConflictError } =
  await import('../../../pinta/src/state/persistence')
beforeEach(clearIdbMock)

async function cloudAsset(
  asset: PintaAsset,
  revision: number,
  layoutRevision: string | null = null,
) {
  const gzip = await new Response(
    new Blob([assetToJson(asset)]).stream().pipeThrough(new CompressionStream('gzip')),
  ).arrayBuffer()
  const entry: PintaCausalEntry = {
    itemId: asset.id,
    kind: asset.kind,
    name: asset.name,
    itemUpdatedAt: new Date(asset.updatedAt).toISOString(),
    formatVersion: pintaWriteFormatVersion(asset.kind),
    revision,
    sha256: await pintaCausalGzipHash(gzip),
    layoutRevision,
    bytes: gzip.byteLength,
    coverage: 'certified',
  }
  return { entry, gzip: new Uint8Array(gzip) }
}

function fakeCloud(
  remote: ReturnType<typeof createTilemapAsset>,
  revision: number,
  beforeDownload = async () => {},
) {
  const queued: string[] = []
  const producers = new Map<string, SnapshotProducer>()
  const acknowledgements = new Map<string, UploadedListener>()
  const summary: CloudCreationSummary = {
    itemId: remote.id,
    name: remote.name,
    kind: remote.kind,
    itemUpdatedAt: remote.updatedAt,
    revision,
    bytes: 1,
    thumb: null,
    syncedAt: remote.updatedAt,
    formatVersion: 4,
  }
  const unused = async (): Promise<never> => {
    throw new Error('Operação não solicitada')
  }
  const cloud: CreationsCloud = {
    tool: 'pinta',
    supported: true,
    list: async () => [summary],
    upload: unused,
    peek: async () => null,
    remove: unused,
    download: async () => {
      await beforeDownload()
      return { json: assetToJson(remote), summary, parts: [], fetchPart: unused }
    },
    enqueueUpload: (id, produce, onUploaded) => {
      queued.push(id)
      producers.set(id, produce)
      if (onUploaded) acknowledgements.set(id, onUploaded)
    },
    enqueueRemove: () => {},
    flush: async () => {},
    confirm: async () => {},
    getState: () => ({ status: 'idle', pending: 0, lastSavedAt: null, lastError: null }),
    getItemState: () => ({ status: 'idle', lastError: null, code: null }),
    subscribe: () => () => {},
    subscribeItems: () => () => {},
    dispose: () => {},
  }
  return { cloud, queued, producers, acknowledgements }
}
