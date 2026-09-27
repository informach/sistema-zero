import { describe, expect, test } from 'bun:test'
import { hexToRgb } from '../core/color'
import { PALETTE_SIZE } from '../core/palette'
import { resolvePaletteColors } from '../core/sanitize'
import { makeModel, makeTexture, paintedSkin } from '../testing/fixtures'
import { sampleTextureSkin, textureColors } from '../texture/ops'
import { addScenePrimitive } from './commands'
import { scenePalette } from './composite'
import type { MoldaSceneDocument } from './document'
import { sceneToJson } from './documentJson'
import { convertSceneImageRgba } from './imageOperations'
import type { ScenePaintTarget } from './imagePaint'
import { migrateLegacyModel } from './migrateLegacy'
import { sceneFaceViewSize, sceneFaceViewTexel, scenePaintFaceView } from './paintFaceView'
import { ensureScenePaintSurface } from './paintSurface'
import { dressScenePaintTarget, dressScenePiece } from './pieceTexture'
import { readSceneDocument } from './readDocument'

const BOX_FACES = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const

function prepared() {
  let n = 0
  const nextId = () => `id${++n}`
  const base = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    'box',
    'caixa',
    nextId,
  )
  const nodeId = base.nodes.at(-1)!.id
  const result = ensureScenePaintSurface(base, { nodeId }, nextId)
  if (result.status !== 'ready') throw new Error('Esperava pronto.')
  return { document: result.document, target: result.target }
}

