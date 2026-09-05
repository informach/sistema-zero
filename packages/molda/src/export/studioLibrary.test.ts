import { beforeEach, describe, expect, spyOn, test } from 'bun:test'
import {
  createMoldaPersistence,
  getDefaultMoldaPersistence,
  resetMoldaPersistenceForTests,
  setMoldaStorageNamespace,
} from '../state/persistence'
import { makeModel, makeSky, makeTexture } from '../testing/fixtures'
import { clearIdbMock } from '../testing/idbMock'
import { exportAssetForStudio, listGalleryForStudio } from './studioLibrary'

beforeEach(() => {
  clearIdbMock()
  resetMoldaPersistenceForTests()
  setMoldaStorageNamespace('estudio')
})

describe('studio-library', () => {
  test('lista e exporta o modelo como model3d validável pelo Estúdio', async () => {
    const persistence = createMoldaPersistence({ namespace: 'estudio' })
    await persistence.saveMany([makeModel({ thumb: 'data:image/jpeg;base64,AAAA' }), makeSky()])
    const list = await listGalleryForStudio()
    expect(list.map((item) => item.id).sort()).toEqual(['model-1', 'sky-1'])
    expect(list.find((item) => item.id === 'model-1')?.thumbDataUrl).toBe(
      'data:image/jpeg;base64,AAAA',
    )
    const exported = await exportAssetForStudio('model-1')
    expect(exported.ok).toBe(true)
    if (!exported.ok) return
    expect(exported.asset.kind).toBe('model3d')
    expect(exported.asset.originalFileName).toBe('nave.glb')
    expect(exported.asset.dataUrl.startsWith('data:model/gltf-binary;base64,')).toBe(true)
    expect(exported.asset.bytes).toBeGreaterThan(100)
    const sky = await exportAssetForStudio('sky-1')
    expect(sky.ok).toBe(true)
    if (sky.ok) {
      expect(sky.asset.kind).toBe('environment3d')
      expect(sky.asset.originalFileName).toBe('fim-de-tarde.hdr')
      expect(sky.asset.dataUrl.startsWith('data:image/vnd.radiance;base64,')).toBe(true)
    }
    await persistence.save(makeTexture())
    const texture = await exportAssetForStudio('texture-1')
    expect(texture.ok).toBe(true)
    if (texture.ok) {
      expect(texture.asset.kind).toBe('image')
      expect(texture.asset.originalFileName).toBe('grama.png')
      expect(texture.asset.dataUrl.startsWith('data:image/png;base64,')).toBe(true)
      expect(texture.asset.width).toBe(16)
      expect(texture.asset.height).toBe(16)
    }
    expect(await exportAssetForStudio('nope')).toEqual({ ok: false, reason: 'not-found' })
  })

  test('exporta por carga pontual e reaproveita o resultado enquanto updatedAt não muda', async () => {
    const persistence = getDefaultMoldaPersistence()
    await persistence.save(makeModel())
    const loadAll = spyOn(persistence, 'loadAll')
    const load = spyOn(persistence, 'load')

    const first = await exportAssetForStudio('model-1')
    const cached = await exportAssetForStudio('model-1')
    expect(first.ok).toBe(true)
    expect(cached).not.toBe(first)
    expect(cached.ok && first.ok && cached.asset.dataUrl).toBe(first.ok && first.asset.dataUrl)
    expect(loadAll).toHaveBeenCalledTimes(0)
    expect(load).toHaveBeenCalledTimes(2)

    await persistence.save(makeModel({ name: 'nave-nova', updatedAt: 2 }))
    const changed = await exportAssetForStudio('model-1')
    expect(changed).not.toBe(first)
    expect(changed.ok && changed.asset.originalFileName).toBe('nave-nova.glb')
  })

  test('cache reaproveita só o binário e sempre combina nome/miniatura do registro recém-lido', async () => {
    const persistence = getDefaultMoldaPersistence()
    await persistence.save(
      makeModel({ updatedAt: 7, name: 'nave-a', thumb: 'data:image/jpeg;base64,AAAA' }),
    )
    const first = await exportAssetForStudio('model-1')
    await persistence.save(
      makeModel({ updatedAt: 7, name: 'nave-b', thumb: 'data:image/jpeg;base64,BBBB' }),
    )
    const second = await exportAssetForStudio('model-1')

    expect(first.ok && second.ok && second.asset.dataUrl).toBe(first.ok && first.asset.dataUrl)
    expect(second.ok && second.asset.originalFileName).toBe('nave-b.glb')
    expect(second.ok && second.asset.thumbDataUrl).toBe('data:image/jpeg;base64,BBBB')
  })
})
