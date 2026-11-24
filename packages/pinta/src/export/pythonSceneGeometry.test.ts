import { expect, it } from 'bun:test'
import { spawnSync } from 'node:child_process'
import type { PintaScene, PintaSceneObject } from '@sistemazero/core/studio/pinta-scene'
import { sceneObjectIntersectsBox } from '@sistemazero/core/studio/pinta-scene-geometry'
import {
  sceneArtFrame,
  transformSceneSetObject,
} from '@sistemazero/core/studio/pinta-scene-runtime'
import { runPurePython } from '../testing/runPurePython'
import { pythonSceneGeometry } from './pythonSceneGeometry'
import { pythonSceneRuntime } from './pythonSceneRuntime'

const python = [process.env.PYTHON, 'python3', 'python'].find(
  (name) => name && spawnSync(name, ['-I', '-c', 'import json, math']).status === 0,
)

// Fail on engine imports rather than substituting a fake graphics framework.
const isolated = `import sys, json
class NoGraphics:
    def find_spec(self, fullname, path=None, target=None):
        if fullname.split('.')[0] in ('pygame', 'pgzero', 'pyray', 'raylib'):
            raise ImportError('Geometry must not import a graphics engine: ' + fullname)
sys.meta_path.insert(0, NoGraphics())
${pythonSceneGeometry}
`
function run(body: string, data: unknown = null): unknown {
  const result = spawnSync(python!, ['-I', '-c', `${isolated}\n${body}`], {
    input: JSON.stringify(data),
    encoding: 'utf8',
    timeout: 30_000,
    maxBuffer: 4 * 1024 * 1024,
  })
  expect(result.status, result.stderr || result.error?.message).toBe(0)
  return JSON.parse(result.stdout)
}

const object = (extra: Partial<PintaSceneObject>): PintaSceneObject => ({
  id: 'child',
  name: 'Objeto',
  type: '',
  x: -7.25,
  y: 4.5,
  width: 11.5,
  height: 7.25,
  properties: {},
  ...extra,
})
const bodyProtocol = `from types import SimpleNamespace
def body(b):
    return SimpleNamespace(**b, left=b['x'], top=b['y'], right=b['x']+b['width'], bottom=b['y']+b['height'])
`

it.skipIf(!python)(
  'admitted subnormal ellipses preserve Core results without raising numeric exceptions',
  () => {
    const cases = [
      {
        object: object({ shape: 'ellipse', x: 0, y: 0, width: Number.MIN_VALUE, height: 2 }),
        box: { x: -1, y: -1, width: 4, height: 4 },
      },
      {
        object: object({ shape: 'ellipse', x: 0, y: 0, width: 2, height: Number.MIN_VALUE }),
        box: { x: -1, y: -1, width: 4, height: 4 },
      },
      {
        object: object({ shape: 'ellipse', x: 0, y: 0, width: 1e-300, height: 1e-300 }),
        box: { x: 1, y: 1, width: 2, height: 2 },
      },
    ]
    expect(
      run(
        `${bodyProtocol}\nprint(json.dumps([objeto_intersecta_corpo(item['object'],body(item['box'])) for item in json.load(sys.stdin)]))`,
        cases,
      ),
    ).toEqual(cases.map((item) => sceneObjectIntersectsBox(item.object, item.box)))
  },
)

it.skipIf(!python)(
  'tile seams use the same inward body margin as Core authored geometry',
  async () => {
    const tile = object({ shape: 'rect', x: 16, y: 48, width: 16, height: 16 })
    const boxes = [0, 5e-10, 2e-9, -2e-9].map((overlap) => ({
      x: 20,
      y: 42,
      width: 4,
      height: 6 + overlap,
    }))
    expect(
      await runPurePython(
        pythonSceneRuntime,
        `print(json.dumps([_tile_intersects(((16,48),(32,48),(32,64),(16,64)),_SceneBox(**item)) for item in json.load(sys.stdin)]))`,
        boxes,
      ),
    ).toEqual(boxes.map((box) => sceneObjectIntersectsBox(tile, box)))
  },
)

it.skipIf(!python)('Python shape queries match Core without importing a graphics engine', () => {
  const points = [
    { x: 0, y: 0 },
    { x: 11, y: 1 },
    { x: 4, y: 3 },
    { x: 9, y: 7 },
    { x: 0, y: 6 },
  ]
  const fixtures = (['point', 'rect', 'ellipse', 'polygon', 'polyline'] as const).flatMap((shape) =>
    [-90, -27.5, 0, 35, 180].flatMap((rotation) =>
      [false, true].flatMap((flip) =>
        Array.from({ length: 81 }, (_, n) => ({
          object: object({
            shape,
            rotation,
            ...(flip ? { flipX: true, flipY: true } : {}),
            ...(shape === 'polygon' || shape === 'polyline' ? { points } : {}),
          }),
          box: {
            x: -15.13 + (n % 9) * 2.31,
            y: -5.29 + Math.floor(n / 9) * 2.07,
            width: 1.7,
            height: 2.9,
          },
        })),
      ),
    ),
  )
  const actual = run(
    `${bodyProtocol}\nprint(json.dumps([objeto_intersecta_corpo(f['object'],body(f['box'])) for f in json.load(sys.stdin)]))`,
    fixtures,
  )
  expect(actual).toEqual(fixtures.map((f) => sceneObjectIntersectsBox(f.object, f.box)))
  expect((actual as boolean[]).some(Boolean)).toBe(true)
  expect((actual as boolean[]).some((hit) => !hit)).toBe(true)
})

