import { describe, expect, test } from 'bun:test'
import type { MeshFace, MoldaMesh, Vec3 } from '../core/model'
import {
  boxMesh,
  faceNormal,
  faceVertices,
  isMeshFaceKey,
  isMeshVertexKey,
  meshBox,
  meshEdges,
  meshEquals,
  meshIssues,
  meshTriangleCount,
  mirrorMesh,
  newFaceKey,
  newVertexKey,
  normalizeMesh,
  orderQuad,
  roundMesh,
  scaleMeshToBox,
  translateMesh,
} from './mesh'

function near(a: Vec3, b: Vec3): void {
  for (let i = 0; i < 3; i += 1)
    expect(Math.abs((a[i] as number) - (b[i] as number))).toBeLessThan(1e-9)
}

describe('malha: a caixa como malha', () => {
  const mesh = boxMesh([-1, 0, -2], [2, 3, 1])

  test('8 vértices, 6 quads, 12 triângulos, 12 arestas e a mesma caixa envolvente', () => {
    expect(Object.keys(mesh.vertices)).toHaveLength(8)
    expect(Object.keys(mesh.faces)).toHaveLength(6)
    expect(meshTriangleCount(mesh)).toBe(12)
    expect(meshEdges(mesh)).toHaveLength(12)
    expect(meshBox(mesh)).toEqual({ from: [-1, 0, -2], to: [2, 3, 1] })
  })

  test('cada face aponta para FORA (normal de Newell do ciclo CCW)', () => {
    const expected: Record<string, Vec3> = {
      f_px: [1, 0, 0],
      f_nx: [-1, 0, 0],
      f_py: [0, 1, 0],
      f_ny: [0, -1, 0],
      f_pz: [0, 0, 1],
      f_nz: [0, 0, -1],
    }
    for (const [key, normal] of Object.entries(expected)) {
      const points = faceVertices(mesh, key as `f_${string}`)
      if (!points) throw new Error(key)
      near(faceNormal(points), normal)
    }
  })

  test('as chaves seguem o padrão e as novas não colidem', () => {
    expect(isMeshFaceKey('f_px')).toBe(true)
    expect(isMeshFaceKey('px')).toBe(false)
    expect(isMeshVertexKey('v_000')).toBe(true)
    expect(isMeshVertexKey('V_000')).toBe(false)
    const taken = new Set(Object.keys(mesh.vertices))
    const key = newVertexKey(taken)
    expect(isMeshVertexKey(key)).toBe(true)
    expect(taken.has(key)).toBe(false)
    expect(isMeshFaceKey(newFaceKey(Object.keys(mesh.faces)))).toBe(true)
  })
})

describe('malha: forma canônica', () => {
  test('normalizeMesh derruba face quebrada e vértice órfão sem derrubar a malha, e é idempotente', () => {
    const raw: MoldaMesh = {
      vertices: {
        v_a: [0, 0, 0],
        v_b: [2, 0, 0],
        v_c: [2, 2, 0],
        v_d: [0, 2, 0],
        v_orfao: [9, 9, 9],
        v_nan: [Number.NaN, 0, 0],
      },
      faces: {
        f_ok: { v: ['v_d', 'v_a', 'v_b', 'v_c'] },
        f_sumiu: { v: ['v_a', 'v_b', 'v_zzz'] },
        f_repetido: { v: ['v_a', 'v_b', 'v_b', 'v_c'] },
        f_grande: { v: ['v_a', 'v_b', 'v_c', 'v_d', 'v_orfao'] },
        f_nan: { v: ['v_a', 'v_b', 'v_nan'] },
      },
    }
    const once = normalizeMesh(raw)
    expect(Object.keys(once.faces)).toEqual(['f_ok'])
    expect(Object.keys(once.vertices)).toEqual(['v_a', 'v_b', 'v_c', 'v_d'])
    expect(normalizeMesh(once)).toEqual(once)
  })

  test('orderQuad desfaz a "gravata borboleta" mantendo o 1º ponto e a orientação', () => {
    const tl: Vec3 = [0, 1, 0]
    const bl: Vec3 = [0, 0, 0]
    const br: Vec3 = [1, 0, 0]
    const tr: Vec3 = [1, 1, 0]
    expect(orderQuad([tl, bl, br, tr])).toEqual([0, 1, 2, 3])
    expect(orderQuad([tl, br, bl, tr])).toEqual([0, 2, 1, 3])
    // Um ciclo bom em quad de malha normalizada volta igual (round-trip byte a byte).
    const mesh = boxMesh([0, 0, 0], [2, 2, 2])
    expect(normalizeMesh(mesh).faces.f_pz?.v).toEqual(mesh.faces.f_pz?.v)
    expect(orderQuad([tl, bl, br])).toEqual([0, 1, 2])
  })

  test('roundMesh arredonda à precisão do disco (1/16)', () => {
    const mesh: MoldaMesh = {
      vertices: { v_a: [0.03, 0.05, 1.999] },
      faces: {},
    }
    expect(roundMesh(mesh).vertices.v_a).toEqual([0, 0.0625, 2])
  })
})

