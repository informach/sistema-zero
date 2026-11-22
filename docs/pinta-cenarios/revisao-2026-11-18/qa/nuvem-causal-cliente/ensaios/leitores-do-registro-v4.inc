import { mock } from 'bun:test'
import { idbMockDb } from '../../../pinta/src/testing/idbMock'
import { PINTA_CAUSAL_OUTBOX_KEY } from '../../../pinta/src/state/assetAuthorityKeys'

const shared = await import('../../../pinta/src/state/assetAuthorityDb')
for (const [version, entry] of [
  [1, process.env.PINTA_REVIEW_LEGACY_ENTRY!],
  [2, process.env.PINTA_REVIEW_V2_ENTRY!],
] as const) {
  mock.module(entry.replace('persistence.ts', 'assetAuthorityDb.ts'), () => ({ ...shared }))
  const previous = await import(entry)
  test(`a versão 4 adota registro real v${version} e o leitor anterior recusa a escrita posterior`, async () => {
    const namespace = `registro-anterior-${version}`
    const older = previous.createPintaCausalPersistence({ namespace })
    await older.causal.applyPull({ fromEpoch: null, epoch: '0', transitions: [] }, () => true)
    const disk = idbMockDb('sistema-zero-pinta-' + namespace)
    expect(disk.get(PINTA_CAUSAL_OUTBOX_KEY).version).toBe(version)
    const local = createPintaCausalPersistence({ namespace })
    expect((await local.causal.inspect()).epoch).toBe('0')
    const sheet = createTilesetAsset({ name: 'pecas', tileSize: 8 })
    const room = createTilemapAsset({ name: 'quarto', cols: 1, rows: 1, tilesetId: sheet.id })
    const unused = async () => {
      throw Error('rede inesperada')
    }
    const wrapper = createCloudMirroredPintaPersistence({
      local,
      viewerId: namespace,
      cloud: {
        ...fakeCloud(room, 0).cloud,
        pintaCausal: {
          upload: unused,
          download: unused,
          backfill: unused,
          snapshot: unused,
          verifyEpoch: unused,
        },
      },
      causal: {
        local: local.causal,
        holdOpen: async () => () => {},
        withClosed: (_, run) => run(),
      },
    })
    try {
      await wrapper.persistAsset(sheet, { resources: [] })
      const state = await local.causal.inspect()
      expect(state.version).toBe(4)
      expect(state.pending).toHaveLength(1)
      await expect(older.causal.inspect()).rejects.toThrow()
      await expect(
        older.causal.applyPull(
          {
            fromEpoch: '0',
            epoch: '1',
            transitions: [],
          },
          () => true,
        ),
      ).rejects.toThrow()
      const latest = await local.causal.inspect()
      expect(latest.pending).toEqual(state.pending)
      expect(latest.epoch).toBe('0')
      expect(
        (await local.causal.retained(state.pending[0].opId))?.blobs.get(sheet.id)?.size,
      ).toBeGreaterThan(0)
    } finally {
      wrapper.dispose?.()
    }
  })
}