it.skipIf(!python)(
  'edge contact, open paths and degenerate outlines keep their existing meaning',
  () => {
    const fixtures = [
      {
        object: object({ x: 0, y: 0, width: 8, height: 8 }),
        box: { x: 8, y: 1, width: 2, height: 2 },
      },
      {
        object: object({ x: 0, y: 0, width: 8, height: 8 }),
        box: { x: 7.99, y: 1, width: 2, height: 2 },
      },
      {
        object: object({
          x: 0,
          y: 0,
          shape: 'polyline',
          points: [
            { x: 0, y: 0 },
            { x: 8, y: 0 },
            { x: 8, y: 8 },
          ],
        }),
        box: { x: 3, y: 3, width: 1, height: 1 },
      },
      {
        object: object({
          x: 0,
          y: 0,
          shape: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 8, y: 0 },
            { x: 8, y: 8 },
          ],
        }),
        box: { x: 5, y: 2, width: 1, height: 1 },
      },
      { object: object({ shape: 'ellipse', width: 0 }), box: { x: -8, y: 4, width: 2, height: 2 } },
      {
        object: object({
          shape: 'polygon',
          points: [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: 2, y: 2 },
          ],
        }),
        box: { x: -8, y: 4, width: 2, height: 2 },
      },
    ]
    expect(
      run(
        `${bodyProtocol}\nprint(json.dumps([objeto_intersecta_corpo(f['object'],body(f['box'])) for f in json.load(sys.stdin)]))`,
        fixtures,
      ),
    ).toEqual([false, true, false, true, false, false])
  },
)

it.skipIf(!python)(
  'animation crop and exact frame boundaries match Core for loops and stopped clips',
  () => {
    const art: NonNullable<PintaScene['art']>[number] = {
      id: 'hero',
      image: 'hero.png',
      width: 48,
      height: 32,
      sprite: {
        frameWidth: 16,
        frameHeight: 16,
        columns: 3,
        animations: [
          {
            id: 'loop',
            name: 'Andar',
            loop: true,
            frames: [
              { tile: 0, duration: 100 },
              { tile: 4, duration: 150 },
              { tile: 2, duration: 50 },
            ],
          },
          {
            id: 'once',
            name: 'Pular',
            loop: false,
            frames: [
              { tile: 5, duration: 50 },
              { tile: 3, duration: 200 },
            ],
          },
        ],
      },
    }
    const fixtures = [art, { ...art, sprite: undefined }].flatMap((image) =>
      ['loop', 'once', 'missing', undefined].flatMap((animation) =>
        [-10, 0, 49.9, 50, 99.9, 100, 249.9, 250, 299.9, 300, 600, 1_000_000].map((time) => ({
          art: image,
          animation,
          time,
        })),
      ),
    )
    expect(
      run(
        "print(json.dumps([quadro_arte(f['art'],f.get('animation'),f['time']) for f in json.load(sys.stdin)]))",
        fixtures,
      ),
    ).toEqual(
      fixtures.map((f) => {
        const crop = sceneArtFrame(f.art, f.animation, f.time)
        return [crop.x, crop.y, crop.width, crop.height]
      }),
    )
  },
)

it.skipIf(!python)(
  'affine geometry and linked object properties remain usable by any 2D adapter',
  () => {
    const fixtures = (['rect', 'ellipse', 'polygon', 'polyline', 'point', 'art'] as const).flatMap(
      (shape) =>
        [0, 35, 90].flatMap((rotation) =>
          [false, true].flatMap((flipX) =>
            [false, true].map((flipY) => ({
              parent: object({
                id: 'copy',
                x: -31.5,
                y: 12.25,
                width: 32,
                height: 48,
                rotation,
                ...(flipX ? { flipX } : {}),
                ...(flipY ? { flipY } : {}),
              }),
              child: object({
                shape,
                rotation: 27,
                points: [
                  { x: 0, y: 0 },
                  { x: 10, y: 2 },
                  { x: 2, y: 7 },
                ],
                properties: {
                  linked: { type: 'object', value: 'sibling' },
                  external: { type: 'object', value: 'outside' },
                  score: { type: 'int', value: 3 },
                },
              }),
            })),
          ),
        ),
    )
    const actual = run(
      "print(json.dumps([transformar_objeto_conjunto(f['parent'],f['child'],16,16,['child','sibling']) for f in json.load(sys.stdin)]))",
      fixtures,
    ) as PintaSceneObject[]
    function compare(a: unknown, b: unknown): void {
      if (typeof b === 'number') expect(a).toBeCloseTo(b, 7)
      else if (b && typeof b === 'object')
        for (const [key, value] of Object.entries(b))
          compare((a as Record<string, unknown>)[key], value)
      else expect(a || undefined).toEqual(b || undefined)
    }
    fixtures.forEach((f, index) => {
      compare(
        actual[index],
        transformSceneSetObject(f.parent, f.child, 16, 16, ['child', 'sibling']),
      )
    })
  },
)