describe('malha: transformações', () => {
  const mesh = boxMesh([0, 0, 0], [2, 4, 6])

  test('mirrorMesh espelha x, inverte os ciclos e, duas vezes, volta ao original', () => {
    const mirrored = mirrorMesh(mesh)
    expect(mirrored.vertices.v_111).toEqual([-2, 4, 6])
    expect(mirrored.faces.f_pz?.v).toEqual([...(mesh.faces.f_pz?.v ?? [])].reverse())
    // As faces continuam apontando para fora.
    const points = faceVertices(mirrored, 'f_px')
    if (!points) throw new Error('f_px')
    near(faceNormal(points), [-1, 0, 0])
    expect(meshEquals(mirrorMesh(mirrored), mesh)).toBe(true)
    expect(meshEquals(mirrored, mesh)).toBe(false)
  })

  test('translateMesh e scaleMeshToBox acompanham a caixa', () => {
    expect(meshBox(translateMesh(mesh, [1, 2, 3]))).toEqual({ from: [1, 2, 3], to: [3, 6, 9] })
    const scaled = scaleMeshToBox(mesh, { from: [-1, 0, 0], to: [3, 2, 12] })
    expect(meshBox(scaled)).toEqual({ from: [-1, 0, 0], to: [3, 2, 12] })
    expect(scaled.vertices.v_111).toEqual([3, 2, 12])
    expect(scaled.faces).toBe(mesh.faces)
  })
})

describe('malha: o que pode dar errado', () => {
  test('a caixa não tem problema nenhum', () => {
    expect(meshIssues(boxMesh([0, 0, 0], [2, 2, 2]))).toEqual([])
  })

  test('vértices sobrepostos, quad torto, quad côncavo e face virada', () => {
    const box = boxMesh([0, 0, 0], [2, 2, 2])
    const overlap: MoldaMesh = {
      ...box,
      vertices: { ...box.vertices, v_111: [...(box.vertices.v_110 as Vec3)] as Vec3 },
    }
    expect(meshIssues(overlap).some((issue) => issue.kind === 'overlap')).toBe(true)
    const bent: MoldaMesh = { ...box, vertices: { ...box.vertices, v_111: [2, 2, 2.5] } }
    expect(meshIssues(bent).some((issue) => issue.kind === 'non-planar')).toBe(true)
    const flipped: MoldaMesh = {
      ...box,
      faces: { ...box.faces, f_pz: { v: [...(box.faces.f_pz?.v ?? [])].reverse() } },
    }
    expect(
      meshIssues(flipped).some((issue) => issue.kind === 'flipped' && issue.face === 'f_pz'),
    ).toBe(true)
    const concave: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 0], v_c: [2, 2, 0], v_d: [1, 0.5, 0] },
      faces: { f_c: { v: ['v_d', 'v_a', 'v_b', 'v_c'] } },
    }
    expect(meshIssues(concave).some((issue) => issue.kind === 'concave')).toBe(true)
  })
})

