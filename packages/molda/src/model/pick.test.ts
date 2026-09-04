import { describe, expect, test } from 'bun:test'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
} from 'three'
import { createModelAsset, createPart, type FaceId, SHAPE_IDS } from '../core/model'
import { faceUvToPoint, planarFaceFrame } from './frame'
import { buildPartGeometry } from './geometry'
import { setMirrorX } from './partOps'
import { faceTexelAt, pickModelRay, pickTexelAtPoint, resolveTexelHit, worldToBox } from './pick'
import { FACES_BY_SHAPE, faceSkinSize } from './shapes'
import { partMatrix, transformDirection, transformPoint } from './transform'

describe('picking de texel', () => {
  test('o raycast puro coincide com o Raycaster do three em toda forma e face', () => {
    for (const shape of SHAPE_IDS) {
      const part = createPart({
        id: shape,
        name: shape,
        shape,
        from: [-1, 0, -2],
        to: [2, 3, 1],
        color: 1,
        rotation: [15, 30, 0],
      })
      part.origin = [-0.5, 0.5, -1]
      const built = buildPartGeometry(part)
      const geometry = new BufferGeometry()
      geometry.setAttribute('position', new Float32BufferAttribute(built.positions, 3))
      const material = new MeshBasicMaterial()
      const mesh = new Mesh(geometry, material)
      mesh.matrixAutoUpdate = false
      mesh.matrix.copy(new Matrix4().fromArray(Array.from(partMatrix(part))))
      mesh.updateMatrixWorld(true)
      const tested = new Set<FaceId>()
      for (let triangle = 0; triangle < built.triangleCount; triangle += 1) {
        const face = built.faceOfTriangle[triangle]
        if (!face || tested.has(face)) continue
        tested.add(face)
        const local: [number, number, number] = [0, 0, 0]
        for (let vertex = 0; vertex < 3; vertex += 1) {
          for (let axis = 0; axis < 3; axis += 1) {
            local[axis] =
              (local[axis] as number) +
              (built.positions[triangle * 9 + vertex * 3 + axis] as number) / 3
          }
        }
        const normalLocal: [number, number, number] = [
          built.normals[triangle * 9] as number,
          built.normals[triangle * 9 + 1] as number,
          built.normals[triangle * 9 + 2] as number,
        ]
        const matrix = partMatrix(part)
        const target = transformPoint(matrix, local)
        const normal = transformDirection(matrix, normalLocal)
        const origin: [number, number, number] = [
          target[0] + normal[0] * 5,
          target[1] + normal[1] * 5,
          target[2] + normal[2] * 5,
        ]
        const direction: [number, number, number] = [-normal[0], -normal[1], -normal[2]]
        const pure = pickModelRay({ parts: [part] }, origin, direction)
        const three = new Raycaster(new Vector3(...origin), new Vector3(...direction))
          .intersectObject(mesh, false)
          .at(0)
        expect(pure?.partId).toBe(part.id)
        expect(pure?.face).toBe(face)
        expect(pure?.distance).toBeCloseTo(three?.distance ?? -1, 5)
      }
      geometry.dispose()
      material.dispose()
    }
  })

  test('worldToBox desfaz a matriz da peça (com giro e pivô)', () => {
    const part = createPart({
      name: 'p',
      from: [1, 0, -2],
      to: [4, 2, 1],
      color: 1,
      rotation: [15, 30, 45],
    })
    part.origin = [1, 0, 0]
    const m = partMatrix(part)
    for (const local of [
      [1, 0, -2],
      [4, 2, 1],
      [2.5, 1, -0.5],
    ] as const) {
      const world = transformPoint(m, [...local])
      const back = worldToBox(part, world)
      expect(back[0]).toBeCloseTo(local[0], 6)
      expect(back[1]).toBeCloseTo(local[1], 6)
      expect(back[2]).toBeCloseTo(local[2], 6)
    }
  })

  test('o centro de cada triângulo da geometria cai na face certa e num texel válido', () => {
    for (const shape of SHAPE_IDS) {
      const part = createPart({ name: 'p', shape, from: [-1, 0, -2], to: [2, 3, 1], color: 1 })
      const built = buildPartGeometry(part)
      for (let t = 0; t < built.triangleCount; t += 1) {
        const face = built.faceOfTriangle[t] as FaceId
        const centroid: [number, number, number] = [0, 0, 0]
        for (let v = 0; v < 3; v += 1) {
          for (let i = 0; i < 3; i += 1) {
            centroid[i] =
              (centroid[i] as number) + (built.positions[t * 9 + v * 3 + i] as number) / 3
          }
        }
        const texel = faceTexelAt(part, face, centroid, 4)
        const size = faceSkinSize(part, face, 4)
        expect(texel).not.toBeNull()
        if (!texel || !size) continue
        expect(texel.x).toBeGreaterThanOrEqual(0)
        expect(texel.x).toBeLessThan(size.width)
        expect(texel.y).toBeGreaterThanOrEqual(0)
        expect(texel.y).toBeLessThan(size.height)
        // O picking puro por ponto acha a mesma face (formas curvas: a face curva).
        const model = { parts: [part], texelsPerUnit: 4 as const }
        const hit = pickTexelAtPoint(model, centroid)
        expect(hit?.face).toBe(face)
      }
    }
  })

  test('faces planas: o texel é a inversa do gerador (centro do texel → o mesmo texel)', () => {
    const part = createPart({
      name: 'p',
      from: [0, 0, 0],
      to: [4, 2, 3],
      color: 1,
      rotation: [0, 90, 0],
    })
    for (const face of FACES_BY_SHAPE.box) {
      const size = faceSkinSize(part, face, 4)
      if (!size) throw new Error(face)
      const cases: Array<[number, number]> = [
        [0, 0],
        [size.width - 1, size.height - 1],
        [3, 2],
      ]
      for (const [tx, ty] of cases) {
        // Ponto no centro do texel, pela base da face (u, v).
        const u = (tx + 0.5) / size.width
        const v = (ty + 0.5) / size.height
        const frame = planarFaceFrame(part, face)
        if (!frame) throw new Error(face)
        const local = faceUvToPoint(frame, u, v)
        expect(faceTexelAt(part, face, local, 4)).toEqual({ x: tx, y: ty })
        // E pelo MUNDO (peça girada): transformar e desfazer dá o mesmo texel.
        const world = transformPoint(partMatrix(part), local)
        expect(faceTexelAt(part, face, worldToBox(part, world), 4)).toEqual({ x: tx, y: ty })
      }
    }
  })

  test('o toque num gêmeo vira a face espelhada da fonte com a coluna invertida', () => {
    const base = { ...createModelAsset({ name: 'x', starter: false }), mirrorX: true }
    const source = createPart({ id: 'src', name: 's', from: [1, 0, 0], to: [3, 2, 2], color: 1 })
    const model = setMirrorX({ ...base, parts: [source] }, true)
    const twin = model.parts.find((p) => p.mirrorOf === 'src')
    if (!twin) throw new Error('twin')
    const width = faceSkinSize(source, 'nx', model.texelsPerUnit)?.width ?? 0
    expect(resolveTexelHit(model, twin, 'px', 1, 2)).toEqual({
      partId: 'src',
      face: 'nx',
      x: width - 2,
      y: 2,
    })
    expect(resolveTexelHit(model, twin, 'py', 0, 0)).toEqual({
      partId: 'src',
      face: 'py',
      x: width - 1,
      y: 0,
    })
    expect(resolveTexelHit(model, source, 'py', 0, 0)).toEqual({
      partId: 'src',
      face: 'py',
      x: 0,
      y: 0,
    })
  })

  test('pickTexelAtPoint no ponto espelhado acha o outro lado (peça que cruza x = 0 e gêmeo)', () => {
    const crossing = createPart({ id: 'c', name: 'c', from: [-2, 0, 0], to: [2, 2, 2], color: 1 })
    const model = { parts: [crossing], texelsPerUnit: 4 as const }
    // Ponto no CENTRO de um texel da face de cima (x = 1.625 é o centro do texel 14 de 16)
    // → espelho em x = -1.625, mesma face, coluna espelhada (14 + 1 = 15).
    const hit = pickTexelAtPoint(model, [1.625, 2, 0.5])
    const mirrored = pickTexelAtPoint(model, [-1.625, 2, 0.5])
    expect(hit?.face).toBe('py')
    expect(mirrored?.face).toBe('py')
    expect(hit && mirrored ? hit.x + mirrored.x : -1).toBe(15)
    // Fora de toda superfície: null.
    expect(pickTexelAtPoint(model, [10, 10, 10])).toBeNull()

    const base = { ...createModelAsset({ name: 'x', starter: false }), mirrorX: true }
    const source = createPart({ id: 'src', name: 's', from: [1, 0, 0], to: [3, 2, 2], color: 1 })
    const withTwin = setMirrorX({ ...base, parts: [source] }, true)
    const onSource = pickTexelAtPoint(withTwin, [3, 1, 1])
    const onTwin = pickTexelAtPoint(withTwin, [-3, 1, 1])
    expect(onSource).toEqual({ partId: 'src', face: 'px', x: 4, y: 4 })
    expect(onTwin?.partId).toBe('src')
    expect(onTwin?.face).toBe('px')
    expect(onTwin?.x).toBe(3)
  })

  test('a metade vazia das laterais triangulares da rampa não contém texel', () => {
    const wedge = createPart({
      id: 'wedge',
      name: 'rampa',
      shape: 'wedge',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 1,
    })
    const model = { parts: [wedge], texelsPerUnit: 4 as const }

    expect(pickTexelAtPoint(model, [2, 1.8, 1.8])).toBeNull()
    expect(pickTexelAtPoint(model, [0, 1.8, 1.8])).toBeNull()
    expect(pickTexelAtPoint(model, [2, 0.1, 1.8])?.face).toBe('px')
    expect(pickTexelAtPoint(model, [0, 0.1, 1.8])?.face).toBe('nx')
  })
})
