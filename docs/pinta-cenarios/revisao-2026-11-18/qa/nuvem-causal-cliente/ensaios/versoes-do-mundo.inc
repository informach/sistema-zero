import { mock } from 'bun:test'
import { isObjectLayer } from '../../../pinta/src/core/project'
import { pintaDoorBindings } from '../../../pinta/src/core/sceneMapClosure'
import { createMapObject } from '../../../pinta/src/tiles/mapObjects'
import { addObjectLayer } from '../../../pinta/src/tiles/tilemapOps'
import { setIdbWriteGuard } from '../../../pinta/src/testing/idbMock'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'

const sharedIdb = await import('../../../pinta/src/state/assetAuthorityDb')
const legacyEntry = process.env.PINTA_REVIEW_LEGACY_ENTRY!
mock.module(legacyEntry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({ ...sharedIdb }))
const { createPintaPersistence: legacyPersistence } = await import(legacyEntry)

function colored(sheet, value) {
  const tiles = structuredClone(sheet.tiles)
  tiles[0].data[0] = value
  return { ...sheet, tiles }
}

for (const basis of ['sealed', 'unbased']) {
  for (const change of [
    'sheet',
    'group',
    'indirect',
    ...(basis === 'sealed' ? ['external-available', 'external-missing'] : []),
  ]) {
    test(`porta e peça em cada versão da vila após escritor antigo: ${basis}, ${change}`, async () => {
      const namespace = `mundo-${basis}-${change}`
      const local = createPintaCausalPersistence({ namespace })
      const legacy = legacyPersistence({ namespace })
      const sheet = colored(createTilesetAsset({ name: 'pecas', tileSize: 8 }), 1)
      const external = change.startsWith('external-')
      const map = (name) => createTilemapAsset({ name, cols: 1, rows: 1, tilesetId: sheet.id })
      const cabin = map('cabana')
      const floor = colored(createTilesetAsset({ name: 'chao', tileSize: 8 }), 2)
      const indirect = change === 'indirect'
      const village = addObjectLayer(
        { ...map('vila'), ...(indirect ? { tilesetId: floor.id } : {}) },
        'portas',
      )
      village.layers.find(isObjectLayer).objects.push(
        createMapObject({
          id: 'porta',
          role: 'door',
          properties: { destino: cabin.name },
        }),
      )
      for (const room of [village, cabin]) room.layers.find(isTileLayer).cells[0] = 0
      const originals = [sheet, cabin, village, ...(indirect ? [floor] : [])]
      const encode = (assets, revision) =>
        Promise.all(
          assets.map((asset) => cloudAsset(asset, revision, asset.kind === 'tileset' ? '1' : null)),
        )
      const initial = await encode(originals, 1)
      if (basis === 'sealed') {
        expect(
          await local.causal.applyPull(
            {
              fromEpoch: null,
              epoch: '1',
              transitions: originals.map((after, i) => ({
                id: after.id,
                before: null,
                beforeRevision: null,
                after,
                remote: initial[i].entry,
              })),
            },
            () => true,
          ),
        ).toBe(true)
      } else {
        await legacy.persistAssets(originals)
      }
      const official = [
        colored(sheet, 7),
        cabin,
        { ...village, name: 'vila-conta' },
        ...(indirect ? [floor] : []),
      ]
      const remote = await encode(official, 2)
      if (change === 'external-available') remote[0] = initial[0]
      const unused = async () => {
        throw Error('Operação inesperada')
      }
      let offline = true
      const cloud = {
        snapshot: async () => ({
          epoch: '2',
          requiredFormat: 6,
          entries: remote.map((x) => x.entry),
        }),
        download: async ({ itemId }) => remote.find((x) => x.entry.itemId === itemId)!.gzip,
        verifyEpoch: async () => {},
        backfill: unused,
        upload: async () => {
          if (offline) throw Error('offline')
          throw new PintaCausalRequestError(409, 'epoch-changed')
        },
        settle: async () => ({ state: 'unknown' }),
      }
      const host = createCloudMirroredPintaPersistence({
        local,
        cloud: { ...fakeCloud(village, 1).cloud, pintaCausal: cloud },
        viewerId: namespace,
        causal: {
          local: local.causal,
          holdOpen: async () => () => {},
          withClosed: (_, apply) => apply(),
        },
      })
      const signal = new AbortController().signal
      try {
        const [s, c, v, f] = await Promise.all(originals.map(({ id }) => local.loadAssetById(id)))
        await host.persistAssets(
          [
            ...(external ? [] : [colored(s, 3)]),
            { ...c, updatedAt: c.updatedAt + 1 },
            { ...v, name: 'vila-autora' },
            ...(indirect ? [{ ...f, updatedAt: f.updatedAt + 1 }] : []),
          ],
          {
            resources: [s, c, ...(indirect ? [f] : [])].map((asset) => ({
              id: asset.id,
              localRevision: pintaLocalRevisionOf(asset),
            })),
          },
        )
        if (basis === 'sealed') {
          await expect(
            flushPintaCausalOutbox({ local: local.causal, reader: 6, signal, cloud }),
          ).rejects.toThrow('offline')
          expect((await local.causal.inFlight()).blobs.size).toBe(
            originals.length - Number(external),
          )
        }
      } finally {
        host.dispose?.()
      }

      const [s, , v] = await Promise.all(originals.map(({ id }) => legacy.loadAssetById(id)))
      if (change !== 'group') await legacy.persistAsset(colored(s, 5))
      else await legacy.persistAssets([colored(s, 5), { ...v, name: 'vila-antiga' }])
      offline = false
      const reopened = createPintaCausalPersistence({ namespace })
      const sync = () =>
        syncPintaCausalAccount({
          cloud,
          local: reopened.causal,
          reader: 6,
          signal,
          canContinue: () => true,
          isOpen: () => false,
          withClosed: (_, apply) => apply(),
        })
      if (change === 'external-missing') {
        const before = await reopened.causal.inFlight()
        await expect(sync()).rejects.toThrow()
        const after = await reopened.causal.inFlight()
        expect(after?.sealed.intentHash).toBe(before.sealed.intentHash)
        for (const [id, blob] of before.blobs)
          expect(await after.blobs.get(id).arrayBuffer()).toEqual(await blob.arrayBuffer())
        expect((await reopened.causal.inspect()).epoch).toBe('1')
        expect((await reopened.loadAssetById(sheet.id)).tiles[0].data[0]).toBe(5)
        return
      }
      setIdbWriteGuard((key, data) => {
        if (
          typeof key === 'string' &&
          key.startsWith('pinta:asset:') &&
          data?.kind === 'tilemap' &&
          data.name.includes('-copia')
        )
          throw Error('gravação da cópia interrompida')
      })
      try {
        await expect(sync()).rejects.toThrow('gravação da cópia interrompida')
      } finally {
        setIdbWriteGuard(null)
      }
      const unsettled = await reopened.causal.inspect()
      expect(unsettled.epoch).toBe(basis === 'sealed' ? '1' : null)
      expect(await reopened.listAllAssets()).toHaveLength(originals.length)
      await expect(sync()).resolves.toMatchObject({ applied: true })
      const assets = await reopened.listAllAssets()
      const catalog = new Map(assets.map((asset) => [asset.id, asset]))
      const houses = assets.filter(
        (asset) => asset.kind === 'tilemap' && asset.name.startsWith('vila'),
      )
      const worlds = houses.map((house) => {
        const binding = pintaDoorBindings(house, catalog)[0]?.binding
        const linked = binding?.type === 'target' && catalog.get(binding.id)
        return [
          catalog.get(house.tilesetId)?.tiles[0].data[house.layers.find(isTileLayer).cells[0]],
          linked &&
            catalog.get(linked.tilesetId)?.tiles[0].data[linked.layers.find(isTileLayer).cells[0]],
        ]
      })
      expect(worlds.sort()).toEqual(
        indirect
          ? [
              [2, 3],
              [2, 5],
              [2, 7],
            ]
          : external
            ? [
                [1, 1],
                [1, 1],
                [5, 5],
              ]
            : [
                [3, 3],
                [5, 5],
                [7, 7],
              ],
      )
      expect(catalog.get(village.id).name).toBe('vila-conta')
      const settled = await reopened.causal.inspect()
      expect(settled.confirmed.get(village.id)?.opId).toBeUndefined()
      expect(settled.pending).toEqual([])
      expect(settled.sealed).toBeNull()
      expect(settled.unbased).toBeUndefined()
    })
  }
}
