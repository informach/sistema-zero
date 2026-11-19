import { expect, test } from 'bun:test'
import type { PintaScene, PintaSceneObject } from './pinta-scene'
import { sceneIntersectsBox, scenePlatformLanding } from './pinta-scene-geometry'
import { sceneObjectTransformSource } from './pinta-scene-transform.generated'

function map(): PintaScene {
  return {
    version: 3,
    id: 'floor',
    name: 'Piso',
    tileSize: 16,
    cols: 16,
    rows: 12,
    tilesets: [
      { id: 'tiles', name: 'Peças', image: 'x', columns: 1, count: 1, solid: [], platform: [0] },
    ],
    layers: [
      {
        id: 'objects',
        kind: 'objects',
        name: 'Objetos',
        visible: true,
        objects: [
          {
            id: 'floor',
            name: 'Piso pequeno',
            type: '',
            shape: 'set',
            setId: 'set',
            x: 40,
            y: 40.25,
            width: 4,
            height: 2,
            properties: {},
          },
        ],
      },
    ],
    sets: [
      {
        id: 'set',
        cols: 1,
        rows: 1,
        layers: [
          {
            id: 'cells',
            kind: 'tiles',
            name: 'Piso',
            visible: true,
            tilesetId: 'tiles',
            cells: [0],
          },
        ],
      },
    ],
  }
}
function parent(scene: PintaScene): PintaSceneObject {
  const layer = scene.layers.find((l) => l.kind === 'objects')
  if (layer?.kind !== 'objects' || !layer.objects[0]) throw Error('Fixture sem conjunto')
  return layer.objects[0]
}
const box = (x: number, y: number, width = 4, height = 4) => ({ x, y, width, height })

test('peça menor que uma célula, offset fracionário e corpo mais largo que a peça', () => {
  const scene = map(),
    before = box(37.2, 10, 9.6, 14.4),
    after = { ...before, y: 100 }
  expect(sceneIntersectsBox(scene, box(40.5, 40.5))).toBe(false)
  expect(scenePlatformLanding(scene, before, after)).toEqual({ ...after, y: 25.85 })
  expect(scenePlatformLanding(scene, before, after, 0)).toBeNull()
})

test('apoio parado, queda veloz, salto por baixo e corpo que já estava abaixo', () => {
  const scene = map(),
    standing = box(40, 36.25)
  expect(scenePlatformLanding(scene, standing, standing)).toEqual(standing)
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 180))).toEqual(standing)
  expect(scenePlatformLanding(scene, box(40, 60), box(40, 0))).toBeNull()
  expect(scenePlatformLanding(scene, box(40, 40), box(40, 100))).toBeNull()
})

test('gravidade invertida apoia no contorno inferior real', () => {
  const scene = map()
  expect(scenePlatformLanding(scene, box(40, 100), box(40, 10), -1)).toEqual(box(40, 42.25))
  expect(scenePlatformLanding(scene, box(40, 42.25), box(40, 42.25), -1)).toEqual(box(40, 42.25))
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 100), -1)).toBeNull()
  expect(scenePlatformLanding(scene, box(40, 40), box(40, 0), -1)).toBeNull()
})

test('giro livre usa o contorno sobre a largura do corpo, não o bounding box inteiro', () => {
  const scene = map()
  Object.assign(parent(scene), { x: 64, y: 40, width: 16, height: 4, rotation: 45 })
  const landing = scenePlatformLanding(scene, box(66, 0, 2), box(66, 100, 2))
  expect(landing?.y).toBeCloseTo(38, 8)
  expect(scenePlatformLanding(scene, box(58, 0, 2), box(58, 100, 2))).toBeNull()
})

test('espelho horizontal desloca a peça, sem inventar apoio na célula vazia', () => {
  const scene = map(),
    set = scene.sets![0]!
  set.cols = 2
  const layer = set.layers[0]!
  if (layer.kind !== 'tiles') throw Error('Fixture sem peças')
  layer.cells = [0, -1]
  Object.assign(parent(scene), { x: 32, y: 32, width: 32, height: 16, flipX: true })
  expect(scenePlatformLanding(scene, box(50, 0), box(50, 100))).toEqual(box(50, 28))
  expect(scenePlatformLanding(scene, box(34, 0), box(34, 100))).toBeNull()
})

test('espelho vertical desloca o piso mantendo a direção da gravidade do jogo', () => {
  const scene = map(),
    set = scene.sets![0]!
  set.rows = 2
  const layer = set.layers[0]!
  if (layer.kind !== 'tiles') throw Error('Fixture sem peças')
  layer.cells = [0, -1]
  Object.assign(parent(scene), { x: 32, y: 32, width: 16, height: 32, flipY: true })
  expect(scenePlatformLanding(scene, box(34, 0), box(34, 100))).toEqual(box(34, 44))
  expect(scenePlatformLanding(scene, box(34, 100), box(34, 0), -1)).toEqual(box(34, 64))
})

