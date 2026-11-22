import { describe, expect, test } from 'bun:test'
import { scene4BudgetFixture } from '../../tests/fixtures/pinta-region-scene'
import { encodePintaRegionLayers, type PintaRegionCells } from '../creations/pinta-regions'
import { readPintaRegionScene } from './pinta-region-scene'
import { type PintaScene, type PintaSceneObject, PintaSceneSchema } from './pinta-scene'
import {
  type SceneBox,
  sceneIntersectsBox,
  sceneMoveBox,
  scenePlatformLanding,
} from './pinta-scene-geometry'
import { createRegionSceneQueries } from './pinta-scene-query'
import { moveSceneCharacter, sceneObjects, sceneSolidAt, sceneSpawn } from './pinta-scene-runtime'
import { sceneObjectTransformSource } from './pinta-scene-transform.generated'

const box = (x: number, y: number, width = 4, height = 4): SceneBox => ({ x, y, width, height })
const point = (x: number, y: number): PintaSceneObject => ({
  id: 'child',
  name: 'Início',
  type: '',
  shape: 'point',
  x,
  y,
  width: 0,
  height: 0,
  properties: {},
})
function dense(): PintaScene {
  const cells = Array<number>(64 * 64).fill(-1)
  for (let i = 0; i < 64; i++) cells[32 * 64 + i] = i < 32 ? (i % 8) * 4096 : 1
  return PintaSceneSchema.parse({
    version: 3,
    id: 'world',
    name: 'Vila',
    tileSize: 16,
    cols: 64,
    rows: 64,
    tilesets: [
      { id: 'ground', name: 'Chão', image: 'x', columns: 2, count: 2, solid: [0], platform: [1] },
    ],
    layers: [
      { id: 'floor', kind: 'tiles', name: 'Chão', visible: true, tilesetId: 'ground', cells },
    ],
  })
}
/** Test-only dense reference conversion, independent of runtime queries. */
function regional(
  source = dense(),
  origin = { col: -32, row: -32 },
  setOrigin = { col: 32, row: -32 },
) {
  const convert = (
    map: { cols: number; rows: number; layers: PintaScene['layers'] },
    at: { col: number; row: number },
  ) =>
    map.layers.map((layer) => {
      if (layer.kind === 'objects')
        return {
          ...layer,
          objects: layer.objects.map((object) => ({
            ...object,
            x: object.x + at.col * source.tileSize,
            y: object.y + at.row * source.tileSize,
          })),
        }
      if (layer.kind !== 'tiles') return layer
      const chunks = new Map<string, PintaRegionCells['chunks'][number]>()
      layer.cells.forEach((cell, index) => {
        if (cell < 0) return
        const col = (index % map.cols) + at.col,
          row = Math.floor(index / map.cols) + at.row
        const cx = Math.floor(col / 32),
          cy = Math.floor(row / 32),
          key = `${cx},${cy}`
        let chunk = chunks.get(key)
        if (!chunk) {
          chunk = { col: cx, row: cy, cells: new Int16Array(1024).fill(-1) }
          chunks.set(key, chunk)
        }
        chunk.cells[(row - cy * 32) * 32 + col - cx * 32] = cell
      })
      const cells = encodePintaRegionLayers(
        [{ kind: 'regions', version: 1, side: 32, chunks: [...chunks.values()] }],
        { ...at, cols: map.cols, rows: map.rows },
      )?.[0]
      if (!cells) throw Error('Invalid test grid')
      return { ...layer, cells }
    })
  const result = readPintaRegionScene(
    JSON.stringify({
      ...source,
      version: 4,
      physics: 'precise',
      origin,
      layers: convert(source, origin),
      sets: source.sets?.map((set) => ({
        ...set,
        origin: setOrigin,
        layers: convert(set, setOrigin),
      })),
    }),
  )
  if (!result) throw Error('Regional fixture was not admitted')
  return result
}
function withSet(): PintaScene {
  const scene = dense()
  scene.layers.push({
    id: 'objects',
    kind: 'objects',
    name: 'Conjuntos',
    visible: true,
    offsetX: 0.25,
    offsetY: -0.5,
    objects: [
      { ...point(128, 128), id: 'instance', width: 48, height: 32, shape: 'set', setId: 'garden' },
    ],
  })
  scene.sets = [
    {
      id: 'garden',
      cols: 2,
      rows: 2,
      layers: [
        {
          id: 'set-floor',
          kind: 'tiles',
          name: 'Chão',
          visible: true,
          offsetX: -0.25,
          tilesetId: 'ground',
          cells: [0, 1, -1, 0],
        },
        {
          id: 'markers',
          kind: 'objects',
          name: 'Marcadores',
          visible: true,
          offsetY: 0.5,
          objects: [{ ...point(4, 8), properties: { next: { type: 'object', value: 'child' } } }],
        },
      ],
    },
  ]
  return scene
}

