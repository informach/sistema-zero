import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createPart, type MeshFaceKey, type MoldaMesh, type Vec3 } from '../core/model'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { partTriangleCount } from './geometry'
import { boxMesh, faceNormal, faceVertices, meshIssues } from './mesh'
import {
  applyMeshFix,
  connectVertices,
  createFace,
  createFaceOrEdge,
  extrudeEdges,
  extrudeFaces,
  flipFaces,
  insetFace,
  isClosedMesh,
  loopCut,
  mergeVertices,
  splitQuads,
} from './meshTools'
import { faceSkinSize } from './shapes'

const TOP = ['v_010', 'v_011', 'v_111', 'v_110']
const TOP_FACE: MeshFaceKey[] = ['f_py']

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
    const result = extrudeFaces(model, 'm', TOP_FACE, 1)
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
    const selection: MeshFaceKey[] = ['f_py', 'f_px']
    const result = extrudeFaces(model, 'm', selection, 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(12)
    expect(isClosedMesh(mesh)).toBe(true)
  })

  test('uma aresta de construção é extrudada no eixo automático e vira uma face', () => {
    const mesh: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0] },
      faces: {},
      looseEdges: [['v_a', 'v_b']],
    }
    const model = cubeModel(mesh)
    const result = extrudeEdges(model, 'm', [['v_a', 'v_b']], 1)
    if (!result) throw new Error('sem resultado')
    const next = meshOf(result.model)
    expect(next.looseEdges).toBeUndefined()
    expect(Object.keys(next.faces)).toHaveLength(1)
    expect(result.selection).toHaveLength(1)
    for (const key of result.vertices) expect(next.vertices[key]?.[1]).toBe(1)
    expect(extrudeEdges(model, 'm', [['v_a', 'v_b']], 1, 'x')).toBeNull()
    expect(extrudeEdges(model, 'm', [['v_a', 'v_b']], 1, '-z')).not.toBeNull()
  })

  test('a pele da face puxada migra com ela', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, () => 3)
    const result = extrudeFaces(model, 'm', TOP_FACE, 2)
    expect(result?.model.parts[0]?.faces.f_py).toBe(part.faces.f_py)
  })

  test('arestas: cada uma vira uma aba; vértice compartilhado sobe uma vez', () => {
    const model = cubeModel()
    const result = extrudeEdges(
      model,
      'm',
      [
        ['v_010', 'v_011'],
        ['v_011', 'v_111'],
      ],
      1,
    )
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(8)
    expect(result.vertices).toHaveLength(3)
  })

  test('sem face nem aresta na seleção, ou peça que não é malha: null', () => {
    const model = cubeModel()
    expect(extrudeFaces(model, 'm', [], 1)).toBeNull()
    expect(extrudeEdges(model, 'm', [], 1)).toBeNull()
    expect(extrudeFaces(makeModel(), 'body', TOP_FACE, 1)).toBeNull()
  })

  test('duas faces opostas não viram as seis faces nem movem o cubo inteiro', () => {
    const model = cubeModel()
    expect(extrudeFaces(model, 'm', ['f_py', 'f_ny'], 1)).toBeNull()
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

  test('recusa uma aresta na precisão mínima em vez de derrubar faces ao normalizar', () => {
    const precision = MOLDA_LIMITS.meshPrecision
    const model = cubeModel(boxMesh([0, 0, 0], [precision, precision, precision]), 0.5)

    expect(loopCut(model, 'm', ['v_010', 'v_011'])).toBeNull()
    expect(isClosedMesh(meshOf(model))).toBe(true)
  })

  test('divide um triângulo atingido por dois midpoints sem deixar T-junction', () => {
    const model = cubeModel({
      vertices: {
        a: [0, 0, 0],
        b: [0, 2, 0],
        c: [2, 2, 0],
        d: [2, 0, 0],
        g: [3, 1, 0],
      },
      faces: {
        f_q1: { v: ['a', 'b', 'c', 'd'] },
        f_q2: { v: ['b', 'a', 'd', 'g'] },
        f_t: { v: ['c', 'd', 'g'] },
      },
    })

    const result = loopCut(model, 'm', ['a', 'b'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    const midpoint = Object.entries(mesh.vertices).find(
      ([, point]) => point[0] === 2.5 && point[1] === 0.5 && point[2] === 0,
    )?.[0]
    if (!midpoint) throw new Error('sem midpoint de d-g')
    const terminalFaces = Object.values(mesh.faces).filter((face) => face.v.includes('c'))

    expect(terminalFaces.some((face) => face.v.includes(midpoint))).toBe(true)
    expect(
      Object.values(mesh.faces).some((face) =>
        face.v.some(
          (vertex, index) =>
            (vertex === 'd' && face.v[(index + 1) % face.v.length] === 'g') ||
            (vertex === 'g' && face.v[(index + 1) % face.v.length] === 'd'),
        ),
      ),
    ).toBe(false)
  })

  test('cria de 1 a 8 cortes; vários ficam uniformes e um respeita a posição', () => {
    const positioned = loopCut(cubeModel(), 'm', ['v_010', 'v_011'], {
      cuts: 1,
      position: 25,
    })
    if (!positioned) throw new Error('sem corte posicionado')
    expect(
      positioned.vertices.some((key) => meshOf(positioned.model).vertices[key]?.[2] === 0.5),
    ).toBe(true)

    const multiple = loopCut(cubeModel(), 'm', ['v_010', 'v_011'], { cuts: 3 })
    if (!multiple) throw new Error('sem cortes múltiplos')
    expect(multiple.vertices).toHaveLength(12)
    expect(Object.keys(meshOf(multiple.model).faces)).toHaveLength(18)
    expect(multiple.selection).toHaveLength(12)
    expect(isClosedMesh(meshOf(multiple.model))).toBe(true)
    expect(loopCut(cubeModel(), 'm', ['v_010', 'v_011'], { cuts: 9 })).toBeNull()
  })

  test('divide uma aresta de construção e mantém os segmentos selecionáveis', () => {
    const model = cubeModel({
      vertices: { v_a: [0, 0, 0], v_b: [4, 0, 0] },
      faces: {},
      looseEdges: [['v_a', 'v_b']],
    })
    const result = loopCut(model, 'm', ['v_a', 'v_b'], { cuts: 2 })
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(result.vertices).toHaveLength(2)
    expect(mesh.looseEdges).toHaveLength(3)
    expect(result.selection).toHaveLength(3)
    expect(Object.keys(mesh.faces)).toHaveLength(0)
  })
})

describe('guardas das ferramentas de malha', () => {
  test('peça trancada ou escondida não aceita ferramenta pura', () => {
    const locked = cubeModel()
    const hidden = cubeModel()
    if (!locked.parts[0] || !hidden.parts[0]) throw new Error('sem peça')
    locked.parts[0].locked = true
    hidden.parts[0].hidden = true

    expect(extrudeFaces(locked, 'm', TOP_FACE, 1)).toBeNull()
    expect(loopCut(hidden, 'm', ['v_010', 'v_011'])).toBeNull()
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

  test('fechar face recusa três pontos colineares sem produzir commit vazio', () => {
    const open: MoldaMesh = {
      vertices: {
        v_a: [0, 0, 0],
        v_b: [1, 0, 0],
        v_c: [2, 0, 0],
        v_d: [0, 1, 0],
        v_e: [2, 1, 0],
      },
      faces: {
        f_left: { v: ['v_a', 'v_b', 'v_d'] },
        f_right: { v: ['v_b', 'v_c', 'v_e'] },
      },
    }
    const model = cubeModel(open)

    expect(createFace(model, 'm', ['v_a', 'v_b', 'v_c'])).toBeNull()
    expect(Object.keys(meshOf(model).faces)).toHaveLength(2)
  })

  test('Criar face ou aresta cobre 2, 3 e 4 pontos e consome arestas de contorno', () => {
    const loose = createFaceOrEdge(cubeModel(), 'm', ['v_000', 'v_111'])
    if (!loose) throw new Error('sem aresta')
    expect(meshOf(loose.model).looseEdges).toEqual([['v_000', 'v_111']])
    expect(createFaceOrEdge(loose.model, 'm', ['v_000', 'v_111'])).toBeNull()

    const split = createFaceOrEdge(cubeModel(), 'm', ['v_010', 'v_011', 'v_111'])
    if (!split) throw new Error('sem divisão')
    expect(Object.keys(meshOf(split.model).faces)).toHaveLength(7)
    expect(split.selection[0]?.kind).toBe('face')

    const boundary: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0], v_c: [0, 2, 0] },
      faces: {},
      looseEdges: [
        ['v_a', 'v_b'],
        ['v_b', 'v_c'],
        ['v_a', 'v_c'],
      ],
    }
    const face = createFaceOrEdge(cubeModel(boundary), 'm', ['v_a', 'v_b', 'v_c'])
    if (!face) throw new Error('sem face')
    expect(Object.keys(meshOf(face.model).faces)).toHaveLength(1)
    expect(meshOf(face.model).looseEdges).toBeUndefined()
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

describe('Encolher dentro e Conectar pontos', () => {
  test('Encolher uma face cria o miolo e o anel, mantém a malha fechada e reprojeta a pele', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, (x) => (x < size.width / 2 ? 3 : 5))

    const result = insetFace(model, 'm', 'f_py', 25)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.vertices)).toHaveLength(12)
    expect(Object.keys(mesh.faces)).toHaveLength(10)
    expect(result.vertices).toHaveLength(4)
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshIssues(mesh)).toEqual([])
    for (const key of result.vertices) {
      const point = mesh.vertices[key] as Vec3
      expect(point[1]).toBe(2)
      for (const value of point) expect(value * 16).toBe(Math.round(value * 16))
    }
    expect(Object.keys(result.model.parts[0]?.faces ?? {})).toHaveLength(5)
  })

  test('Encolher aceita triângulo, reexecuta percentuais sobre a origem e recusa face ruim', () => {
    const triangle: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [4, 0, 0], v_c: [0, 0, 4] },
      faces: { f_t: { v: ['v_a', 'v_c', 'v_b'] } },
    }
    const model = cubeModel(triangle)
    const small = insetFace(model, 'm', 'f_t', 25)
    const large = insetFace(model, 'm', 'f_t', 50)
    expect(small && Object.keys(meshOf(small.model).faces)).toHaveLength(4)
    expect(large && Object.keys(meshOf(large.model).faces)).toHaveLength(4)
    expect(insetFace(model, 'm', 'f_t', 5)).toBeNull()

    const bent = boxMesh([0, 0, 0], [2, 2, 2])
    bent.vertices.v_111 = [2, 2.5, 2]
    expect(insetFace(cubeModel(bent), 'm', 'f_py', 25)).toBeNull()
    const dart: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [3, 0, 1], v_c: [6, 0, 0], v_d: [3, 0, 5] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    expect(insetFace(cubeModel(dart), 'm', 'f_q', 25)).toBeNull()
  })

  test('Conectar dois pontos opostos divide o quad pela diagonal escolhida e reprojeta a pele', () => {
    const model = cubeModel()
    const part = model.parts[0]
    if (!part) throw new Error('sem peça')
    const size = faceSkinSize(part, 'f_py', model.texelsPerUnit)
    if (!size) throw new Error('sem pele')
    part.faces.f_py = paintedSkin(size.width, size.height, () => 4)

    // A outra diagonal, diferente da escolha padrão de Dividir, também vale num quad convexo.
    const result = connectVertices(model, 'm', ['v_011', 'v_110'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(7)
    expect(result.vertices).toEqual(['v_011', 'v_110'])
    expect(isClosedMesh(mesh)).toBe(true)
    expect(meshIssues(mesh)).toEqual([])
    const halves = Object.values(mesh.faces).filter(
      (face) => face.v.includes('v_011') && face.v.includes('v_110'),
    )
    expect(halves).toHaveLength(2)
    expect(Object.keys(result.model.parts[0]?.faces ?? {})).toHaveLength(2)
    // Pontos vizinhos já têm uma aresta; não criamos arestas soltas nem duplicadas.
    expect(connectVertices(model, 'm', ['v_010', 'v_011'])).toBeNull()
  })

  test('Conectar num quad côncavo aceita apenas a diagonal segura que passa pelo dente', () => {
    const dart: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [3, 0, 1], v_c: [6, 0, 0], v_d: [3, 0, 5] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    const model = cubeModel(dart)
    expect(connectVertices(model, 'm', ['v_a', 'v_c'])).toBeNull()
    const result = connectVertices(model, 'm', ['v_b', 'v_d'])
    expect(result?.vertices).toEqual(['v_b', 'v_d'])
    expect(result && meshIssues(meshOf(result.model))).toEqual([])
  })
})

