import { describe, expect, test } from 'bun:test'
import {
  assetFromJson,
  createLessonAsset,
  pintaAssetFromWire,
  pintaAssetToWire,
} from '@sistemazero/pinta/assets'
import { preparePintaDownload } from '../src/lib/pinta-download'

describe('download da entrega Pinta', () => {
  test('restaura o asset wire antes de gerar um .pinta.json importável', () => {
    const asset = createLessonAsset('pixel-sprite', 16, 'meu-heroi')
    if (asset.kind !== 'pixel-sprite') throw new Error('fixture inválida')
    const firstCel = asset.animations[0]?.frames[0]?.[0]
    if (firstCel) firstCel.data[0] = 9
    const wire = JSON.parse(JSON.stringify(pintaAssetToWire(asset)))

    const download = preparePintaDownload(wire)

    expect(download?.filename).toBe('meu-heroi.pinta.json')
    const restored = assetFromJson(download?.content ?? '').asset
    expect(pintaAssetFromWire(wire)).not.toBeNull()
    expect(restored).toEqual(asset)
  })

  test('recusa payload ilegível sem produzir arquivo corrompido', () => {
    expect(preparePintaDownload({ kind: 'pixel-sprite' })).toBeNull()
  })
})
