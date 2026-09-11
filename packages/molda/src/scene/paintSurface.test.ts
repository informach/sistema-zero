import { describe, expect, test } from 'bun:test'
import { skinDim } from '../model/shapes'
import { makeModel } from '../testing/fixtures'
import { sceneUvOverlapArea } from '../testing/sceneUvOverlapOracle'
import { createSceneMaterialImage } from './appearanceCommands'
import {
  addScenePrimitive,
  convertSceneNodesToMesh,
  editSceneMesh,
  groupSceneNodes,
  setSceneNodeFlag,
} from './commands'
import type { ScenePixelRegion } from './composite'
import { compositeSceneImage, sceneBaseColor, scenePalette } from './composite'
import type {
  ModelSceneNode,
  MoldaSceneDocument,
  SceneGeometry,
  SceneMeshGeometry,
  ScenePathGeometry,
} from './document'
import { sceneToJson } from './documentJson'
import { paintSceneImage } from './imagePaint'
import { SCENE_LIMITS } from './limits'
import { inspectMeshFaceFrame } from './meshFaceFrame'
import { migrateLegacyModel } from './migrateLegacy'
import { ensureScenePaintSurface, findScenePaintTarget } from './paintSurface'
import { scenePaintFaceBounds } from './paintSurfaceBounds'
import { readSceneDocument } from './readDocument'

const counter = (prefix = 'id') => {
  let n = 0
  return () => `${prefix}${++n}`
}
const empty = () => migrateLegacyModel(makeModel({ parts: [] })).document

function withShape(kind: 'box' | 'wedge' | 'cylinder' | 'sphere') {
  const nextId = counter()
  const document = addScenePrimitive(empty(), kind, 'peça', nextId)
  return { document, node: meshNode(document, document.nodes.at(-1)!.id), nextId }
}

function meshNode(document: MoldaSceneDocument, id: string) {
  const node = document.nodes.find((entry) => entry.id === id)
  if (node?.kind !== 'mesh') throw new Error('Peça ausente.')
  return node
}
const geometryOf = (document: MoldaSceneDocument, id: string) =>
  document.geometries.find((entry) => entry.id === meshNode(document, id).geometryId)!

function ready(result: ReturnType<typeof ensureScenePaintSurface>) {
  if (result.status !== 'ready') throw new Error(`Esperava pronto, veio ${result.status}.`)
  expect(readSceneDocument(sceneToJson(result.document)).status).toBe('valid')
  return result
}

const overlaps = (a: ScenePixelRegion, b: ScenePixelRegion) =>
  !(a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0)

function faceRects(document: MoldaSceneDocument, nodeId: string, imageId: string, keys: string[]) {
  const image = document.images.find((entry) => entry.id === imageId)!
  const geometry = geometryOf(document, nodeId)
  return keys.map((key) => {
    const rect = scenePaintFaceBounds(geometry, key, image)
    if (!rect) throw new Error(`Face ${key} sem limite.`)
    return rect
  })
}

function expectDisjoint(rects: ScenePixelRegion[]) {
  for (let i = 0; i < rects.length; i++)
    for (let j = i + 1; j < rects.length; j++)
      expect(overlaps(rects[i]!, rects[j]!), `${i} e ${j} se sobrepõem`).toBe(false)
}

/** A peça não muda de aparência: o índice 0 mostra a cor base, pixel por pixel. */
function expectUnchangedLook(document: MoldaSceneDocument, materialId: string, imageId: string) {
  const palette = scenePalette(document)
  const material = document.materials.find((entry) => entry.id === materialId)!
  const image = document.images.find((entry) => entry.id === imageId)!
  expect(image.encoding).toBe('indexed')
  expect(image.layers).toHaveLength(1)
  expect(image.layers[0]!.pixels.every((value) => value === 0)).toBe(true)
  const base = sceneBaseColor(material, palette)
  const pixels = compositeSceneImage(image, palette, base)
  const expected = base.map((value) => Math.round(value * 255))
  for (let i = 0; i < pixels.length; i += 4)
    expect([...pixels.subarray(i, i + 4)]).toEqual(expected)
}