function parts(document: MoldaSceneDocument, target: ScenePaintTarget) {
  const node = document.nodes.find((entry) => entry.id === target.nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  const geometry = document.geometries.find((entry) => entry.id === node.geometryId)!
  const image = document.images.find((entry) => entry.id === target.imageId)!
  return { geometry, image, pixels: image.layers[0]!.pixels }
}

/** O índice que a cor da textura ganha no documento: o mesmo hex, na paleta dele. */
function expectedIndex(document: MoldaSceneDocument, hex: string | undefined) {
  return hex ? resolvePaletteColors(document).indexOf(hex) : 0
}

describe('vestir a peça com uma textura', () => {
  test('Repetir veste cada face em pé: a linha de cima da textura em cima da face', () => {
    const { document, target } = prepared()
    const texture = makeTexture()
    const dressed = dressScenePaintTarget(document, target, texture, 'tile')
    expect(readSceneDocument(sceneToJson(dressed)).status).toBe('valid')
    const { geometry, image, pixels } = parts(dressed, target)
    const colors = textureColors(texture)
    const covered = new Set<number>()
    for (const key of BOX_FACES) {
      const view = scenePaintFaceView(geometry, key, image)!
      const { width, height } = sceneFaceViewSize(view)
      for (let row = 0; row < height; row++)
        for (let column = 0; column < width; column++) {
          const [x, y] = sceneFaceViewTexel(view, column, row)
          const value = texture.bitmap.data[(row % 16) * 16 + (column % 16)]!
          expect(pixels[y * image.width + x], `${key} ${column},${row}`).toBe(
            value ? expectedIndex(dressed, colors[value]) : 0,
          )
          covered.add(y * image.width + x)
        }
    }
    // A folga entre as faces fica como estava.
    const before = parts(document, target).pixels
    for (let i = 0; i < pixels.length; i++) if (!covered.has(i)) expect(pixels[i]).toBe(before[i]!)
  })

  test('Esticar amostra a textura inteira em cada face, pelo vizinho mais próximo', () => {
    const { document, target } = prepared()
    const texture = makeTexture()
    const dressed = dressScenePaintTarget(document, target, texture, 'stretch')
    const { geometry, image, pixels } = parts(dressed, target)
    const colors = textureColors(texture)
    const view = scenePaintFaceView(geometry, 'pz', image)!
    const { width, height } = sceneFaceViewSize(view)
    const skin = sampleTextureSkin(texture, width, height, 'stretch')
    for (let row = 0; row < height; row++)
      for (let column = 0; column < width; column++) {
        const [x, y] = sceneFaceViewTexel(view, column, row)
        const value = skin.data[row * width + column]!
        expect(pixels[y * image.width + x]).toBe(value ? expectedIndex(dressed, colors[value]) : 0)
      }
  })

  test('cor que o modelo não tem vira extra; sem vaga, a mais parecida', () => {
    const { document, target } = prepared()
    const texture = makeTexture({
      extraColors: ['#123456'],
      bitmap: paintedSkin(16, 16, () => PALETTE_SIZE),
    })
    const dressed = dressScenePaintTarget(document, target, texture, 'tile')
    const index = resolvePaletteColors(document).length
    expect(dressed.extraColors).toEqual([...(document.extraColors ?? []), '#123456'])
    expect(parts(dressed, target).pixels.includes(index)).toBe(true)
    // Com as 48 extras ocupadas, nenhuma entra: a textura usa a cor mais parecida.
    const full: MoldaSceneDocument = {
      ...document,
      extraColors: Array.from({ length: 48 }, (_, i) => `#${(i + 0x200000).toString(16)}`),
    }
    const near = dressScenePaintTarget(full, target, texture, 'tile')
    expect(near.extraColors).toEqual(full.extraColors)
    const palette = resolvePaletteColors(full)
    const used = parts(near, target).pixels.find((value) => value > 0)!
    const distance = (hex: string) => {
      const [r, g, b] = hexToRgb(hex)
      return (r - 0x12) ** 2 + (g - 0x34) ** 2 + (b - 0x56) ** 2
    }
    const best = Math.min(...palette.slice(1).filter(Boolean).map(distance))
    expect(distance(palette[used]!)).toBe(best)
  })

  test('é cópia: mudar a textura depois não muda a peça', () => {
    const { document, target } = prepared()
    const texture = makeTexture()
    const dressed = dressScenePaintTarget(document, target, texture, 'tile')
    const snapshot = parts(dressed, target).pixels.slice()
    texture.bitmap.data.fill(0)
    expect(parts(dressed, target).pixels).toEqual(snapshot)
  })

  test('vestir de novo com a mesma textura devolve o mesmo documento (nenhum desfazer vazio)', () => {
    const { document, target } = prepared()
    const texture = makeTexture()
    const dressed = dressScenePaintTarget(document, target, texture, 'tile')
    expect(dressScenePaintTarget(dressed, target, texture, 'tile')).toBe(dressed)
  })

  test('na folha de cores livres, a cor da textura entra direto; o transparente mostra a peça', () => {
    const { document, target } = prepared()
    const rgba: MoldaSceneDocument = {
      ...document,
      images: document.images.map((image) =>
        image.id === target.imageId ? convertSceneImageRgba(image, scenePalette(document)) : image,
      ),
    }
    const texture = makeTexture()
    const dressed = dressScenePaintTarget(rgba, target, texture, 'tile')
    expect(dressed.extraColors).toEqual(rgba.extraColors)
    const { geometry, image, pixels } = parts(dressed, target)
    const view = scenePaintFaceView(geometry, 'px', image)!
    const colors = textureColors(texture)
    for (const [column, row] of [
      [0, 0],
      [1, 0],
      [5, 3],
    ] as const) {
      const [x, y] = sceneFaceViewTexel(view, column, row)
      const value = texture.bitmap.data[row * 16 + column]!
      const offset = (y * image.width + x) * 4
      expect([...pixels.subarray(offset, offset + 4)]).toEqual(
        value ? [...hexToRgb(colors[value]!), 255] : [0, 0, 0, 0],
      )
    }
  })

  test('peça travada ou pintura de relevo recusam, sem mudar nada', () => {
    const { document, target } = prepared()
    const locked: MoldaSceneDocument = {
      ...document,
      nodes: document.nodes.map((node) =>
        node.id === target.nodeId ? { ...node, locked: true } : node,
      ),
    }
    expect(() => dressScenePaintTarget(locked, target, makeTexture(), 'tile')).toThrow()
    expect(() =>
      dressScenePaintTarget(document, { ...target, imageKind: 'normal' }, makeTexture(), 'tile'),
    ).toThrow()
  })
})

describe('vestir a peça inteira', () => {
  test('a peça do editor antigo (um material por face pintada) veste todas as faces', () => {
    const document = migrateLegacyModel(makeModel()).document
    const body = document.nodes.find((node) => node.name === 'corpo')
    if (body?.kind !== 'mesh') throw new Error('Peça ausente.')
    let n = 0
    const dressed = dressScenePiece(document, body.id, makeTexture(), 'tile', () => `vestir${++n}`)
    expect(readSceneDocument(sceneToJson(dressed)).status).toBe('valid')
    const node = dressed.nodes.find((entry) => entry.id === body.id)
    if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
    const geometry = dressed.geometries.find((entry) => entry.id === node.geometryId)!
    if (geometry.kind === 'mesh' || geometry.kind === 'path') throw new Error('Esperava a caixa.')
    const shown = new Set<string>()
    for (const face of BOX_FACES) {
      const materialId = geometry.surfaces[face]?.materialId ?? node.materialId
      const material = dressed.materials.find((entry) => entry.id === materialId)!
      const image = dressed.images.find((entry) => entry.id === material.colorImageId)
      expect(image, face).toBeDefined()
      const view = scenePaintFaceView(geometry, face, image!)!
      const { width, height } = sceneFaceViewSize(view)
      let painted = 0
      for (let row = 0; row < height; row++)
        for (let column = 0; column < width; column++) {
          const [x, y] = sceneFaceViewTexel(view, column, row)
          if (image!.layers[0]!.pixels[y * image!.width + x] !== 0) painted++
        }
      expect(painted, face).toBeGreaterThan(0)
      shown.add(materialId)
    }
    // Havia mais de um material na peça, e todos vestiram.
    expect(shown.size).toBeGreaterThan(1)
  })

  test('a pintura que se mexe recusa: vestir apagaria os quadros', () => {
    const { document, target } = prepared()
    const withFrames: MoldaSceneDocument = {
      ...document,
      images: document.images.map((image) =>
        image.id === target.imageId
          ? {
              ...image,
              flipbook: {
                frameWidth: image.width,
                frameHeight: image.height,
                frames: [0],
                fps: 4,
                loop: true,
              },
            }
          : image,
      ),
    }
    expect(() => dressScenePaintTarget(withFrames, target, makeTexture(), 'tile')).toThrow(
      'quadros',
    )
  })
})
