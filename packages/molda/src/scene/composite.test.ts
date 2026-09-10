import { describe, expect, test } from 'bun:test'
import { hexToRgb } from '../core/color'
import { resolvePaletteColors } from '../core/sanitize'
import { makeModel } from '../testing/fixtures'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import type { SceneImage } from './document'
import { migrateLegacyModel } from './migrateLegacy'

describe('canonical layer composition', () => {
  test('legacy indexed paint and transparent zero preserve exact colors over the base material', () => {
    const model = makeModel()
    const scene = migrateLegacyModel(model).document
    const palette = scenePalette(scene)
    const colors = resolvePaletteColors(model)
    for (const part of model.parts) {
      for (const [face, skin] of Object.entries(part.faces)) {
        if (!skin) throw new Error('Missing fixture skin')
        const image = scene.images.find((image) => image.id === `image:${part.id}:${face}`)
        const material = scene.materials.find((material) => material.colorImageId === image?.id)
        if (!image || !material) throw new Error('Missing paint')
        const rgba = compositeSceneImage(image, palette, sceneBaseColor(material, palette))
        for (let pixel = 0; pixel < skin.data.length; pixel++) {
          const index = skin.data[pixel] || part.color
          expect([...rgba.subarray(pixel * 4, pixel * 4 + 4)]).toEqual([
            ...hexToRgb(colors[index] ?? ''),
            255,
          ])
        }
      }
    }
  })

  test('RGBA layers blend bottom to top, respect layer opacity/visibility and do not multiply paint by base', () => {
    const image: SceneImage = {
      id: 'image',
      name: 'Pintura',
      width: 1,
      height: 1,
      encoding: 'rgba',
      layers: [
        {
          id: 'bottom',
          name: 'Fundo',
          visible: true,
          opacity: 1,
          pixels: new Uint8Array([255, 0, 0, 255]),
        },
        {
          id: 'top',
          name: 'Azul',
          visible: true,
          opacity: 0.5,
          pixels: new Uint8Array([0, 0, 255, 255]),
        },
        {
          id: 'hidden',
          name: 'Oculta',
          visible: false,
          opacity: 1,
          pixels: new Uint8Array([0, 255, 0, 255]),
        },
      ],
    }
    const original = structuredClone(image)
    expect([...compositeSceneImage(image, [], [0, 1, 0, 1])]).toEqual([128, 0, 128, 255])
    expect([...compositeSceneImage({ ...image, layers: image.layers.slice(1) }, [])]).toEqual([
      0, 0, 255, 128,
    ])
    expect(image).toEqual(original)
  })

  test('transparent RGB does not bleed; quantization happens only after all layers', () => {
    const image: SceneImage = {
      id: 'image',
      name: 'Pintura',
      width: 1,
      height: 1,
      encoding: 'rgba',
      layers: [
        {
          id: 'transparent',
          name: 'Vazia',
          visible: true,
          opacity: 1,
          pixels: new Uint8Array([255, 0, 0, 0]),
        },
        ...Array.from({ length: 20 }, (_, i) => ({
          id: `layer-${i}`,
          name: 'Azul',
          visible: true,
          opacity: 0.1,
          pixels: new Uint8Array([0, 0, 255, 1]),
        })),
      ],
    }
    expect([...compositeSceneImage(image, [])]).toEqual([
      0,
      0,
      255,
      Math.round((1 - (1 - 0.1 / 255) ** 20) * 255),
    ])
    expect([...compositeSceneImage({ ...image, layers: image.layers.slice(0, 1) }, [])]).toEqual([
      0, 0, 0, 0,
    ])
  })
})
