import { expect, test } from 'bun:test'
import type { SceneMeshGeometry, ScenePrimitiveGeometry, Vec2 } from './document'
import { sceneImageTexel } from './imageCoordinates'
import { scenePaintFaceBounds } from './paintSurfaceBounds'

const box = (surfaces: ScenePrimitiveGeometry['surfaces'] = {}): ScenePrimitiveGeometry => ({
  id: 'caixa',
  kind: 'box',
  from: [-1, -1, -1],
  to: [1, 1, 1],
  surfaces,
})

const triangle = (uvs: Vec2[]): SceneMeshGeometry => ({
  id: 'malha',
  kind: 'mesh',
  vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [0, 1, 0] },
  faces: {
    f: { corners: uvs.map((uv, i) => ({ vertexId: ['a', 'b', 'c'][i]!, uv })) },
  },
  looseEdges: [],
})

test('superfície sem UV própria cobre a folha inteira; com bloco, exatamente o bloco', () => {
  const image = { width: 32, height: 16 }
  expect(scenePaintFaceBounds(box(), 'px', image)).toEqual({ x0: 0, y0: 0, x1: 31, y1: 15 })
  const slot = { origin: [9 / 32, 1 / 16] as Vec2, u: [8 / 32, 0] as Vec2, v: [0, 8 / 16] as Vec2 }
  expect(scenePaintFaceBounds(box({ py: { uv: slot } }), 'py', image)).toEqual({
    x0: 9,
    y0: 1,
    x1: 16,
    y1: 8,
  })
})

test('face de malha: o retângulo em volta dos cantos, arredondado como o toque', () => {
  const image = { width: 10, height: 10 }
  const mesh = triangle([
    [0.3, 0.3],
    [0.55, 0.3],
    [0.3, 0.71],
  ])
  const rect = scenePaintFaceBounds(mesh, 'f', image)!
  expect(rect).toEqual({ x0: 3, y0: 3, x1: 5, y1: 7 })
  // Todo ponto de dentro da face cai dentro do retângulo dela.
  for (let i = 0; i <= 20; i++)
    for (let j = 0; i + j <= 20; j++) {
      const u = 0.3 + (0.25 * i) / 20,
        v = 0.3 + (0.41 * j) / 20
      const [x, y] = sceneImageTexel(image, [u, v])!
      expect(x >= rect.x0 && x <= rect.x1 && y >= rect.y0 && y <= rect.y1).toBe(true)
    }
})

test('UV fora da folha é presa à borda; UV achatada vira uma coluna; inválida ou ausente é nula', () => {
  const image = { width: 8, height: 8 }
  expect(
    scenePaintFaceBounds(
      triangle([
        [-0.5, 0.5],
        [1.5, 0.5],
        [0.5, 2],
      ]),
      'f',
      image,
    ),
  ).toEqual({ x0: 0, y0: 4, x1: 7, y1: 7 })
  expect(
    scenePaintFaceBounds(
      triangle([
        [0.5, 0.25],
        [0.5, 0.5],
        [0.5, 0.75],
      ]),
      'f',
      image,
    ),
  ).toEqual({ x0: 4, y0: 2, x1: 4, y1: 5 })
  expect(
    scenePaintFaceBounds(
      triangle([
        [Number.NaN, 0],
        [1, 0],
        [0, 1],
      ]),
      'f',
      image,
    ),
  ).toBeNull()
  expect(scenePaintFaceBounds(triangle([[0, 0]]), 'outra', image)).toBeNull()
  expect(scenePaintFaceBounds(box(), 'inventada', image)).toBeNull()
})

test('malha com UV contínua: o limite é a ilha inteira, não o triângulo; com costura, cada um', () => {
  const image = { width: 10, height: 10 }
  const quad = (seam: boolean): SceneMeshGeometry => ({
    id: seam ? 'costura' : 'continua',
    kind: 'mesh',
    vertices: { a: [0, 0, 0], b: [1, 0, 0], c: [1, 1, 0], d: [0, 1, 0] },
    faces: {
      left: {
        corners: [
          { vertexId: 'a', uv: [0.1, 0.1] },
          { vertexId: 'b', uv: [0.5, 0.1] },
          { vertexId: 'c', uv: [0.5, 0.5] },
        ],
      },
      right: {
        corners: [
          { vertexId: 'a', uv: seam ? [0.6, 0.1] : [0.1, 0.1] },
          { vertexId: 'c', uv: seam ? [0.9, 0.5] : [0.5, 0.5] },
          { vertexId: 'd', uv: seam ? [0.6, 0.5] : [0.1, 0.5] },
        ],
      },
    },
    looseEdges: [],
  })
  const island = { x0: 1, y0: 1, x1: 4, y1: 4 }
  expect(scenePaintFaceBounds(quad(false), 'left', image)).toEqual(island)
  expect(scenePaintFaceBounds(quad(false), 'right', image)).toEqual(island)
  expect(scenePaintFaceBounds(quad(true), 'left', image)).toEqual(island)
  expect(scenePaintFaceBounds(quad(true), 'right', image)).toEqual({ x0: 6, y0: 1, x1: 8, y1: 4 })
})
