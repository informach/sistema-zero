import { describe, expect, test } from 'bun:test'
import { createPart, type MeshFaceKey, type MoldaMesh, type Vec3 } from '../core/model'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { partTriangleCount } from './geometry'
import { boxMesh, faceNormal, faceVertices, meshIssues } from './mesh'
import {
  applyMeshFix,
  createFace,
  extrudeEdges,
  extrudeFaces,
  flipFaces,
  isClosedMesh,
  loopCut,
  mergeVertices,
  splitQuads,
} from './meshTools'
import { faceSkinSize } from './shapes'

const TOP = ['v_010', 'v_011', 'v_111', 'v_110']

function cubeModel(mesh: MoldaMesh = boxMesh([0, 0, 0], [2, 2, 2]), snap: 1 | 0.5 = 1) {
  return makeModel({
    snap,
    parts: [
      createPart({
        id: 'm',
        name: 'malha',
        shape: 'mesh',
        from: [0, 0, 0],
        to: [2, 2, 2],
        color: 2,
        mesh,
      }),
    ],
  })
}

function meshOf(model: ReturnType<typeof cubeModel>): MoldaMesh {
  const mesh = model.parts.find((p) => p.id === 'm')?.mesh
  if (!mesh) throw new Error('sem malha')
  return mesh
}

describe('Puxar', () => {
  test('uma face: a tampa sobe, 4 paredes nascem, a malha segue fechada e sem face virada', () => {
    const model = cubeModel()
    const result = extrudeFaces(model, 'm', TOP, 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(10)
    expect(Object.keys(mesh.vertices)).toHaveLength(12)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshIssues(mesh).filter((issue) => issue.kind === 'flipped')).toEqual([])
    expect(result.vertices).toHaveLength(4)
    for (const key of result.vertices) expect(mesh.vertices[key]?.[1]).toBe(3)
    // A tampa mantém a chave da face antiga (a pele migra) e aponta para cima.
    const cap = faceVertices(mesh, 'f_py')
    if (!cap) throw new Error('sem tampa')
    expect(faceNormal(cap)).toEqual([0, 1, 0])
    expect(result.model.parts[0]?.to).toEqual([2, 3, 2])
  })

  test('duas faces vizinhas: paredes só na BORDA da região (a aresta interna não ganha parede)', () => {
    const model = cubeModel()
    const selection = [...TOP, 'v_101', 'v_100']
    const result = extrudeFaces(model, 'm', selection, 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(12)
    expect(isClosedMesh(mesh)).toBe(true)
  })

  test('a pele da face puxada migra com ela', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, () => 3)
    const result = extrudeFaces(model, 'm', TOP, 2)
    expect(result?.model.parts[0]?.faces.f_py).toBe(part.faces.f_py)
  })

  test('arestas: cada uma vira uma aba; vértice compartilhado sobe uma vez', () => {
    const model = cubeModel()
    const result = extrudeEdges(model, 'm', ['v_010', 'v_011', 'v_111'], 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(8)
    expect(result.vertices).toHaveLength(3)
  })

  test('sem face nem aresta na seleção, ou peça que não é malha: null', () => {
    const model = cubeModel()
    expect(extrudeFaces(model, 'm', ['v_000'], 1)).toBeNull()
    expect(extrudeEdges(model, 'm', ['v_000'], 1)).toBeNull()
    expect(extrudeFaces(makeModel(), 'body', TOP, 1)).toBeNull()
  })
})