describe('formas: um bloco por superfície, no tamanho da pele do editor antigo', () => {
  test('caixa: seis blocos que não se tocam, um passo só e nada muda de aparência', () => {
    const { document, node, nextId } = withShape('box')
    expect(findScenePaintTarget(document, { nodeId: node.id })).toBeNull()
    const result = ready(ensureScenePaintSurface(document, { nodeId: node.id }, nextId))
    expect(result.created).toBe(true)
    expect(result.document.images).toHaveLength(document.images.length + 1)
    expect(result.target.materialId).toBe(node.materialId)
    const keys = ['px', 'nx', 'py', 'ny', 'pz', 'nz']
    const rects = faceRects(result.document, node.id, result.target.imageId, keys)
    expectDisjoint(rects)
    const side = skinDim(2, result.document.settings.texelsPerUnit)
    for (const rect of rects) {
      expect(rect.x1 - rect.x0 + 1).toBe(side)
      expect(rect.y1 - rect.y0 + 1).toBe(side)
    }
    expectUnchangedLook(result.document, result.target.materialId, result.target.imageId)
    // Idempotente: a segunda vez só acha o alvo, sem nova revisão.
    const again = ready(ensureScenePaintSurface(result.document, { nodeId: node.id }, nextId))
    expect(again.created).toBe(false)
    expect(again.document).toBe(result.document)
    expect(again.target).toEqual(result.target)
    expect(findScenePaintTarget(result.document, { nodeId: node.id, faceId: 'py' })).toEqual(
      result.target,
    )
  })

  test('rampa e cilindro: cada superfície no seu bloco; bola: a folha inteira, UV identidade', () => {
    const wedge = withShape('wedge')
    const w = ready(
      ensureScenePaintSurface(wedge.document, { nodeId: wedge.node.id }, wedge.nextId),
    )
    expectDisjoint(
      faceRects(w.document, wedge.node.id, w.target.imageId, ['ny', 'nz', 'slope', 'px', 'nx']),
    )
    const cylinder = withShape('cylinder')
    const c = ready(
      ensureScenePaintSurface(cylinder.document, { nodeId: cylinder.node.id }, cylinder.nextId),
    )
    const tpu = c.document.settings.texelsPerUnit
    const [side, top, bottom] = faceRects(c.document, cylinder.node.id, c.target.imageId, [
      'side',
      'top',
      'bottom',
    ])
    expectDisjoint([side!, top!, bottom!])
    expect(side!.x1 - side!.x0 + 1).toBe(skinDim(2 * Math.PI, tpu))
    expect(top!.x1 - top!.x0 + 1).toBe(skinDim(2, tpu))
    const sphere = withShape('sphere')
    const s = ready(
      ensureScenePaintSurface(sphere.document, { nodeId: sphere.node.id }, sphere.nextId),
    )
    const image = s.document.images.find((entry) => entry.id === s.target.imageId)!
    expect([image.width, image.height]).toEqual([skinDim(2 * Math.PI, tpu), skinDim(Math.PI, tpu)])
    const geometry = geometryOf(s.document, sphere.node.id)
    if (geometry.kind !== 'sphere') throw new Error('Bola ausente.')
    expect(geometry.surfaces.around?.uv).toEqual({ origin: [0, 0], u: [1, 0], v: [0, 1] })
    expectUnchangedLook(s.document, s.target.materialId, s.target.imageId)
  })

  test('tubo com tampas: a lateral mede a volta e o comprimento, as tampas o diâmetro', () => {
    const base = empty()
    const path: ScenePathGeometry = {
      id: 'tubo-geo',
      kind: 'path',
      points: [
        { id: 'p0', position: [0, 0, 0] },
        { id: 'p1', position: [0, 3, 0] },
      ],
      radius: 0.5,
      around: 8,
      endCaps: true,
      surfaces: {},
    }
    const document = withNode(base, path)
    const result = ready(ensureScenePaintSurface(document, { nodeId: 'peca' }, counter()))
    const tpu = document.settings.texelsPerUnit
    const [side, top] = faceRects(result.document, 'peca', result.target.imageId, [
      'side',
      'top',
      'bottom',
    ])
    expect([side!.x1 - side!.x0 + 1, side!.y1 - side!.y0 + 1]).toEqual([
      skinDim(Math.PI, tpu),
      skinDim(3, tpu),
    ])
    expect(top!.x1 - top!.x0 + 1).toBe(skinDim(1, tpu))
    expectDisjoint(
      faceRects(result.document, 'peca', result.target.imageId, ['side', 'top', 'bottom']),
    )
  })
})

