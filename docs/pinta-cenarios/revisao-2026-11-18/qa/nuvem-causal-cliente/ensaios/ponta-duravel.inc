import { mock } from 'bun:test'
import { syncPintaCausalAccount } from '../../src/lib/pinta-causal-sync'

const kv = await import('../../../pinta/src/state/assetAuthorityDb')
const legacyEntry = process.env.PINTA_REVIEW_LEGACY_ENTRY!
mock.module(legacyEntry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({ ...kv }))
const { createPintaPersistence: legacyPersistence } = await import(legacyEntry)

function paint(sheet, color) {
  const tiles = structuredClone(sheet.tiles)
  tiles[0].data[0] = color
  return { ...sheet, tiles }
}

for (const state of ['expired', 'aborted', 'unknown']) {
  for (const mode of ['delete', 'overwrite', 'successor']) {
    test(`recuperação do último PUT por duas versões reais: ${state}, ${mode}`, async () => {
      const namespace = `put-${state}-${mode}`
      const local = createPintaCausalPersistence({ namespace })
      const sheet = createTilesetAsset({ name: 'pecas', tileSize: 8 })
      const base = await cloudAsset(sheet, 1, '1')
      const account = await cloudAsset(paint(sheet, 7), 2, '1')
      expect(
        await local.causal.applyPull(
          {
            fromEpoch: null,
            epoch: '1',
            transitions: [
              {
                id: sheet.id,
                before: null,
                beforeRevision: null,
                after: sheet,
                remote: base.entry,
              },
            ],
          },
          () => true,
        ),
      ).toBe(true)
      const signal = new AbortController().signal
      const attempts = new Set<string>()
      let offline = true
      const unused = async () => {
        throw Error('Operação inesperada')
      }
      const cloud = {
        snapshot: async () => ({ epoch: '2', requiredFormat: 6, entries: [account.entry] }),
        download: async () => account.gzip,
        backfill: unused,
        verifyEpoch: async () => {},
        upload: async (upload) => {
          attempts.add(upload.intent.opId)
          if (offline) throw Error('offline')
          if (state === 'unknown') throw new PintaCausalRequestError(404, 'not-found')
          throw new PintaCausalRequestError(409, 'operation-' + state)
        },
        settle: async () => ({ state }),
      }
      const room = createTilemapAsset({ name: 'sala', cols: 1, rows: 1, tilesetId: sheet.id })
      const wrapper = createCloudMirroredPintaPersistence({
        local,
        viewerId: namespace,
        cloud: { ...fakeCloud(room, 1).cloud, pintaCausal: cloud },
        causal: {
          local: local.causal,
          holdOpen: async () => () => {},
          withClosed: (_, run) => run(),
        },
      })
      try {
        await wrapper.persistAsset(paint(await local.loadAssetById(sheet.id), 3), { resources: [] })
        await expect(
          flushPintaCausalOutbox({ local: local.causal, cloud, reader: 6, signal }),
        ).rejects.toThrow('offline')
        if (mode === 'successor')
          await wrapper.persistAsset(paint(await local.loadAssetById(sheet.id), 4), {
            resources: [],
          })
      } finally {
        wrapper.dispose?.()
      }
      const older = legacyPersistence({ namespace })
      const loaded = await older.loadAssetById(sheet.id)
      if (mode === 'delete') await older.deleteAsset(sheet.id, loaded)
      else await older.persistAsset(paint(loaded, 5))
      offline = false
      const restart = createPintaCausalPersistence({ namespace })
      const original = await restart.causal.inFlight()
      const sync = (isOpen) =>
        syncPintaCausalAccount({
          local: restart.causal,
          cloud,
          reader: 6,
          signal,
          canContinue: () => true,
          isOpen,
          withClosed: (_, run) => run(),
        })
      await expect(sync((id) => id === sheet.id)).rejects.toThrow()
      expect((await restart.causal.inFlight()).sealed.intentHash).toBe(original.sealed.intentHash)
      expect((await restart.causal.inspect()).epoch).toBe('1')
      await expect(sync(() => false)).resolves.toMatchObject({ applied: true })
      const assets = await restart.listAllAssets()
      const official = assets.find((asset) => asset.id === sheet.id)
      expect(official.tiles[0].data[0]).toBe(7)
      const localCopies = assets.filter((asset) => asset.id !== sheet.id)
      const wanted = mode === 'successor' ? [3, 4, 5] : mode === 'overwrite' ? [3, 5] : [3]
      expect(localCopies.map((asset) => asset.tiles[0].data[0]).sort()).toEqual(wanted)
      const final = await restart.causal.inspect()
      expect(final.epoch).toBe('2')
      expect(final.sealed).toBeNull()
      expect(final.pending).toEqual([])
      expect(new Set(final.recovered.keys())).toEqual(new Set(localCopies.map((asset) => asset.id)))
      expect(final.confirmed.get(sheet.id)?.opId).toBeUndefined()
      expect(attempts).toEqual(new Set([original.sealed.intent.opId]))
    })
  }
}