describe('review 06/09: Puxar só para fora e Dividir pelo dente', () => {
  test('Puxar com distância zero ou negativa não se aplica (paredes coplanares/viradas)', () => {
    const model = cubeModel()
    expect(extrudeFaces(model, 'm', TOP_FACE, 0)).toBeNull()
    expect(extrudeFaces(model, 'm', TOP_FACE, -1)).toBeNull()
    expect(extrudeEdges(model, 'm', [['v_010', 'v_011']], -1)).toBeNull()
  })

  test('Dividir um quad côncavo escolhe a diagonal que passa pelo dente (nenhum triângulo vira)', () => {
    // Dardo com o dente em p1: a diagonal p0-p2 ficaria FORA do polígono.
    const dart: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [3, 0, 1], v_c: [6, 0, 0], v_d: [3, 0, 5] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [6, 0, 5],
      color: 2,
      mesh: dart,
    })
    const model = makeModel({ parts: [part] })
    const normal = faceNormal(faceVertices(dart, 'f_q') as Vec3[])
    expect(meshIssues(dart).some((issue) => issue.kind === 'concave')).toBe(true)
    const result = splitQuads(model, 'm', ['f_q'])
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    const faces = Object.values(mesh.faces)
    expect(faces).toHaveLength(2)
    for (const face of faces) {
      const points = faceVertices(mesh, face) as Vec3[]
      const area = faceNormal(points)
      // Cada metade continua virada para o mesmo lado da face original (área positiva).
      expect(area[0] * normal[0] + area[1] * normal[1] + area[2] * normal[2]).toBeGreaterThan(0)
      expect(face.v).toContain('v_b')
    }
    expect(meshIssues(mesh)).toEqual([])
  })
})