function withNode(document: MoldaSceneDocument, geometry: SceneGeometry): MoldaSceneDocument {
  const node: ModelSceneNode = {
    id: 'peca',
    kind: 'mesh',
    name: 'peça',
    parentId: null,
    geometryId: geometry.id,
    materialId: 'mat',
    hidden: false,
    locked: false,
    transform: { kind: 'trs', translation: [0, 0, 0], rotation: [0, 0, 0, 1], scale: [1, 1, 1] },
  }
  const next: MoldaSceneDocument = {
    ...document,
    nodes: [...document.nodes, node],
    geometries: [...document.geometries, geometry],
    materials: [
      ...document.materials,
      {
        id: 'mat',
        name: 'mat',
        baseColor: { kind: 'palette', index: 8 },
        roughness: 1,
        metalness: 0,
        doubleSided: false,
      },
    ],
  }
  const read = readSceneDocument(sceneToJson(next))
  if (read.status !== 'valid') throw new Error('Documento de teste inválido.')
  return read.document
}

describe('malha: faces espalhadas pela UV automática, sem sobrepor', () => {
  function meshBox() {
    const { document, node, nextId } = withShape('box')
    return { document: convertSceneNodesToMesh(document, [node.id], nextId), node, nextId }
  }

  test('a caixa virada malha ganha uma folha quadrada, sem nenhuma face por cima de outra', () => {
    const { document, node, nextId } = meshBox()
    const result = ready(ensureScenePaintSurface(document, { nodeId: node.id }, nextId))
    const mesh = geometryOf(result.document, node.id) as SceneMeshGeometry
    expect(sceneUvOverlapArea(mesh)).toBe(0)
    const image = result.document.images.find((entry) => entry.id === result.target.imageId)!
    expect(image.width).toBe(image.height)
    expect(Math.log2(image.width) % 1).toBe(0)
    for (const face of Object.values(mesh.faces))
      for (const { uv } of face.corners)
        for (const value of uv) expect(value >= 0 && value <= 1).toBe(true)
    expectDisjoint(faceRects(result.document, node.id, image.id, Object.keys(mesh.faces)))
    expectUnchangedLook(result.document, result.target.materialId, image.id)
  })

  test('face torta: pergunta antes; com o sim, divide em triângulos e pinta, tudo num passo', () => {
    const { document, node, nextId } = meshBox()
    const bent = editSceneMesh(
      document,
      node.id,
      (mesh) => {
        const point = mesh.vertices.v_111!
        return {
          ...mesh,
          vertices: { ...mesh.vertices, v_111: [point[0] + 0.3, point[1] + 0.5, point[2] + 0.4] },
        }
      },
      nextId,
    )
    const before = geometryOf(bent, node.id) as SceneMeshGeometry
    const crooked = Object.keys(before.faces).filter(
      (key) => inspectMeshFaceFrame(before, key) === 'crooked',
    )
    expect(crooked.sort()).toEqual(['px', 'py', 'pz'])
    const asked = ensureScenePaintSurface(bent, { nodeId: node.id }, nextId)
    expect(asked).toEqual({ status: 'crooked', faces: expect.arrayContaining(crooked) })
    const split = ready(
      ensureScenePaintSurface(bent, { nodeId: node.id, splitCrookedFaces: true }, nextId),
    )
    const mesh = geometryOf(split.document, node.id) as SceneMeshGeometry
    expect(Object.keys(mesh.faces)).toHaveLength(Object.keys(before.faces).length + 3)
    for (const key of Object.keys(mesh.faces)) expect(inspectMeshFaceFrame(mesh, key)).toBe('ok')
    expect(sceneUvOverlapArea(mesh)).toBe(0)
  })

  test('face sem área fica de fora da folha; tocar nela diretamente é recusado', () => {
    const mesh: SceneMeshGeometry = {
      id: 'malha',
      kind: 'mesh',
      vertices: {
        a: [0, 0, 0],
        b: [1, 0, 0],
        c: [1, 1, 0],
        d: [0, 1, 0],
        e: [2, 0, 0],
        f: [3, 0, 0],
      },
      faces: {
        quad: {
          corners: [
            { vertexId: 'a', uv: [0, 0] },
            { vertexId: 'b', uv: [1, 0] },
            { vertexId: 'c', uv: [1, 1] },
            { vertexId: 'd', uv: [0, 1] },
          ],
        },
        flat: {
          corners: [
            { vertexId: 'b', uv: [0.25, 0.25] },
            { vertexId: 'e', uv: [0.5, 0.25] },
            { vertexId: 'f', uv: [0.75, 0.25] },
          ],
        },
      },
      looseEdges: [],
    }
    const document = withNode(empty(), mesh)
    expect(inspectMeshFaceFrame(mesh, 'flat')).toBe('degenerate')
    expect(() => ensureScenePaintSurface(document, { nodeId: 'peca', faceId: 'flat' })).toThrow(
      'Essa face não tem área para pintar.',
    )
    const result = ready(ensureScenePaintSurface(document, { nodeId: 'peca' }, counter()))
    const laid = geometryOf(result.document, 'peca') as SceneMeshGeometry
    expect(laid.faces.flat).toEqual(mesh.faces.flat)
    expect(laid.faces.quad).not.toEqual(mesh.faces.quad)
  })
})

