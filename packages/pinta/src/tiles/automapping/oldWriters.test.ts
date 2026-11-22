import { expect, test } from 'bun:test'
import { createRegionPintaPersistence } from '../../state/localRegionPersistence'
import { createPintaCausalPersistence, createPintaPersistence } from '../../state/persistence'
import { automapFixture } from '../../testing/automapFixture'
import { idbMockDb } from '../../testing/idbMock'

test('gravações pelas autoridades atuais 0–7, regional 8 e causal recusam 9/99 sem alterar nem os espelhos', async () => {
  for (const [kind, create] of [
    ['legado', createPintaPersistence],
    ['regional', createRegionPintaPersistence],
    ['nuvem', createPintaCausalPersistence],
  ] as const) {
    const namespace = `regra-versao-${kind}`,
      local = create({ namespace })
    const { sheet, map, book } = await automapFixture()
    await local.persistAssets([sheet, map])
    const saved = await local.loadAssetById(map.id)
    if (saved?.kind !== 'tilemap') throw Error('saved')
    const db = idbMockDb(`sistema-zero-pinta-${namespace}`)
    const before = structuredClone([...db])
    for (const schema of [9, 99]) {
      await expect(
        local.persistAsset({ ...map, schema, automapping: book } as typeof map),
      ).rejects.toThrow()
      expect([...db]).toEqual(before)
      expect((await local.loadAssetById(map.id))?.name).toBe(saved.name)
    }
  }
})