describe('review 06/09 (2): abas, encaixe, faces duplicadas e orientação pelas vizinhas', () => {
  test('Puxar uma aresta de BORDA de um plano aberto cria a aba virada para o mesmo lado da face', () => {
    const plane: MoldaMesh = {
      vertices: { v_a: [0, 1, 0], v_b: [2, 1, 0], v_c: [2, 1, 2], v_d: [0, 1, 2] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 1, 0],
      to: [2, 1, 2],
      color: 2,
      mesh: plane,
    })
    const model = makeModel({ parts: [part] })
    const result = extrudeEdges(model, 'm', [['v_a', 'v_b']], 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    expect(Object.keys(mesh.faces)).toHaveLength(2)
    expect(meshIssues(mesh).filter((issue) => issue.kind === 'flipped')).toEqual([])
  })

  test('Puxar duas faces com normais diferentes anda pelo ENCAIXE (os pontos novos ficam na grade)', () => {
    const model = cubeModel()
    const result = extrudeFaces(model, 'm', ['f_py', 'f_px'], 1)
    if (!result) throw new Error('sem resultado')
    const mesh = meshOf(result.model)
    for (const key of result.vertices) {
      for (const value of mesh.vertices[key] as Vec3) expect(value).toBe(Math.round(value))
    }
    expect(isClosedMesh(mesh)).toBe(true)
  })

  test('Juntar pontos que fazem duas faces colapsarem no mesmo conjunto deixa UMA face', () => {
    // Dois triângulos que dividem a diagonal v_a-v_c; juntar v_b com v_d faz os dois
    // virarem o MESMO triângulo (com área: o ponto do meio fica fora da diagonal).
    const strip: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [1, 0, 1], v_c: [2, 0, 0], v_d: [1, 0, -3] },
      faces: {
        f_1: { v: ['v_a', 'v_b', 'v_c'] },
        f_2: { v: ['v_a', 'v_c', 'v_d'] },
      },
    }
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, -3],
      to: [2, 0, 1],
      color: 2,
      mesh: strip,
    })
    const model = makeModel({ parts: [part] })
    const result = mergeVertices(model, 'm', ['v_b', 'v_d'])
    if (!result) throw new Error('sem resultado')
    expect(Object.keys(meshOf(result.model).faces)).toHaveLength(1)
  })

  test('Fechar face num anel plano nasce virada como as vizinhas, seja qual for a ordem do toque', () => {
    const ring: MoldaMesh = {
      vertices: {
        v_00: [0, 0, 0],
        v_10: [2, 0, 0],
        v_20: [4, 0, 0],
        v_01: [0, 0, 2],
        v_11: [2, 0, 2],
        v_21: [4, 0, 2],
      },
      faces: {
        f_l: { v: ['v_00', 'v_01', 'v_11', 'v_10'] },
      },
    }
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [4, 0, 2],
      color: 2,
      mesh: ring,
    })
    const model = makeModel({ parts: [part] })
    const left = faceNormal(faceVertices(ring, 'f_l') as Vec3[])
    for (const order of [
      ['v_10', 'v_11', 'v_21', 'v_20'],
      ['v_20', 'v_21', 'v_11', 'v_10'],
      ['v_21', 'v_20', 'v_10', 'v_11'],
    ]) {
      const result = createFace(model, 'm', order)
      if (!result) throw new Error('sem resultado')
      const mesh = meshOf(result.model)
      const created = Object.keys(mesh.faces).find((key) => key !== 'f_l') as MeshFaceKey
      const normal = faceNormal(faceVertices(mesh, created) as Vec3[])
      expect(normal[0] * left[0] + normal[1] * left[1] + normal[2] * left[2]).toBeGreaterThan(0.99)
      expect(meshIssues(mesh)).toEqual([])
    }
  })

  test('Cortar no meio avisa quando o ponto cai fora do encaixe mesmo com o meio bloco', () => {
    const model = cubeModel(boxMesh([0, 0, 0], [0.5, 0.5, 0.5]), 0.5)
    const result = loopCut(model, 'm', ['v_010', 'v_011'])
    if (!result) throw new Error('sem resultado')
    expect(result.snapChanged).toBe(false)
    expect(result.offGrid).toBe(true)
  })
})