describe('o que já existe nunca se move', () => {
  test('peça do editor antigo: a face pintada continua com a tinta dela; o resto ganha folha nova', () => {
    const document = migrateLegacyModel(makeModel()).document
    const painted = ready(ensureScenePaintSurface(document, { nodeId: 'body', faceId: 'py' }))
    expect(painted.created).toBe(false)
    expect(painted.document).toBe(document)
    expect(painted.target.imageId).toBe('image:body:py')
    // Sem face tocada, a pintura que a peça já mostra serve: entrar na aba não muda nada.
    const entering = ready(ensureScenePaintSurface(document, { nodeId: 'body' }, counter()))
    expect(entering.document).toBe(document)
    expect(entering.target).toEqual(painted.target)
    expect(findScenePaintTarget(document, { nodeId: 'body' })).toEqual(painted.target)
    // Tocar numa face sem tinta prepara a folha das faces que usam o material da peça.
    const rest = ready(
      ensureScenePaintSurface(document, { nodeId: 'body', faceId: 'px' }, counter()),
    )
    expect(rest.created).toBe(true)
    const before = geometryOf(document, 'body')
    const after = geometryOf(rest.document, 'body')
    if (before.kind !== 'box' || after.kind !== 'box') throw new Error('Caixa ausente.')
    expect(after.surfaces.py).toEqual(before.surfaces.py)
    expectDisjoint(
      faceRects(rest.document, 'body', rest.target.imageId, ['px', 'nx', 'ny', 'pz', 'nz']),
    )
  })

  test('material de outra peça: isola antes; com imagem, a cópia leva a tinta e a UV fica', () => {
    const { document, node, nextId } = withShape('box')
    const two = addScenePrimitive(document, 'box', 'outra', nextId)
    const other = meshNode(two, two.nodes.at(-1)!.id)
    const sharing = {
      ...two,
      nodes: two.nodes.map((entry) =>
        entry.id === other.id ? { ...other, materialId: node.materialId } : entry,
      ),
    }
    const first = ready(ensureScenePaintSurface(sharing, { nodeId: node.id }, nextId))
    expect(first.target.materialId).not.toBe(node.materialId)
    expect(meshNode(first.document, other.id).materialId).toBe(node.materialId)
    expect(
      first.document.materials.find((entry) => entry.id === node.materialId)?.colorImageId,
    ).toBeUndefined()
    // Agora a outra peça passa a dividir o material JÁ pintado.
    const painted = paintSceneImage(first.document, first.target, {
      from: [1, 1],
      to: [6, 1],
      color: 3,
      brush: 2,
    })
    const shared = {
      ...painted,
      nodes: painted.nodes.map((entry) =>
        entry.id === other.id ? { ...other, materialId: first.target.materialId } : entry,
      ),
    }
    const copied = ready(ensureScenePaintSurface(shared, { nodeId: other.id }, nextId))
    expect(copied.created).toBe(true)
    expect(copied.target.imageId).not.toBe(first.target.imageId)
    const source = shared.images.find((entry) => entry.id === first.target.imageId)!
    const copy = copied.document.images.find((entry) => entry.id === copied.target.imageId)!
    expect(copy.layers[0]!.pixels).toEqual(source.layers[0]!.pixels)
    expect(geometryOf(copied.document, other.id)).toBe(geometryOf(shared, other.id))
  })

  test('geometria dividida: só esta peça ganha a UV nova, a outra fica com a de antes', () => {
    const { document, node, nextId } = withShape('box')
    const two = addScenePrimitive(document, 'box', 'gêmea', nextId)
    const twin = meshNode(two, two.nodes.at(-1)!.id)
    const sharing = {
      ...two,
      nodes: two.nodes.map((entry) =>
        entry.id === twin.id ? { ...twin, geometryId: node.geometryId } : entry,
      ),
      geometries: two.geometries.filter((entry) => entry.id !== twin.geometryId),
    }
    const result = ready(ensureScenePaintSurface(sharing, { nodeId: node.id }, nextId))
    expect(meshNode(result.document, node.id).geometryId).not.toBe(node.geometryId)
    expect(geometryOf(result.document, twin.id)).toBe(geometryOf(sharing, twin.id))
  })
})

