import { beforeEach, describe, expect, test } from 'bun:test'
import {
  createMoldaPersistence,
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
})
