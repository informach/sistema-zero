import { describe, expect, test } from 'bun:test'
import { makeModel } from '../testing/fixtures'
import { addScenePrimitive } from './commands'
import type { MoldaSceneDocument, SceneMeshGeometry, Vec2 } from './document'
import { migrateLegacyModel } from './migrateLegacy'
import {
  sceneFaceViewSize,
  sceneFaceViewTexel,
  scenePaintFaceView,
  sceneSheetView,
} from './paintFaceView'
import { ensureScenePaintSurface } from './paintSurface'
import { parametricMesh } from './parametricGeometry'

const counter = () => {
  let n = 0
  return () => `id${++n}`
}

function prepared(kind: 'box' | 'wedge' | 'cylinder' | 'sphere') {
  const nextId = counter()
  const base = addScenePrimitive(
    migrateLegacyModel(makeModel({ parts: [] })).document,
    kind,
    'peça',
    nextId,
  )
  const nodeId = base.nodes.at(-1)!.id
  const result = ensureScenePaintSurface(base, { nodeId }, nextId)
  if (result.status !== 'ready') throw new Error('Esperava pronto.')
  const document: MoldaSceneDocument = result.document
  const node = document.nodes.find((entry) => entry.id === nodeId)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  const geometry = document.geometries.find((entry) => entry.id === node.geometryId)!
  const image = document.images.find((entry) => entry.id === result.target.imageId)!
  return { geometry, image }
}

/** Um quadrado de lado 1 com os cantos e a UV pedidos, na ordem do ciclo. */
function quad(points: Array<[number, number, number]>, uvs: Vec2[]): SceneMeshGeometry {
  return {
    id: 'malha',
    kind: 'mesh',
    vertices: Object.fromEntries(points.map((point, i) => [`v${i}`, point])),
    faces: {
      f: { corners: points.map((_, i) => ({ vertexId: `v${i}`, uv: uvs[i]! })) },
    },
    looseEdges: [],
  }
}

/** A frente (+Z), de fora: embaixo à esquerda, embaixo à direita, em cima à direita, em cima à esquerda. */
const FRONT: Array<[number, number, number]> = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
]
const IMAGE = { width: 8, height: 8 }

describe('a face vista de fora, em pé', () => {
  test('as formas ficam como no editor antigo: a linha zero da folha em cima da face', () => {
    const faces = {
      box: ['px', 'nx', 'py', 'ny', 'pz', 'nz'],
      wedge: ['px', 'nx', 'ny', 'nz', 'slope'],
      cylinder: ['side', 'top', 'bottom'],
      sphere: ['around'],
    } as const
    for (const [kind, keys] of Object.entries(faces)) {
      const { geometry, image } = prepared(kind as keyof typeof faces)
      for (const key of keys) {
        const view = scenePaintFaceView(geometry, key, image)
        expect(view, `${kind} ${key}`).toMatchObject({
          transpose: false,
          flipX: false,
          flipY: false,
        })
      }
    }
  })

  test('o canto de cima à esquerda da frente da caixa é a primeira célula da vista', () => {
    const { geometry, image } = prepared('box')
    if (geometry.kind !== 'box') throw new Error('Esperava a caixa.')
    const view = scenePaintFaceView(geometry, 'pz', image)!
    const { mesh } = parametricMesh(geometry)
    // O canto de cima à esquerda, olhando a frente de fora: x menor, y maior, z maior.
    const corner = mesh.faces.pz!.corners.find((entry) => {
      const point = mesh.vertices[entry.vertexId]!
      return (
        point[0] === geometry.from[0] && point[1] === geometry.to[1] && point[2] === geometry.to[2]
      )
    })!
    const texel = [Math.floor(corner.uv[0] * image.width), Math.floor(corner.uv[1] * image.height)]
    expect(sceneFaceViewTexel(view, 0, 0)).toEqual(texel as [number, number])
  })

  test('malha com a UV do arquivo, V para cima: a última linha da região vai em cima', () => {
    const geometry = quad(FRONT, [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
    const view = scenePaintFaceView(geometry, 'f', IMAGE)!
    expect(view).toMatchObject({ transpose: false, flipX: false, flipY: true })
    expect(sceneFaceViewTexel(view, 0, 0)).toEqual([0, 7])
    expect(sceneFaceViewTexel(view, 7, 7)).toEqual([7, 0])
  })

  test('UV espelhada: a coluna zero da folha vai para a direita', () => {
    const geometry = quad(FRONT, [
      [1, 0],
      [0, 0],
      [0, 1],
      [1, 1],
    ])
    expect(scenePaintFaceView(geometry, 'f', IMAGE)).toMatchObject({
      transpose: false,
      flipX: true,
      flipY: true,
    })
  })

  test('UV deitada: as colunas da vista correm pelas linhas da folha', () => {
    // O U sobe pela face, o V anda para a direita.
    const geometry = quad(FRONT, [
      [0, 0],
      [0, 1],
      [1, 1],
      [1, 0],
    ])
    const view = scenePaintFaceView(geometry, 'f', { width: 8, height: 4 })!
    expect(view).toMatchObject({ transpose: true, flipX: true, flipY: false })
    // Em cima à esquerda: o U mais alto (a última coluna da folha) e o V mais baixo.
    expect(sceneFaceViewTexel(view, 0, 0)).toEqual([7, 0])
    expect(sceneFaceViewSize(view)).toEqual({ width: 4, height: 8 })
  })

  test('face deitada: olhando de cima, o fundo da peça fica em cima; de baixo, a frente', () => {
    const top = quad(
      [
        [0, 1, 0],
        [0, 1, 1],
        [1, 1, 1],
        [1, 1, 0],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
      ],
    )
    expect(scenePaintFaceView(top, 'f', IMAGE)).toMatchObject({
      transpose: false,
      flipX: false,
      flipY: false,
    })
    const bottom = quad(
      [
        [0, 0, 1],
        [0, 0, 0],
        [1, 0, 0],
        [1, 0, 1],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 0],
      ],
    )
    expect(scenePaintFaceView(bottom, 'f', IMAGE)).toMatchObject({
      transpose: false,
      flipX: false,
      flipY: false,
    })
  })

  test('sem área de UV, a folha crua; face que não existe, nada', () => {
    const flat = quad(FRONT, [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ])
    const region = { x0: 2, y0: 1, x1: 3, y1: 5 }
    expect(scenePaintFaceView(flat, 'f', IMAGE, region)).toEqual(sceneSheetView(region))
    expect(scenePaintFaceView(flat, 'outra', IMAGE)).toBeNull()
  })

  test('a região pedida (o quadro de uma pintura que se mexe) vale no lugar da face inteira', () => {
    const geometry = quad(FRONT, [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ])
    const region = { x0: 4, y0: 4, x1: 7, y1: 7 }
    const view = scenePaintFaceView(geometry, 'f', IMAGE, region)!
    expect(view.region).toEqual(region)
    expect(sceneFaceViewTexel(view, 0, 0)).toEqual([4, 7])
  })
})