describe('recusas', () => {
  test('peça travada, ou dentro de um grupo travado', () => {
    const { document, node, nextId } = withShape('box')
    const locked = setSceneNodeFlag(document, [node.id], 'locked', true)
    expect(() => ensureScenePaintSurface(locked, { nodeId: node.id }, nextId)).toThrow('Destrave')
    expect(findScenePaintTarget(locked, { nodeId: node.id })).toBeNull()
    const grouped = groupSceneNodes(document, [node.id], { name: 'grupo', nextId })
    const group = grouped.nodes.find((entry) => entry.kind === 'group')!
    const inherited = setSceneNodeFlag(grouped, [group.id], 'locked', true)
    expect(() => ensureScenePaintSurface(inherited, { nodeId: node.id }, nextId)).toThrow(
      'Destrave',
    )
  })

  test('material só com relevo, brilho ou metal: recusa sem copiar nada', () => {
    const { document, node, nextId } = withShape('box')
    const mapped = createSceneMaterialImage(
      document,
      node.materialId,
      { kind: 'normal', name: 'relevo', width: 4, height: 4, encoding: 'rgba' },
      nextId,
    )
    expect(() => ensureScenePaintSurface(mapped, { nodeId: node.id }, nextId)).toThrow('relevo')
  })

  test('pintura com todas as camadas escondidas pede para mostrar uma', () => {
    const { document, node, nextId } = withShape('box')
    const result = ready(ensureScenePaintSurface(document, { nodeId: node.id }, nextId))
    const hidden = {
      ...result.document,
      images: result.document.images.map((image) =>
        image.id === result.target.imageId
          ? { ...image, layers: image.layers.map((layer) => ({ ...layer, visible: false })) }
          : image,
      ),
    }
    expect(findScenePaintTarget(hidden, { nodeId: node.id })).toBeNull()
    expect(() => ensureScenePaintSurface(hidden, { nodeId: node.id }, nextId)).toThrow(
      'Mostre uma camada',
    )
  })

  test('sem espaço para pintura: recusa inteira, sem revisão pela metade', () => {
    const { document, node, nextId } = withShape('box')
    const side = SCENE_LIMITS.imageSide
    const count = SCENE_LIMITS.pixelBytes / (side * side * 4)
    const full: MoldaSceneDocument = {
      ...document,
      images: Array.from({ length: count }, (_, i) => ({
        id: `cheia${i}`,
        name: 'cheia',
        width: side,
        height: side,
        encoding: 'rgba' as const,
        layers: [
          {
            id: `camada${i}`,
            name: 'cheia',
            visible: true,
            opacity: 1,
            pixels: new Uint8Array(side * side * 4),
          },
        ],
      })),
    }
    expect(() => ensureScenePaintSurface(full, { nodeId: node.id }, nextId)).toThrow(
      'ultrapassa o espaço para pintura',
    )
  })

  test('face que não existe mais', () => {
    const { document, node, nextId } = withShape('box')
    expect(() =>
      ensureScenePaintSurface(document, { nodeId: node.id, faceId: 'side' }, nextId),
    ).toThrow('Essa face mudou')
    expect(findScenePaintTarget(document, { nodeId: node.id, faceId: 'side' })).toBeNull()
  })
})
