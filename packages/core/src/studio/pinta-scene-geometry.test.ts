import { describe, expect, test } from 'bun:test'
import type { PintaScene, PintaSceneObject } from './pinta-scene'
import { PintaSceneSchema } from './pinta-scene'
import { sceneIntersectsBox, sceneMoveBox, sceneObjectIntersectsBox } from './pinta-scene-geometry'
import { transformSceneSetObject } from './pinta-scene-runtime'
import { sceneObjectTransformSource } from './pinta-scene-transform.generated'

const object = (changes: Partial<PintaSceneObject> = {}): PintaSceneObject => ({
  id: 'shape',
  name: '',
  type: '',
  x: 10,
  y: 20,
  width: 20,
  height: 10,
  properties: {},
  shape: 'rect',
  ...changes,
})
const box = (x: number, y: number, width = 1, height = 1) => ({ x, y, width, height })

describe('geometria física contínua da cena', () => {
  test('retângulo: interior, contorno e contato sem penetração', () => {
    expect(sceneObjectIntersectsBox(object(), box(11, 21))).toBe(true)
    expect(sceneObjectIntersectsBox(object(), box(30, 21))).toBe(false)
    expect(sceneObjectIntersectsBox(object(), box(29.5, 21))).toBe(true)
    expect(sceneObjectIntersectsBox(object(), box(10, 20, 20, 10))).toBe(true)
  })
  test('uma barreira estreita dentro do corpo não desaparece entre amostras', () => {
    expect(
      sceneObjectIntersectsBox(
        object({ x: 4.49, y: 4, width: 0.02, height: 2 }),
        box(0, 0, 10, 10),
      ),
    ).toBe(true)
  })
  test('o quadrado girado não usa sua caixa envolvente como parede', () => {
    const diamond = object({ x: 16, y: 0, width: 16, height: 16, rotation: 45 })
    expect(sceneObjectIntersectsBox(diamond, box(15, 10))).toBe(true)
    expect(sceneObjectIntersectsBox(diamond, box(5, 0))).toBe(false)
    expect(sceneObjectIntersectsBox(diamond, box(26, 0))).toBe(false)
  })
  test('elipse: canto livre e cruzamento sem nenhum vértice do corpo dentro', () => {
    const ellipse = object({ x: 0, y: 0, width: 20, height: 10, shape: 'ellipse' })
    expect(sceneObjectIntersectsBox(ellipse, box(0, 0))).toBe(false)
    expect(sceneObjectIntersectsBox(ellipse, box(-5, 4.9, 30, 0.2))).toBe(true)
    expect(sceneObjectIntersectsBox(ellipse, box(-5, 10, 30, 1))).toBe(false)
    expect(sceneObjectIntersectsBox(ellipse, box(9.99, 4.99, 0.02, 0.02))).toBe(true)
  })
  test('elipse girada: consulta analítica, sem aproximação por segmentos', () => {
    const ellipse = object({ x: 10, y: 10, width: 20, height: 2, rotation: 90, shape: 'ellipse' })
    expect(sceneObjectIntersectsBox(ellipse, box(8.5, 19, 0.1, 0.1))).toBe(true)
    expect(sceneObjectIntersectsBox(ellipse, box(7, 10))).toBe(false)
  })
  test('polígono côncavo conserva o vão', () => {
    const polygon = object({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      shape: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 3 },
        { x: 3, y: 3 },
        { x: 3, y: 10 },
        { x: 0, y: 10 },
      ],
    })
    expect(sceneObjectIntersectsBox(polygon, box(6, 6))).toBe(false)
    expect(sceneObjectIntersectsBox(polygon, box(2.5, 5))).toBe(true)
    expect(sceneObjectIntersectsBox(polygon, box(-1, -1, 12, 12))).toBe(true)
  })
  test('polilinha é aberta: não fecha o último segmento', () => {
    const path = object({
      x: 0,
      y: 0,
      shape: 'polyline',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
    })
    expect(sceneObjectIntersectsBox(path, box(9.5, 4))).toBe(true)
    expect(sceneObjectIntersectsBox(path, box(4, 4))).toBe(false)
    expect(sceneObjectIntersectsBox(path, box(1, -0.5, 1, 1))).toBe(true)
  })
  test('ponto só bloqueia o corpo que contém sua posição', () => {
    const point = object({ x: 5, y: 5, width: 0, height: 0, shape: 'point' })
    expect(sceneObjectIntersectsBox(point, box(4, 4, 2, 2))).toBe(true)
    expect(sceneObjectIntersectsBox(point, box(0, 0))).toBe(false)
  })
  test('espelhar arte não muda o contorno autoral', () => {
    const triangle = object({
      x: 0,
      y: 0,
      shape: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ],
    })
    const reflected = { ...triangle, flipX: true as const, flipY: true as const }
    for (const [x, y] of [
      [1, 1],
      [8, 8],
    ])
      expect(sceneObjectIntersectsBox(reflected, box(x!, y!))).toBe(
        sceneObjectIntersectsBox(triangle, box(x!, y!)),
      )
  })
  test('conjunto com escala não uniforme e giro do filho conserva a base afim', () => {
    const parent = object({
      id: 'house',
      x: 20,
      y: 30,
      width: 80,
      height: 20,
      rotation: 30,
      flipX: true,
    })
    const child = object({ x: 4, y: 4, width: 8, height: 4, rotation: 37 })
    const transformed = transformSceneSetObject(parent, child, 32, 16, [child.id])
    expect(transformed.shape).toBe('polygon')
    // Centro calculado pela composição original, independente do polígono derivado.
    const b = (37 * Math.PI) / 180,
      a = (30 * Math.PI) / 180
    const cx = 4 + 4 * Math.cos(b) - 2 * Math.sin(b),
      cy = 4 + 4 * Math.sin(b) + 2 * Math.cos(b)
    const px = (32 - cx) * 2.5,
      py = cy * 1.25
    const center = {
      x: 20 + px * Math.cos(a) - py * Math.sin(a),
      y: 30 + px * Math.sin(a) + py * Math.cos(a),
    }
    expect(
      sceneObjectIntersectsBox(transformed, box(center.x - 0.01, center.y - 0.01, 0.02, 0.02)),
    ).toBe(true)
    expect(sceneObjectIntersectsBox(transformed, box(-100, -100))).toBe(false)
  })
  test('elipse sob base afim: a elipse principal derivada conserva o centro', () => {
    const parent = object({
      id: 'set',
      x: 20,
      y: 30,
      width: 80,
      height: 20,
      rotation: 30,
      flipY: true,
    })
    const child = object({ x: 4, y: 4, width: 8, height: 4, rotation: 37, shape: 'ellipse' })
    const transformed = transformSceneSetObject(parent, child, 32, 16, [child.id])
    const angle = ((transformed.rotation ?? 0) * Math.PI) / 180
    const x =
      transformed.x +
      (transformed.width / 2) * Math.cos(angle) -
      (transformed.height / 2) * Math.sin(angle)
    const y =
      transformed.y +
      (transformed.width / 2) * Math.sin(angle) +
      (transformed.height / 2) * Math.cos(angle)
    expect(sceneObjectIntersectsBox(transformed, box(x - 0.001, y - 0.001, 0.002, 0.002))).toBe(
      true,
    )
  })
  test('formas degeneradas e entradas não finitas não produzem colisões inventadas', () => {
    expect(
      sceneObjectIntersectsBox(object({ width: 0, shape: 'ellipse' }), box(0, 0, 100, 100)),
    ).toBe(false)
    expect(sceneObjectIntersectsBox(object(), box(0, 0, 0, 10))).toBe(false)
    expect(sceneObjectIntersectsBox(object(), box(Number.NaN, 0, 10, 10))).toBe(false)
  })
  test('pontos repetidos no começo não apagam um polígono válido', () => {
    const polygon = object({
      x: 0,
      y: 0,
      shape: 'polygon',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 0, y: 10 },
      ],
    })
    expect(sceneObjectIntersectsBox(polygon, box(1, 1))).toBe(true)
    expect(sceneObjectIntersectsBox(polygon, box(8, 8))).toBe(false)
  })
})

