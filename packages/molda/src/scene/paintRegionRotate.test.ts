import { expect, test } from 'bun:test'
import { rotateSkin90 } from '../model/skinReproject'
import { makeModel } from '../testing/fixtures'
import { setSceneNodeFlag } from './commands'
import type { MoldaSceneDocument, SceneImage } from './document'
import { migrateLegacyModel } from './migrateLegacy'
import { rotateScenePaintFace, rotateScenePaintRegion } from './paintRegionRotate'

/** O corpo do modelo de teste tem a face de cima pintada: uma imagem indexada só dele. */
function fixture() {
  const document = migrateLegacyModel(makeModel()).document
  const image = document.images.find((entry) => entry.id === 'image:body:py')!
  return { document, image }
}

const withLayers = (document: MoldaSceneDocument, image: SceneImage, layers: Uint8Array[]) => ({
  ...document,
  images: document.images.map((entry) =>
    entry.id === image.id
      ? {
          ...image,
          layers: layers.map((pixels, i) => ({
            id: `camada${i}`,
            name: `camada ${i}`,
            visible: true,
            opacity: 1,
            pixels,
          })),
        }
      : entry,
  ),
})

const region = (x0: number, y0: number, x1: number, y1: number) => ({ x0, y0, x1, y1 })

test('região quadrada: gira como o "Girar a pele" antigo, em todas as camadas', () => {
  const { document, image } = fixture()
  const first = new Uint8Array(image.width * image.height)
  const second = new Uint8Array(image.width * image.height)
  // Um "L" de 3×3 no canto: fácil de ver o giro.
  for (const [x, y, v] of [
    [0, 0, 2],
    [0, 1, 2],
    [0, 2, 2],
    [1, 2, 3],
    [2, 2, 3],
  ] as const) {
    first[y * image.width + x] = v
    second[y * image.width + x] = v + 1
  }
  const source = withLayers(document, image, [first, second])
  const next = rotateScenePaintRegion(source, image.id, region(0, 0, 2, 2))
  const skin = { width: 3, height: 3, data: new Uint8Array(9) }
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++) skin.data[y * 3 + x] = first[y * image.width + x]!
  const expected = rotateSkin90(skin).data
  const rotated = next.images.find((entry) => entry.id === image.id)!
  for (let y = 0; y < 3; y++)
    for (let x = 0; x < 3; x++) {
      expect(rotated.layers[0]!.pixels[y * image.width + x]).toBe(expected[y * 3 + x]!)
      expect(rotated.layers[1]!.pixels[y * image.width + x]).toBe(
        expected[y * 3 + x] ? expected[y * 3 + x]! + 1 : 0,
      )
    }
  // Quatro giros voltam ao começo.
  let spun = source
  for (let i = 0; i < 4; i++) spun = rotateScenePaintRegion(spun, image.id, region(0, 0, 2, 2))
  expect(spun.images).toEqual(source.images)
})

test('região retangular volta ao tamanho dela pelo vizinho mais próximo; fora dela nada muda', () => {
  const { document, image } = fixture()
  const pixels = new Uint8Array(image.width * image.height)
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i % 5) + 1
  const source = withLayers(document, image, [pixels])
  const next = rotateScenePaintRegion(source, image.id, region(2, 1, 5, 2))
  const after = next.images.find((entry) => entry.id === image.id)!.layers[0]!.pixels
  for (let y = 0; y < image.height; y++)
    for (let x = 0; x < image.width; x++)
      if (x < 2 || x > 5 || y < 1 || y > 2)
        expect(after[y * image.width + x]).toBe(pixels[y * image.width + x]!)
  // O mesmo resultado do antigo: girar a pele 4×2 e reamostrar de volta para 4×2.
  const skin = { width: 4, height: 2, data: new Uint8Array(8) }
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 4; x++) skin.data[y * 4 + x] = pixels[(1 + y) * image.width + 2 + x]!
  const turned = rotateSkin90(skin)
  for (let y = 0; y < 2; y++)
    for (let x = 0; x < 4; x++) {
      const sx = Math.floor((x * turned.width) / 4)
      const sy = Math.floor((y * turned.height) / 2)
      expect(after[(1 + y) * image.width + 2 + x]).toBe(turned.data[sy * turned.width + sx]!)
    }
})

test('um pixel só não muda nada; peça travada recusa', () => {
  const { document, image } = fixture()
  expect(rotateScenePaintRegion(document, image.id, region(1, 1, 1, 1))).toBe(document)
  const locked = setSceneNodeFlag(document, ['body'], 'locked', true)
  expect(() => rotateScenePaintRegion(locked, image.id, region(0, 0, 2, 2))).toThrow()
  expect(() => rotateScenePaintRegion(document, 'sumiu', region(0, 0, 2, 2))).toThrow(
    'Essa pintura não existe mais.',
  )
})

test('no sentido contrário (o lado do espelho), girar desfaz o giro de sempre', () => {
  const { document, image } = fixture()
  const pixels = new Uint8Array(image.width * image.height)
  pixels[0] = 2
  pixels[1] = 3
  pixels[image.width] = 4
  const source = withLayers(document, image, [pixels])
  const turned = rotateScenePaintRegion(source, image.id, region(0, 0, 2, 2))
  expect(turned.images).not.toEqual(source.images)
  const back = rotateScenePaintRegion(turned, image.id, region(0, 0, 2, 2), 3)
  expect(back.images).toEqual(source.images)
})

test('a face gira junto com os mapas do material: o relevo não desalinha da cor', () => {
  const { document, image } = fixture()
  const color = new Uint8Array(image.width * image.height)
  color[0] = 2
  const source = withLayers(document, image, [color])
  const material = source.materials.find((entry) => entry.colorImageId === image.id)!
  // Um mapa de relevo com a METADE do tamanho: o mesmo retângulo, na escala dele.
  const width = Math.max(1, image.width / 2)
  const height = Math.max(1, image.height / 2)
  const relief = new Uint8Array(width * height * 4)
  relief.set([255, 0, 0, 255], 0)
  const withMap: MoldaSceneDocument = {
    ...source,
    images: [
      ...source.images,
      {
        id: 'relevo',
        name: 'relevo',
        width,
        height,
        encoding: 'rgba',
        layers: [{ id: 'r', name: 'r', visible: true, opacity: 1, pixels: relief }],
      },
    ],
    materials: source.materials.map((entry) =>
      entry.id === material.id ? { ...entry, normalImageId: 'relevo' } : entry,
    ),
  }
  const turned = rotateScenePaintFace(
    withMap,
    { materialId: material.id, imageId: image.id },
    region(0, 0, 3, 3),
  )
  const map = turned.images.find((entry) => entry.id === 'relevo')!
  expect(map.layers[0]!.pixels).not.toEqual(relief)
  // O canto de cima vai para a direita, na cor e no mapa.
  const colorImage = turned.images.find((entry) => entry.id === image.id)!
  expect(colorImage.layers[0]!.pixels[3]).toBe(2)
  expect([...map.layers[0]!.pixels.subarray(4, 8)]).toEqual([255, 0, 0, 255])
})