test('offsets e visibilidade herdados; opacidade zero conserva a plataforma', () => {
  const scene = map(),
    layer = scene.layers[0]!,
    child = scene.sets![0]!.layers[0]!
  layer.parentId = 'group'
  layer.opacity = 0
  scene.layers.unshift({
    id: 'group',
    name: 'Grupo',
    kind: 'group',
    visible: true,
    offsetX: 0.5,
    offsetY: 1.25,
  })
  child.offsetY = 8 // Um pixel no mundo após reduzir a altura do conjunto de 16 para 2.
  expect(scenePlatformLanding(scene, box(40.5, 0), box(40.5, 100))).toEqual(box(40.5, 38.5))
  scene.layers[0]!.visible = false
  expect(scenePlatformLanding(scene, box(40.5, 0), box(40.5, 100))).toBeNull()
})

test('camada sólida e peça sólida prevalecem sobre a marca de plataforma', () => {
  const scene = map(),
    layer = scene.sets![0]!.layers[0]!
  if (layer.kind !== 'tiles') throw Error('Fixture sem peças')
  layer.collision = true
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 100))).toBeNull()
  expect(sceneIntersectsBox(scene, box(40, 40.5))).toBe(true)
  delete layer.collision
  scene.tilesets[0]!.solid = [0]
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 100))).toBeNull()
})

test('cada camada consulta sua própria folha, e a primeira superfície vence', () => {
  const scene = map()
  scene.tilesets.push({ ...scene.tilesets[0]!, id: 'other', platform: [] })
  scene.layers = [
    {
      id: 'empty',
      name: 'Decoração',
      kind: 'tiles',
      visible: true,
      tilesetId: 'other',
      cells: [0, ...Array(191).fill(-1)],
      offsetX: 32,
      offsetY: 16,
    },
    {
      id: 'lower',
      name: 'Baixo',
      kind: 'tiles',
      visible: true,
      tilesetId: 'tiles',
      cells: [0, ...Array(191).fill(-1)],
      offsetX: 32,
      offsetY: 64,
    },
    {
      id: 'higher',
      name: 'Alto',
      kind: 'tiles',
      visible: true,
      tilesetId: 'tiles',
      cells: [0, ...Array(191).fill(-1)],
      offsetX: 32,
      offsetY: 32,
    },
  ]
  expect(scenePlatformLanding(scene, box(34, 0), box(34, 150))).toEqual(box(34, 28))
  expect(scenePlatformLanding(scene, box(34, 100), box(34, 0), -1)).toEqual(box(34, 80))
})

test('não agarra contato só na borda, fora do caminho ou com entrada inválida', () => {
  const scene = map()
  expect(scenePlatformLanding(scene, box(36, 0), box(36, 100))).toBeNull()
  expect(scenePlatformLanding(scene, box(44, 0), box(44, 100))).toBeNull()
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 10))).toBeNull()
  expect(scenePlatformLanding(scene, box(40, 0), box(40, 100), Number.NaN)).toBeNull()
  expect(scenePlatformLanding(scene, box(40, 0, 0), box(40, 100))).toBeNull()
})

test('subir a rampa sob um teto baixo bloqueia o deslocamento sem atravessar o piso', () => {
  const scene = map(),
    owner = parent(scene)
  Object.assign(owner, { x: 64, y: 40, width: 16, height: 4, rotation: 45 })
  const objects = scene.layers[0]!
  if (objects.kind !== 'objects') throw Error('Fixture sem objetos')
  objects.objects.push({
    id: 'ceiling',
    name: 'Teto',
    type: '',
    shape: 'rect',
    x: 63,
    y: 35,
    width: 4,
    height: 4,
    collision: true,
    properties: {},
  })
  const before = box(68, 40, 2),
    desired = box(66, 40.1, 2)
  // At x=68, slope top is y=44; at x=66 it is y=42, but the
  // resulting body at y=38 would overlap the ceiling ending at y=39.
  expect(scenePlatformLanding(scene, before, desired)).toEqual(before)
})

test('geração portátil usa a mesma consulta para giros, espelhos e gravidades', () => {
  const portable: typeof scenePlatformLanding = new Function(
    `${sceneObjectTransformSource};return scenePlatformLanding;`,
  )()
  for (const rotation of [0, 17, 45, 90, 137, 180, 270])
    for (const flipX of [false, true])
      for (const flipY of [false, true])
        for (const gravity of [-1, 0, 1]) {
          const scene = map()
          Object.assign(parent(scene), {
            x: 64,
            y: 64,
            width: 32,
            height: 8,
            rotation,
            flipX,
            flipY,
          })
          const before = box(65, gravity > 0 ? 0 : 160),
            desired = box(65, gravity > 0 ? 160 : 0)
          expect(portable(scene, before, desired, gravity)).toEqual(
            scenePlatformLanding(scene, before, desired, gravity),
          )
        }
})