describe('consultas regionais em contexto de runtime', () => {
  test('início padrão fica na casa zero válida e só a limita quando fora do mundo', () => {
    for (const [origin, cols, expected] of [
      [{ col: -64, row: -64 }, 10000, { x: 8, y: 8 }],
      [{ col: -64, row: -64 }, 1, { x: -1016, y: -1016 }],
      [{ col: 32, row: 32 }, 1, { x: 520, y: 520 }],
    ] as const) {
      const source = { ...scene4BudgetFixture(0, 0), origin, cols, rows: cols }
      const scene = readPintaRegionScene(JSON.stringify(source))!
      expect(scene).not.toBeNull()
      expect(createRegionSceneQueries(scene).spawn()).toEqual(expected)
    }
    expect(sceneSpawn(dense())).toEqual({ x: 8, y: 8 })
    const authored = regional()
    authored.layers.push({
      id: 'start',
      kind: 'objects',
      name: 'Início',
      visible: true,
      objects: [{ ...point(-900, -950), role: 'start' }],
    })
    expect(createRegionSceneQueries(authored).spawn()).toEqual({ x: -900, y: -950 })
  })
  test('consulta pontual preserva flags e colisões densas em ambas as bordas de chunks', () => {
    const source = dense(),
      query = createRegionSceneQueries(regional(source))
    for (let y = 0; y < 1024; y += 15)
      for (let x = 0; x < 1024; x += 15)
        expect(query.solidAt(x - 512, y - 512)).toBe(sceneSolidAt(source, x, y))
    expect(query.solidAt(-513, 0)).toBe(true)
    expect(query.solidAt(-512, -512)).toBe(false)
    expect(query.solidAt(512, 0)).toBe(true)
  })
  test('corpo e contato exato conservam geometria depois de transladar o mundo', () => {
    const source = dense(),
      query = createRegionSceneQueries(regional(source))
    for (let x = 0; x < 1020; x += 7)
      for (const y of [507, 508, 511, 512, 527, 528])
        expect(query.intersectsBox(box(x - 512, y - 512))).toBe(
          sceneIntersectsBox(source, box(x, y)),
        )
    expect(query.intersectsBox(box(-512, -512))).toBe(false)
    expect(query.intersectsBox(box(-512.01, -512))).toBe(true)
  })
  test('origens fora da divisão de 32, grupos e visibilidade mantêm o contrato de colisão', () => {
    const source = dense(),
      floor = source.layers[0]!
    floor.parentId = 'group'
    source.layers.unshift({
      id: 'group',
      kind: 'group',
      name: 'Terreno',
      visible: true,
      offsetX: 0.25,
      offsetY: -0.5,
      opacity: 0,
    })
    for (const origin of [
      { col: -33, row: 17 },
      { col: 13, row: -31 },
    ]) {
      const query = createRegionSceneQueries(regional(source, origin))
      for (const x of [0, 8, 511, 512, 1019])
        for (const y of [490, 508, 511, 527, 530]) {
          expect(query.solidAt(x + origin.col * 16, y + origin.row * 16)).toBe(
            sceneSolidAt(source, x, y),
          )
          expect(query.intersectsBox(box(x + origin.col * 16, y + origin.row * 16))).toBe(
            sceneIntersectsBox(source, box(x, y)),
          )
        }
    }
    source.layers[0]!.visible = false
    const hidden = createRegionSceneQueries(regional(source))
    expect(hidden.solidAt(-504, 1)).toBe(false)
    expect(hidden.intersectsBox(box(-504, 1))).toBe(false)
    source.layers[0]!.visible = true
    if (floor.kind !== 'tiles') throw Error('Expected tiles')
    floor.collision = true
    expect(createRegionSceneQueries(regional(source)).solidAt(8, 1)).toBe(true)
  })
  test('conjuntos descontam sua própria origem sem perder IDs e propriedades locais', () => {
    const source = withSet(),
      query = createRegionSceneQueries(regional(source))
    expect(query.objects()).toEqual(
      sceneObjects(source).map((object) => ({ ...object, x: object.x - 512, y: object.y - 512 })),
    )
    expect(query.objects()[1]?.properties.next).toEqual({ type: 'object', value: 'instance/child' })
  })
  test('giros, reflexos e escala de conjuntos usam a mesma geometria densa', () => {
    for (const rotation of [0, 37, 90])
      for (const flipX of [false, true])
        for (const flipY of [false, true]) {
          const source = withSet(),
            layer = source.layers[1]!
          if (layer.kind !== 'objects') throw Error('Expected objects')
          Object.assign(layer.objects[0]!, {
            rotation,
            flipX: flipX ? true : undefined,
            flipY: flipY ? true : undefined,
          })
          const query = createRegionSceneQueries(regional(source))
          for (let y = 60; y < 220; y += 8)
            for (let x = 60; x < 220; x += 8) {
              expect(query.solidAt(x - 512, y - 512)).toBe(sceneSolidAt(source, x, y))
              expect(query.intersectsBox(box(x - 512, y - 512))).toBe(
                sceneIntersectsBox(source, box(x, y)),
              )
            }
          const actual = query.objects(),
            expected = sceneObjects(source)
          for (let i = 0; i < actual.length; i++) {
            expect(actual[i]!.x).toBeCloseTo(expected[i]!.x - 512, 8)
            expect(actual[i]!.y).toBeCloseTo(expected[i]!.y - 512, 8)
            expect(actual[i]!.rotation).toBe(expected[i]!.rotation)
          }
        }
  })
  test('colisores autorais de conjuntos respeitam offsets fracionários e origem', () => {
    const source = withSet(),
      child = source.sets![0]!.layers[1]!
    if (child.kind !== 'objects') throw Error('Expected objects')
    child.objects[0] = {
      ...point(4, 8),
      width: 4,
      height: 8,
      shape: 'ellipse',
      rotation: 37,
      collision: true,
    }
    const query = createRegionSceneQueries(regional(source))
    for (let y = 125; y < 150; y += 2)
      for (let x = 125; x < 180; x += 2)
        expect(query.intersectsBox(box(x - 512, y - 512))).toBe(
          sceneIntersectsBox(source, box(x, y)),
        )
  })
  test('plataformas de mão única e gravidade invertida conservam o pouso', () => {
    const source = dense(),
      query = createRegionSceneQueries(regional(source))
    for (const gravity of [-1, 0, 1])
      for (const x of [520, 600, 1000]) {
        const previous = box(x, gravity < 0 ? 540 : 490, 8, 8),
          desired = { ...previous, y: gravity < 0 ? 510 : 520 }
        const expected = scenePlatformLanding(source, previous, desired, gravity)
        expect(
          query.platformLanding(
            { ...previous, x: previous.x - 512, y: previous.y - 512 },
            { ...desired, x: desired.x - 512, y: desired.y - 512 },
            gravity,
          ),
        ).toEqual(expected ? { ...expected, x: expected.x - 512, y: expected.y - 512 } : null)
      }
    expect(query.platformLanding(box(8, 28, 8, 8), box(8, -22, 8, 8))).toBeNull()
  })
  test('pouso em conjunto girado ou refletido conserva a superfície autoral', () => {
    let contacts = 0
    for (const rotation of [0, 37, 90])
      for (const flipY of [undefined, true] as const) {
        const source = withSet(),
          layer = source.layers[1]!
        if (layer.kind !== 'objects') throw Error('Expected objects')
        Object.assign(layer.objects[0]!, { rotation, flipY })
        const query = createRegionSceneQueries(regional(source))
        for (const x of [110, 130, 150, 170])
          for (const gravity of [-1, 1]) {
            const previous = box(x, gravity > 0 ? 70 : 230, 8, 8),
              desired = box(x, gravity > 0 ? 220 : 80, 8, 8)
            const expected = scenePlatformLanding(source, previous, desired, gravity)
            const actual = query.platformLanding(
              { ...previous, x: previous.x - 512, y: previous.y - 512 },
              { ...desired, x: desired.x - 512, y: desired.y - 512 },
              gravity,
            )
            expect(actual === null).toBe(expected === null)
            if (expected && actual) {
              contacts++
              expect(actual.x).toBeCloseTo(expected.x - 512, 7)
              expect(actual.y).toBeCloseTo(expected.y - 512, 7)
            }
          }
      }
    expect(contacts).toBeGreaterThan(0)
  })
  test('varredura contínua não atravessa o chão assinado e conserva a resolução por eixo', () => {
    const source = dense(),
      query = createRegionSceneQueries(regional(source))
    const previous = box(100, 480, 8, 8),
      expected = sceneMoveBox(source, previous, 5, 100)
    const actual = query.moveBox({ ...previous, x: previous.x - 512, y: previous.y - 512 }, 5, 100)
    expect(actual.x).toBeCloseTo(expected.x - 512, 7)
    expect(actual.y).toBeCloseTo(expected.y - 512, 7)
    expect(actual.y).toBeCloseTo(-8, 6)
    expect(query.moveBox(box(-400, -400), NaN, 0)).toEqual(box(-400, -400))
  })
  test('movimento pontual legado continua no mesmo núcleo e usa índices do contexto', () => {
    const source = dense(),
      query = createRegionSceneQueries(regional(source))
    for (const [dx, dy] of [
      [0, 100],
      [100, 0],
      [-100, 0],
      [0, -100],
    ]) {
      const actual = query.moveCharacter({ x: -400, y: -32 }, dx!, dy!, 4)
      const expected = moveSceneCharacter(source, { x: 112, y: 480 }, dx!, dy!, 4)
      expect(actual).toEqual({ x: expected.x - 512, y: expected.y - 512 })
    }
  })
  test('mundo 10000² consulta só índices armazenados, sem rasterizar lacunas', () => {
    const scene = readPintaRegionScene(JSON.stringify(scene4BudgetFixture(1, 1)))!
    const layer = scene.layers[0]!
    if (layer.kind !== 'tiles') throw Error('Expected tiles')
    let reads = 0
    const chunk = layer.cells.chunks[0]!
    chunk.cells = new Proxy(chunk.cells, {
      get(target, key) {
        if (typeof key === 'string' && /^\d+$/.test(key)) reads++
        return Reflect.get(target, key, target)
      },
    })
    const query = createRegionSceneQueries(scene)
    expect(query.solidAt(8, 8)).toBe(true)
    expect(query.solidAt(-8, -8)).toBe(false)
    expect(query.intersectsBox(box(-1024, -1024, 160000, 160000))).toBe(true)
    expect(reads).toBeLessThanOrEqual(1025)
    expect(layer.cells.chunks).toHaveLength(1)
    expect(query.context.regionCells(layer.cells)).toBe(query.context.regionCells(layer.cells))
    expect(createRegionSceneQueries(scene).context.regionCells(layer.cells)).not.toBe(
      query.context.regionCells(layer.cells),
    )
  })
  test('contexto não modifica metadados, formatos nem escolhe a física do jogo', () => {
    const scene = regional(),
      before = JSON.stringify(scene)
    scene.physics = 'legacy'
    const legacyBefore = JSON.stringify(scene),
      query = createRegionSceneQueries(scene)
    query.solidAt(8, 8)
    query.intersectsBox(box(0, 0))
    query.objects()
    query.spawn()
    expect(query.context.physics).toBe('legacy')
    expect(query.context.layers).toBe(scene.layers)
    expect(JSON.stringify(scene)).toBe(legacyBefore)
    expect(before).not.toBe(legacyBefore)
  })
  test('funções portáteis recebem o mesmo contexto sem capturar dependências do editor', () => {
    const query = createRegionSceneQueries(regional(withSet()))
    const portable = new Function(
      `${sceneObjectTransformSource};return {query:sceneIntersectsBox,move:sceneMoveBox,landing:scenePlatformLanding};`,
    )() as {
      query: typeof sceneIntersectsBox
      move: typeof sceneMoveBox
      landing: typeof scenePlatformLanding
    }
    for (let y = -400; y < 20; y += 7)
      for (let x = -400; x < -300; x += 7)
        expect(portable.query(query.context, box(x, y))).toBe(query.intersectsBox(box(x, y)))
    expect(portable.move(query.context, box(-400, -40), 0, 100)).toEqual(
      query.moveBox(box(-400, -40), 0, 100),
    )
    expect(portable.landing(query.context, box(8, -22, 8, 8), box(8, 8, 8, 8))).toEqual(
      query.platformLanding(box(8, -22, 8, 8), box(8, 8, 8, 8)),
    )
  })
})