describe('review 06/09: quad côncavo e face virada', () => {
  test('normalizeMesh preserva um dardo (quad côncavo simples) e só desfaz a gravata', () => {
    const dart: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [6, 0, 0], v_c: [3, 0, 1], v_d: [3, 0, 5] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    expect(normalizeMesh(dart).faces.f_q?.v).toEqual(['v_a', 'v_b', 'v_c', 'v_d'])
    expect(meshIssues(dart).some((issue) => issue.kind === 'concave')).toBe(true)
    const bowtie: MoldaMesh = {
      vertices: { v_a: [0, 0, 0], v_b: [2, 0, 2], v_c: [2, 0, 0], v_d: [0, 0, 2] },
      faces: { f_q: { v: ['v_a', 'v_b', 'v_c', 'v_d'] } },
    }
    const untangled = normalizeMesh(bowtie)
    expect(untangled.faces.f_q?.v).toEqual(['v_a', 'v_c', 'v_b', 'v_d'])
    expect(normalizeMesh(untangled)).toEqual(untangled)
  })

  test('"face virada" é regra LOCAL: um L não acusa nada; uma aba de três faces não conta', () => {
    // Um L: caixa 2×1×2 com uma torre em cima e um braço para +x, montado à mão.
    const base = boxMesh([0, 0, 0], [2, 1, 2])
    const l: MoldaMesh = structuredClone(base)
    // Torre: levanta a tampa e fecha as 4 paredes (o mesmo que `extrudeFaces`).
    for (const key of ['v_010', 'v_011', 'v_111', 'v_110'] as const) {
      const v = l.vertices[key] as Vec3
      l.vertices[`${key}t`] = [v[0], 5, v[2]]
    }
    const cap = l.faces.f_py as MeshFace
    l.faces.f_py = { v: cap.v.map((key) => `${key}t`) }
    for (let i = 0; i < 4; i += 1) {
      const a = cap.v[i] as string
      const b = cap.v[(i + 1) % 4] as string
      l.faces[`f_w${i}`] = { v: [a, b, `${b}t`, `${a}t`] }
    }
    expect(meshIssues(l)).toEqual([])
    // Braço: puxa a face +x da base (só ela) para x = 6.
    const side = l.faces.f_px as MeshFace
    for (const key of side.v) {
      const v = l.vertices[key] as Vec3
      l.vertices[`${key}a`] = [6, v[1], v[2]]
    }
    l.faces.f_px = { v: side.v.map((key) => `${key}a`) }
    for (let i = 0; i < 4; i += 1) {
      const a = side.v[i] as string
      const b = side.v[(i + 1) % 4] as string
      l.faces[`f_a${i}`] = { v: [a, b, `${b}a`, `${a}a`] }
    }
    // A antiga régua pelo centro acusava a parede da torre voltada para o braço.
    expect(meshIssues(l).filter((issue) => issue.kind === 'flipped')).toEqual([])
    // Uma face de fato virada continua apontada.
    const flipped: MoldaMesh = {
      ...l,
      faces: { ...l.faces, f_w0: { v: [...(l.faces.f_w0 as MeshFace).v].reverse() } },
    }
    expect(meshIssues(flipped).filter((issue) => issue.kind === 'flipped')).toEqual([
      { kind: 'flipped', face: 'f_w0' },
    ])
    // Aba (aresta com três faces) não vira acusação.
    const flap: MoldaMesh = {
      ...base,
      vertices: { ...base.vertices, v_f1: [0, 2, 2], v_f2: [2, 2, 2] },
      faces: { ...base.faces, f_flap: { v: ['v_010', 'v_011', 'v_f1', 'v_f2'] } },
    }
    expect(meshIssues(flap).filter((issue) => issue.kind === 'flipped')).toEqual([])
  })
})