describe('Cortar no meio', () => {
  test('o anel atravessa os 4 quads e fecha; a malha segue fechada', () => {
    const model = cubeModel()
    const result = loopCut(model, 'm', ['v_010', 'v_011'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(10)
    expect(Object.keys(mesh.vertices)).toHaveLength(12)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(result.vertices).toHaveLength(4)
    expect(result.snapChanged).toBe(false)
    expect(
      partTriangleCount(
        result.model.parts[0] ??
          createPart({ name: 'x', from: [0, 0, 0], to: [1, 1, 1], color: 1 }),
      ),
    ).toBe(20)
  })

  test('corte que cai no meio de um bloco liga o encaixe de meio bloco no mesmo commit', () => {
    const model = cubeModel(boxMesh([0, 0, 0], [1, 1, 1]))
    const result = loopCut(model, 'm', ['v_010', 'v_011'])
    if (!result) throw new Error('sem resultado')
    expect(result.snapChanged).toBe(true)
    expect(result.model.snap).toBe(0.5)
  })

  test('a pele do quad cortado é reprojetada nas duas metades', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_pz', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    // Metade esquerda (u < 0,5) pintada de 3, direita de 5.
    part.faces.f_pz = paintedSkin(size.width, size.height, (x) => (x < size.width / 2 ? 3 : 5))
    // O corte pela aresta de cima da face +z (v_011 → v_111) divide a face ao meio em u.
    const result = loopCut(model, 'm', ['v_011', 'v_111'])
    if (!result) throw new Error('sem resultado')
    const next = result.model.parts[0]
    const painted = Object.entries(next?.faces ?? {}).filter(
      ([key]) => (next?.mesh?.faces[key as MeshFaceKey]?.v ?? []).length === 4,
    )
    const values = painted.map(([, skin]) => new Set(skin?.data)).map((set) => [...set].sort())
    // Cada metade só tem a sua cor.
    expect(values.some((set) => set.join(',') === '3')).toBe(true)
    expect(values.some((set) => set.join(',') === '5')).toBe(true)
  })

  test('aresta que não existe: null', () => {
    expect(loopCut(cubeModel(), 'm', ['v_010', 'v_zzz'])).toBeNull()
  })
})

describe('Juntar, Fechar, Virar, Dividir', () => {
  test('juntar dois pontos derruba as faces degeneradas em triângulos', () => {
    const model = cubeModel()
    const result = mergeVertices(model, 'm', ['v_110', 'v_111'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.vertices)).toHaveLength(7)
    expect(Object.keys(mesh.faces)).toHaveLength(6)
    expect(partTriangleCount(result.model.parts[0] ?? model.parts[0]!)).toBe(10)
    expect(mesh.vertices.v_110).toEqual([2, 2, 1])
    expect(mergeVertices(model, 'm', ['v_110'])).toBeNull()
  })

  test('fechar face refaz a tampa apagada, virada para fora', () => {
    const model = cubeModel()
    const open = structuredClone(model)
    const part = open.parts[0]
    if (!part?.mesh) throw new Error('sem peça')
    delete part.mesh.faces.f_py
    const result = createFace(open, 'm', TOP)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(6)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshIssues(mesh)).toEqual([])
    // Já existe uma face com esses vértices: nada a fazer.
    expect(createFace(result.model, 'm', TOP)).toBeNull()
    expect(createFace(model, 'm', ['v_000', 'v_111'])).toBeNull()
  })

  test('virar face inverte a normal e espelha a pele (que fica no lugar); virar de novo desfaz', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, (x) => (x === 0 ? 3 : 0))
    const flipped = flipFaces(model, 'm', ['f_py'])
    if (!flipped) throw new Error('sem resultado')
    const mesh = meshOf(flipped.model)
    const points = faceVertices(mesh, 'f_py')
    if (!points) throw new Error('sem face')
    expect(faceNormal(points)).toEqual([0, -1, 0])
    expect(meshIssues(mesh).some((issue) => issue.kind === 'flipped')).toBe(true)
    const skin = flipped.model.parts[0]?.faces.f_py
    expect(skin?.data[size.width - 1]).toBe(3)
    const back = flipFaces(flipped.model, 'm', ['f_py'])
    expect(back && meshIssues(meshOf(back.model))).toEqual([])
  })

  test('dividir um quad vira dois triângulos com a pele reprojetada', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_pz', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_pz = paintedSkin(size.width, size.height, () => 4)
    const result = splitQuads(model, 'm', ['f_pz'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(7)
    expect(partTriangleCount(result.model.parts[0] ?? part)).toBe(12)
    expect(isClosedMesh(mesh)).toBe(true)
    const skins = Object.values(result.model.parts[0]?.faces ?? {})
    expect(skins).toHaveLength(2)
  })

  test('applyMeshFix conserta cada tipo de problema', () => {
    const cube = boxMesh([0, 0, 0], [2, 2, 2])
    const overlap: MoldaMesh = {
      ...cube,
      vertices: { ...cube.vertices, v_111: [...(cube.vertices.v_110 as Vec3)] as Vec3 },
    }
    const merged = applyMeshFix(cubeModel(overlap), 'm', {
      kind: 'overlap',
      vertices: ['v_110', 'v_111'],
    })
    expect(merged && Object.keys(meshOf(merged.model).vertices)).toHaveLength(7)
    const bent: MoldaMesh = { ...cube, vertices: { ...cube.vertices, v_111: [2, 2, 2.5] } }
    const split = applyMeshFix(cubeModel(bent), 'm', { kind: 'non-planar', face: 'f_py' })
    expect(split && Object.keys(meshOf(split.model).faces)).toHaveLength(7)
    const flipped: MoldaMesh = {
      ...cube,
      faces: { ...cube.faces, f_pz: { v: [...(cube.faces.f_pz?.v ?? [])].reverse() } },
    }
    const fixed = applyMeshFix(cubeModel(flipped), 'm', { kind: 'flipped', face: 'f_pz' })
    expect(fixed && meshIssues(meshOf(fixed.model))).toEqual([])
  })
})
