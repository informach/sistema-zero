import type { PintaCausalEntry } from '@sistemazero/core/creations/pinta-causal'
import { createRoot } from 'react-dom/client'
import {
  type PintaCausalCloud,
  PintaCausalRequestError,
} from '../../member-shell/src/lib/pinta-causal-cloud'
import { flushPintaCausalOutbox } from '../../member-shell/src/lib/pinta-causal-queue'
import { createCloudMirroredPintaPersistence } from '../../member-shell/src/lib/pinta-cloud-persistence'
import { PintaApp } from '../src/components/PintaApp'
import { pintaLocalRevisionOf } from '../src/core/localAssetOrigin'
import { createTilemapAsset, createTilesetAsset } from '../src/core/project'
import { createPintaCausalPersistence } from '../src/state/persistence'

export async function prepareRetainedRecovery() {
  const namespace = crypto.randomUUID()
  const local = createPintaCausalPersistence({ namespace })
  const sheet = createTilesetAsset({ name: 'pecas', tileSize: 8 })
  const map = createTilemapAsset({ name: 'vila', tilesetId: sheet.id, cols: 2, rows: 2 })
  const signal = new AbortController().signal
  const initial = await local.causal.encodeCandidates([sheet, map], signal)
  const next = await local.causal.encodeCandidates([{ ...sheet, name: 'pecas-da-conta' }], signal)
  const before: PintaCausalEntry[] = initial.puts.map((put) => ({
    ...put,
    revision: 1,
    coverage: 'certified',
    layoutRevision: put.itemId === sheet.id ? '1' : null,
  }))
  const entries: PintaCausalEntry[] = [
    { ...next.puts[0]!, revision: 2, coverage: 'certified', layoutRevision: '2' },
    before[1]!,
  ]
  await local.causal.applyPull(
    {
      fromEpoch: null,
      epoch: '1',
      transitions: [sheet, map].map((after, i) => ({
        id: after.id,
        before: null,
        beforeRevision: null,
        after,
        remote: before[i]!,
      })),
    },
    () => true,
  )
  const remote = await Promise.all(
    entries.map(async ({ itemId }) => ({
      itemId,
      bytes: [
        ...new Uint8Array(
          await (next.blobs.get(itemId) ?? initial.blobs.get(itemId))!.arrayBuffer(),
        ),
      ],
    })),
  )
  const snapshot = { epoch: '2', requiredFormat: 6, entries }
  const mirrored = makeRecoveryHost(namespace, snapshot, remote, true)
  try {
    const loadedSheet = await local.loadAssetById(sheet.id)
    const loadedMap = await local.loadAssetById(map.id)
    if (!loadedSheet || loadedMap?.kind !== 'tilemap') throw Error('Vila não apareceu no banco')
    await mirrored.persistence.persistAsset(
      { ...loadedMap, name: 'vila-autoral' },
      {
        resources: [{ id: sheet.id, localRevision: pintaLocalRevisionOf(loadedSheet) ?? null }],
      },
    )
    try {
      await flushPintaCausalOutbox({
        local: local.causal,
        cloud: mirrored.transport,
        reader: 6,
        signal,
      })
    } catch (error) {
      if (!(error instanceof Error) || error.message !== 'sem rede') throw error
    }
    const inflight = await local.causal.inFlight()
    const put = inflight?.sealed.intent.members[0]
    if (!inflight || put?.action !== 'put') throw Error('PUT não ficou em voo')
    return {
      namespace,
      sheetId: sheet.id,
      mapId: map.id,
      snapshot,
      remote,
      opId: inflight.sealed.intent.opId,
      sha256: put.sha256,
    }
  } finally {
    mirrored.persistence.dispose?.()
  }
}

function makeRecoveryHost(
  namespace: string,
  snapshot: NonNullable<Awaited<ReturnType<PintaCausalCloud['snapshot']>>>,
  remote: readonly { itemId: string; bytes: readonly number[] }[],
  offline = false,
) {
  const local = createPintaCausalPersistence({ namespace })
  const unexpected = () => {
    throw Error('Operação fora da prova de recuperação')
  }
  const transport: PintaCausalCloud = {
    snapshot: async () => snapshot,
    download: async ({ itemId }) =>
      new Uint8Array(remote.find((file) => file.itemId === itemId)!.bytes),
    verifyEpoch: async (epoch) => {
      if (epoch !== snapshot.epoch) unexpected()
    },
    backfill: unexpected,
    upload: async () => {
      if (offline) throw Error('sem rede')
      throw new PintaCausalRequestError(409, 'epoch-changed')
    },
    settle: async () => ({ state: 'aborted' }),
  }
  const persistence = createCloudMirroredPintaPersistence({
    local,
    viewerId: namespace,
    causal: {
      local: local.causal,
      holdOpen: async () => () => {},
      withClosed: (_, apply) => apply(),
    },
    cloud: {
      tool: 'pinta',
      supported: true,
      pintaCausal: transport,
      list: unexpected,
      upload: unexpected,
      peek: unexpected,
      remove: unexpected,
      download: unexpected,
      enqueueUpload: unexpected,
      enqueueRemove: unexpected,
      flush: unexpected,
      confirm: unexpected,
      getState: unexpected,
      getItemState: unexpected,
      subscribe: unexpected,
      subscribeItems: unexpected,
      dispose: () => {},
    },
  })
  return { persistence, transport }
}

export function mountRetainedRecoveryGallery(
  work: Awaited<ReturnType<typeof prepareRetainedRecovery>>,
) {
  const { persistence } = makeRecoveryHost(work.namespace, work.snapshot, work.remote)
  const root = document.createElement('div')
  document.body.replaceChildren(root)
  createRoot(root).render(<PintaApp persistence={persistence} />)
}