function map(): PintaScene {
  return {
    version: 2,
    id: 'map',
    name: 'map',
    tileSize: 16,
    cols: 8,
    rows: 8,
    tilesets: [
      { id: 'tiles', name: 'tiles', image: 'x', columns: 1, count: 1, solid: [0], platform: [] },
    ],
    layers: [
      {
        id: 'objects',
        kind: 'objects',
        name: 'objects',
        visible: true,
        objects: [
          object({
            id: 'instance',
            x: 48,
            y: 16,
            width: 32,
            height: 16,
            rotation: 45,
            setId: 'set',
            shape: 'set',
          }),
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
            name: 'cells',
            visible: true,
            tilesetId: 'tiles',
            cells: [0],
          },
        ],
      },
    ],
  }
}
describe('consulta do corpo na cena canônica', () => {
  test('varredura contínua barra linhas finas, desliza por eixo e limita velocidades extremas', () => {
    const scene = map()
    scene.version = 3
    scene.sets = []
    scene.layers = [
      {
        id: 'walls',
        kind: 'objects',
        name: 'walls',
        visible: true,
        objects: [
          object({
            x: 40,
            y: 0,
            width: 0,
            height: 100,
            shape: 'polyline',
            points: [
              { x: 0, y: 0 },
              { x: 0, y: 100 },
            ],
            collision: true,
          }),
        ],
      },
    ]
    const portable = new Function(
      `${sceneObjectTransformSource};return {move:sceneMoveBox,query:sceneIntersectsBox};`,
    )() as { move: typeof sceneMoveBox; query: typeof sceneIntersectsBox }
    for (const move of [sceneMoveBox, portable.move]) {
      const result = move(scene, box(10, 20, 10, 10), 80, 5)
      expect(result.x).toBeCloseTo(30, 6)
      expect(result.y).toBe(25)
      expect(move(scene, box(10, 20, 10, 10), 1e300, 0).x).toBeCloseTo(30, 6)
      expect(move(scene, box(50, 20, 10, 10), -1e300, 0).x).toBeCloseTo(40, 6)
      expect(move(scene, box(10, 20, 10, 10), NaN, 0)).toEqual(box(10, 20, 10, 10))
    }
    for (let y = 0; y < 50; y += 2)
      for (let x = 0; x < 60; x += 2)
        expect(portable.query(scene, box(x, y))).toBe(sceneIntersectsBox(scene, box(x, y)))
  })
  test('colisão de objeto exige contrato 3, nunca é aceita silenciosamente em cena 1/2', () => {
    const scene = map()
    const layer = scene.layers[0]!
    if (layer.kind !== 'objects') throw new Error('Expected objects')
    layer.objects[0]!.collision = true
    expect(PintaSceneSchema.safeParse(scene).success).toBe(false)
    expect(PintaSceneSchema.safeParse({ ...scene, version: 1 }).success).toBe(false)
    expect(PintaSceneSchema.safeParse({ ...scene, version: 3 }).success).toBe(true)
  })
  test('objeto elíptico autoral: centro sólido e cantos livres', () => {
    const scene = map()
    scene.version = 3
    scene.sets = []
    scene.layers = [
      {
        id: 'objects',
        kind: 'objects',
        name: 'objects',
        visible: true,
        objects: [
          object({ x: 16, y: 16, width: 32, height: 16, shape: 'ellipse', collision: true }),
        ],
      },
    ]
    expect(sceneIntersectsBox(scene, box(31, 23))).toBe(true)
    expect(sceneIntersectsBox(scene, box(16, 16))).toBe(false)
    expect(sceneIntersectsBox(scene, box(48, 20))).toBe(false)
  })
  test('polilinha de colisão não cria uma diagonal de fechamento', () => {
    const scene = map()
    scene.version = 3
    scene.sets = []
    scene.layers = [
      {
        id: 'objects',
        kind: 'objects',
        name: 'objects',
        visible: true,
        objects: [
          object({
            x: 16,
            y: 16,
            shape: 'polyline',
            collision: true,
            points: [
              { x: 0, y: 0 },
              { x: 16, y: 0 },
              { x: 16, y: 16 },
            ],
          }),
        ],
      },
    ]
    expect(sceneIntersectsBox(scene, box(31.5, 23))).toBe(true)
    expect(sceneIntersectsBox(scene, box(23, 23))).toBe(false)
  })
  test('parede de objeto em conjunto conserva o offset do filho fora do retângulo nominal', () => {
    const scene = map()
    scene.version = 3
    const layer = scene.layers[0]!
    if (layer.kind !== 'objects') throw new Error('Expected objects')
    layer.objects = [{ ...layer.objects[0]!, x: 16, y: 16, width: 16, height: 16, rotation: 0 }]
    scene.sets![0]!.layers = [
      {
        id: 'child',
        kind: 'objects',
        name: 'child',
        visible: true,
        offsetX: 0.5,
        objects: [object({ x: 40, y: 0, width: 4, height: 8, collision: true })],
      },
    ]
    expect(sceneIntersectsBox(scene, box(57, 17))).toBe(true)
    expect(sceneIntersectsBox(scene, box(17, 17))).toBe(false)
    layer.visible = false
    expect(sceneIntersectsBox(scene, box(57, 17))).toBe(false)
  })
  test('conjunto girado: interior, canto livre e contato sem penetração', () => {
    const scene = map()
    expect(sceneIntersectsBox(scene, box(50, 31))).toBe(true)
    expect(sceneIntersectsBox(scene, box(37, 16))).toBe(false)
    expect(sceneIntersectsBox(scene, box(68, 16))).toBe(false)
  })
  test('espelhos nos dois eixos, giros livres e deslocamento de grupo', () => {
    for (const rotation of [0, 17, 45, 90, 137, 180, 270])
      for (const flipX of [undefined, true] as const)
        for (const flipY of [undefined, true] as const) {
          const scene = map()
          const layer = scene.layers[0]!
          if (layer.kind !== 'objects') throw new Error('Expected objects')
          layer.parentId = 'group'
          const parent = {
            ...layer.objects[0]!,
            x: 64,
            y: 64,
            width: 32,
            height: 8,
            rotation,
            flipX,
            flipY,
          }
          layer.objects = [parent]
          scene.layers.unshift({
            id: 'group',
            name: 'group',
            kind: 'group',
            visible: true,
            offsetX: 1.25,
            offsetY: -2.5,
          })
          const angle = (rotation * Math.PI) / 180
          const cx = parent.x + 16 * Math.cos(angle) - 4 * Math.sin(angle) + 1.25,
            cy = parent.y + 16 * Math.sin(angle) + 4 * Math.cos(angle) - 2.5
          expect(sceneIntersectsBox(scene, box(cx - 0.01, cy - 0.01, 0.02, 0.02))).toBe(true)
          expect(sceneIntersectsBox(scene, box(4, 4))).toBe(false)
        }
  })
  test('offset do filho pode sair do retângulo nominal do conjunto', () => {
    const scene = map(),
      set = scene.sets![0]!
    set.layers[0]!.offsetX = 32.5
    const layer = scene.layers[0]!
    if (layer.kind !== 'objects') throw new Error('Expected objects')
    layer.objects = [{ ...layer.objects[0]!, rotation: 0, x: 16, y: 16, width: 16, height: 16 }]
    expect(sceneIntersectsBox(scene, box(49, 17))).toBe(true)
    expect(sceneIntersectsBox(scene, box(17, 17))).toBe(false)
  })
  test('visibilidade herdada desliga colisão; opacidade zero conserva barreira', () => {
    const scene = map()
    scene.layers[0]!.opacity = 0
    expect(sceneIntersectsBox(scene, box(50, 31))).toBe(true)
    scene.layers[0]!.visible = false
    expect(sceneIntersectsBox(scene, box(50, 31))).toBe(false)
  })
  test('células fracionárias não são arredondadas e limites do mundo continuam sólidos', () => {
    const scene = map()
    scene.layers = [
      {
        id: 'cells',
        kind: 'tiles',
        name: 'cells',
        visible: true,
        tilesetId: 'tiles',
        cells: [0, ...Array(63).fill(-1)],
        offsetX: 16.5,
        offsetY: 16.25,
      },
    ]
    expect(sceneIntersectsBox(scene, box(16, 20, 0.4, 0.4))).toBe(false)
    expect(sceneIntersectsBox(scene, box(16.4, 20, 0.2, 0.2))).toBe(true)
    expect(sceneIntersectsBox(scene, box(32.5, 20))).toBe(false)
    expect(sceneIntersectsBox(scene, box(-1, 20))).toBe(true)
    expect(sceneIntersectsBox(scene, box(128, 20))).toBe(true)
  })
  test('camada marcada como colisão usa qualquer peça; plataforma não vira sólido por acidente', () => {
    const scene = map()
    scene.tilesets[0]!.solid = []
    scene.tilesets[0]!.platform = [0]
    const layer = {
      id: 'cells',
      kind: 'tiles' as const,
      name: 'cells',
      visible: true,
      tilesetId: 'tiles',
      cells: [0, ...Array(63).fill(-1)],
      collision: undefined as true | undefined,
    }
    scene.layers = [layer]
    expect(sceneIntersectsBox(scene, box(1, 1))).toBe(false)
    layer.collision = true
    expect(sceneIntersectsBox(scene, box(1, 1))).toBe(true)
  })
})
