import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type MoldaMesh, type Vec3 } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'
import { makeModel } from '../testing/fixtures'
import { modelTriangleCount, partTriangleCount } from './geometry'
import { boxMesh, meshBox } from './mesh'
import {
  addExtraColor,
  addPart,
  addPartAtSurface,
  boxesOverlap,
  duplicatePart,
  findFreeSpot,
  movePartBy,
  movePartsBy,
  nextPartName,
  removePart,
  setMirrorX,
  setPartBox,
  setPartBoxes,
  setPartSize,
  setSnap,
  trySetMirrorX,
  updateExtraColor,
  updatePart,
} from './partOps'
import { faceSkinSize, partSize } from './shapes'
import { mirrorTwinOf } from './twins'

function overlapsAny(model: ReturnType<typeof makeModel>, id: string): boolean {
  const part = model.parts.find((p) => p.id === id)
  if (!part) throw new Error(id)
  return model.parts.some((other) => other.id !== id && boxesOverlap(other, part))
}

/** Malha válida de 500 quads = 1 000 triângulos, dentro dos tetos por peça. */
function denseMeshPart(id: string, y: number, crossesMirror = false) {
  const vertices: Record<string, Vec3> = {}
  const faces: MoldaMesh['faces'] = {}
  const fromX = crossesMirror ? -1 : 1
  const toX = crossesMirror ? 1 : 2
  const columns = 501
  for (let i = 0; i < columns; i += 1) {
    const x = fromX + ((toX - fromX) * i) / (columns - 1)
    vertices[`v_a${i}`] = [x, y, -1]
    vertices[`v_b${i}`] = [x, y, 1]
  }
  for (let i = 0; i + 1 < columns; i += 1) {
    faces[`f_${i}`] = { v: [`v_b${i}`, `v_a${i}`, `v_a${i + 1}`, `v_b${i + 1}`] }
  }
  return createPart({
    id,
    name: id,
    shape: 'mesh',
    from: [fromX, y, -1],
    to: [toX, y, 1],
    color: 2,
    mesh: { vertices, faces },
  })
}

describe('operações do modelo', () => {
  test('addPart encosta na peça de referência sem sobrepor, herda a cor e numera o nome', () => {
    const model = makeModel()
    const first = addPart(model, 'box', { nearId: 'body' })
    expect(first).not.toBeNull()
    if (!first) return
    expect(overlapsAny(first.model, first.partId)).toBe(false)
    const added = first.model.parts.find((p) => p.id === first.partId)
    expect(added?.name).toBe('caixa')
    expect(added?.color).toBe(8)
    expect(partSize(added ?? { from: [0, 0, 0], to: [0, 0, 0] })).toEqual([2, 2, 2])
    const second = addPart(first.model, 'box', { nearId: first.partId })
    const named = second?.model.parts.find((p) => p.id === second.partId)
    expect(named?.name).toBe('caixa 2')
    expect(second && overlapsAny(second.model, second.partId)).toBe(false)
  })

  test('addPart sem referência cai no chão perto do centro; no teto devolve null', () => {
    const empty = createModelAsset({ name: 'x', starter: false })
    const result = addPart(empty, 'sphere')
    expect(result?.model.parts[0]?.from[1]).toBe(0)
    expect(result?.model.parts[0]?.shape).toBe('sphere')
    let model = empty
    for (let i = 0; i < MOLDA_LIMITS.maxParts; i += 1) {
      const next = addPart(model, 'box')
      if (!next) throw new Error(`parou em ${i}`)
      model = next.model
    }
    expect(model.parts).toHaveLength(MOLDA_LIMITS.maxParts)
    expect(addPart(model, 'box')).toBeNull()
    // Nenhuma das 128 caixas se sobrepõe a outra.
    for (const part of model.parts) expect(overlapsAny(model, part.id)).toBe(false)
  })

  test('addPartAtSurface encosta a peça na face tocada e respeita o snap', () => {
    const source = createPart({
      id: 'base',
      name: 'base',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 4,
    })
    const model = {
      ...createModelAsset({ name: 'x', starter: false }),
      parts: [source],
    }

    const side = addPartAtSurface(model, 'box', [2, 1, 1], [1, 0, 0], { nearId: 'base' })
    expect(side?.model.parts.find((part) => part.id === side.partId)?.from).toEqual([2, 0, 0])
    expect(side?.model.parts.find((part) => part.id === side.partId)?.to).toEqual([4, 2, 2])
    expect(side?.model.parts.find((part) => part.id === side.partId)?.color).toBe(4)

    const half = { ...createModelAsset({ name: 'h', starter: false }), snap: 0.5 as const }
    const ground = addPartAtSurface(half, 'wedge', [3.2, 0, -2.3], [0, 1, 0])
    expect(ground?.model.parts[0]?.from).toEqual([2, 0, -3.5])
    expect(ground?.model.parts[0]?.to).toEqual([4, 1, -1.5])
  })

  test('findFreeSpot acha um vão em espiral quando os vizinhos estão ocupados', () => {
    const model = createModelAsset({ name: 'x', starter: false })
    const center = createPart({ name: 'c', from: [-1, 0, -1], to: [1, 2, 1], color: 1 })
    const ring = [
      createPart({ name: 'a', from: [1, 0, -1], to: [3, 2, 1], color: 1 }),
      createPart({ name: 'b', from: [-3, 0, -1], to: [-1, 2, 1], color: 1 }),
      createPart({ name: 'c2', from: [-1, 0, 1], to: [1, 2, 3], color: 1 }),
      createPart({ name: 'd', from: [-1, 0, -3], to: [1, 2, -1], color: 1 }),
      createPart({ name: 'e', from: [-1, 2, -1], to: [1, 4, 1], color: 1 }),
    ]
    const crowded = { ...model, parts: [center, ...ring] }
    const spot = findFreeSpot(crowded, [2, 2, 2], center)
    expect(crowded.parts.some((part) => boxesOverlap(part, spot))).toBe(false)
    expect(spot.from[1]).toBe(0)
  })

  test('com o espelho ligado, addPart cria o gêmeo (e não para peça que cruza x = 0)', () => {
    const model = { ...createModelAsset({ name: 'x', starter: false }), mirrorX: true }
    const side = createPart({ name: 'ref', from: [2, 0, 0], to: [4, 2, 2], color: 1 })
    const withRef = { ...model, parts: [side] }
    const result = addPart(withRef, 'box', { nearId: side.id })
    if (!result) throw new Error('teto')
    const twin = result.model.parts.find((p) => p.mirrorOf === result.partId)
    expect(twin).toBeDefined()
    expect(twin?.from[0]).toBeLessThan(0)
    const crossing = addPart(createModelAsset({ name: 'y', starter: false }), 'box')
    if (!crossing) throw new Error('teto')
    const mirrored = setMirrorX(crossing.model, true)
    expect(mirrored.parts.some((p) => p.mirrorOf)).toBe(false)
  })

  test('com 127 peças, o espelho recusa adicionar ou duplicar uma fonte que não caberia com o gêmeo', () => {
    const parts = Array.from({ length: MOLDA_LIMITS.maxParts - 1 }, (_unused, index) =>
      createPart({
        id: `centro-${index}`,
        name: `centro ${index}`,
        from: [-1, 0, -1],
        to: [1, 2, 1],
        color: 1,
      }),
    )
    const model = {
      ...createModelAsset({ name: 'cheio', starter: false }),
      mirrorX: true,
      parts,
    }

    expect(addPartAtSurface(model, 'box', [1, 1, 0], [1, 0, 0])).toBeNull()
    expect(duplicatePart(model, parts[0]?.id ?? '')).toBeNull()
  })

  test('o espelho só liga quando todos os gêmeos cabem e não deixa mover uma fonte sem vaga para o par', () => {
    const parts = Array.from({ length: 65 }, (_unused, index) =>
      createPart({
        id: `lado-${index}`,
        name: `lado ${index}`,
        from: [2, 0, 0],
        to: [3, 1, 1],
        color: 1,
      }),
    )
    const disabled = { ...createModelAsset({ name: 'cheio', starter: false }), parts }
    expect(setMirrorX(disabled, true)).toBe(disabled)

    const crossing = Array.from({ length: MOLDA_LIMITS.maxParts }, (_unused, index) =>
      createPart({
        id: `eixo-${index}`,
        name: `eixo ${index}`,
        from: [-1, 0, 0],
        to: [1, 1, 1],
        color: 1,
      }),
    )
    const active = {
      ...createModelAsset({ name: 'lotado', starter: false }),
      mirrorX: true,
      parts: crossing,
    }
    expect(setPartBox(active, crossing[0]?.id ?? '', [2, 0, 0], [3, 1, 1])).toBe(active)
  })

  test('ao sair do eixo com o espelho ligado, a peça ganha o gêmeo que faltava', () => {
    const source = createPart({
      id: 'a',
      name: 'a',
      from: [-1, 0, 0],
      to: [1, 2, 2],
      color: 1,
    })
    const model = {
      ...createModelAsset({ name: 'x', starter: false }),
      mirrorX: true,
      parts: [source],
    }

    const moved = setPartBox(model, source.id, [2, 0, 0], [4, 2, 2])

    expect(moved.parts.find((part) => part.mirrorOf === source.id)?.from).toEqual([-4, 0, 0])
  })

  test('removePart leva o gêmeo junto', () => {
    const model = setMirrorX(
      {
        ...createModelAsset({ name: 'x', starter: false }),
        parts: [createPart({ id: 'a', name: 'a', from: [1, 0, 0], to: [2, 1, 1], color: 1 })],
      },
      true,
    )
    expect(model.parts).toHaveLength(2)
    expect(removePart(model, 'a').parts).toHaveLength(0)
  })

  test('duplicatePart copia as peles, ganha id e nome novos e não sobrepõe', () => {
    const model = makeModel()
    const result = duplicatePart(model, 'body')
    if (!result) throw new Error('teto')
    const copy = result.model.parts.find((p) => p.id === result.partId)
    expect(copy?.id).not.toBe('body')
    expect(copy?.name).toBe('corpo 2')
    expect(copy?.faces.py?.data).toEqual(model.parts[0]?.faces.py?.data)
    expect(copy?.faces.py?.data).not.toBe(model.parts[0]?.faces.py?.data)
    expect(overlapsAny(result.model, result.partId)).toBe(false)
    // Duplicar o gêmeo duplica a FONTE (o corpo cruza x = 0 e não tem gêmeo; a asa tem).
    const mirrored = setMirrorX(model, true)
    const twin = mirrored.parts.find((p) => p.mirrorOf === 'wing')
    if (!twin) throw new Error('sem gêmeo')
    const viaTwin = duplicatePart(mirrored, twin.id)
    expect(viaTwin?.model.parts.find((p) => p.id === viaTwin.partId)?.mirrorOf).toBeUndefined()
  })

  test('setPartBox re-amostra as peles quando o tamanho muda e as mantém ao mover', () => {
    const model = makeModel()
    const body = model.parts[0]
    if (!body) throw new Error('fixture')
    const moved = setPartBox(model, 'body', [0, 0, 0], [4, 2, 6])
    expect(moved.parts[0]?.faces.py).toBe(body.faces.py)
    const resized = setPartBox(model, 'body', body.from, [body.to[0] + 2, body.to[1], body.to[2]])
    const part = resized.parts[0]
    if (!part) throw new Error('part')
    const expected = faceSkinSize(part, 'py', model.texelsPerUnit)
    expect(part.faces.py?.width).toBe(expected?.width ?? -1)
    expect(part.faces.py).not.toBe(body.faces.py)
    // Um gêmeo não é editável diretamente.
    const mirrored = setMirrorX(model, true)
    const twin = mirrored.parts.find((p) => p.mirrorOf === 'wing')
    if (!twin) throw new Error('twin')
    expect(setPartBox(mirrored, twin.id, [0, 0, 0], [1, 1, 1])).toBe(mirrored)
  })

  test('movePartBy é clampado à grade; setPartSize ancora em from', () => {
    const model = makeModel()
    const pushed = movePartBy(model, 'body', [100, 0, 0])
    expect(pushed.parts[0]?.to[0]).toBe(MOLDA_LIMITS.gridHalf)
    const sized = setPartSize(model, 'body', [1, 1, 1])
    expect(sized.parts[0]?.from).toEqual(model.parts[0]?.from)
    expect(partSize(sized.parts[0] ?? { from: [0, 0, 0], to: [0, 0, 0] })).toEqual([1, 1, 1])
  })

  test('setSnap muda só o encaixe das próximas ações e preserva as peças existentes', () => {
    const part = createPart({
      id: 'half',
      name: 'half',
      from: [0.5, 0, -1.5],
      to: [2.5, 1.5, 0.5],
      color: 2,
    })
    part.origin = [1.5, 0.5, -0.5]
    const model = {
      ...createModelAsset({ name: 'x', starter: false }),
      snap: 0.5 as const,
      parts: [part],
    }

    const snapped = setSnap(model, 1)

    expect(snapped.parts).toBe(model.parts)
    expect(snapped.parts[0]?.from).toEqual([0.5, 0, -1.5])
    expect(snapped.parts[0]?.to).toEqual([2.5, 1.5, 0.5])
    expect(snapped.parts[0]?.origin).toEqual([1.5, 0.5, -0.5])
    expect(sanitizeMoldaAsset(structuredClone(snapped))).toEqual(snapped)
  })

  test('mover preserva tamanho de meio bloco mesmo com encaixe de um bloco', () => {
    const part = createPart({
      id: 'fine',
      name: 'fine',
      from: [1 / 16, 0, 1 / 16],
      to: [25 / 16, 1.5, 17 / 16],
      color: 2,
    })
    const model = {
      ...createModelAsset({ name: 'x', starter: false }),
      snap: 1 as const,
      parts: [part],
    }

    const moved = movePartBy(model, part.id, [1 / 16, 0, 0])

    expect(moved.parts[0]?.from).toEqual([2 / 16, 0, 1 / 16])
    expect(moved.parts[0]?.to).toEqual([26 / 16, 1.5, 17 / 16])
  })

  test('o pivô próprio acompanha o movimento e é clampado no redimensionar', () => {
    const model = makeModel()
    const withOrigin = updatePart(model, 'body', { origin: [2, 0, 3] })
    expect(withOrigin.parts[0]?.origin).toEqual([2, 0, 3])
    const moved = movePartBy(withOrigin, 'body', [1, 0, 0])
    expect(moved.parts[0]?.origin).toEqual([3, 0, 3])
    const shrunk = setPartSize(withOrigin, 'body', [1, 1, 1])
    expect(shrunk.parts[0]?.origin).toEqual([-1, 0, -2])
  })

  test('updatePart: nome cortado, cor inválida ignorada, giro normalizado', () => {
    const model = makeModel()
    const out = updatePart(model, 'body', {
      name: 'x'.repeat(40),
      color: 99,
      rotation: [7, -20, 367],
    })
    expect(out.parts[0]?.name).toHaveLength(MOLDA_LIMITS.maxPartNameChars)
    expect(out.parts[0]?.color).toBe(8)
    expect(out.parts[0]?.rotation).toEqual([0, 345, 0])
    expect(updatePart(model, 'nope', { name: 'x' })).toBe(model)
  })

  test('setMirrorX liga (gêmeos) e desliga (assa) ', () => {
    const model = makeModel()
    const on = setMirrorX(model, true)
    expect(on.mirrorX).toBe(true)
    expect(on.parts.filter((p) => p.mirrorOf)).toHaveLength(1)
    const twin = on.parts.find((p) => p.mirrorOf === 'wing')
    expect(twin?.from[0]).toBe(-5)
    const off = setMirrorX(on, false)
    expect(off.mirrorX).toBe(false)
    expect(off.parts).toHaveLength(3)
    expect(off.parts.some((p) => p.mirrorOf)).toBe(false)
  })

  test('addExtraColor adiciona, deduplica e respeita o teto', () => {
    const model = makeModel()
    const first = addExtraColor(model, '#123456')
    expect(first?.index).toBe(16)
    expect(first?.model.extraColors).toEqual(['#123456'])
    const again = addExtraColor(first?.model ?? model, '#123456')
    expect(again?.index).toBe(16)
    expect(again?.model).toBe(first?.model)
    const base = addExtraColor(model, '#ffffff')
    expect(base?.index).toBe(1)
    let full = model
    for (let i = 0; i < MOLDA_LIMITS.maxExtraColors; i += 1) {
      const next = addExtraColor(full, `#${(0x100000 + i * 7).toString(16).padStart(6, '0')}`)
      if (!next) throw new Error('teto cedo')
      full = next.model
    }
    expect(addExtraColor(full, '#abcdef')).toBeNull()
  })

  test('updateExtraColor troca UMA extra no lugar; nunca duplica nem mexe nas fixas', () => {
    const model = makeModel()
    const added = addExtraColor(model, '#123456')
    if (!added) throw new Error('sem extra')
    const updated = updateExtraColor(added.model, 16, '#654321')
    expect(updated.extraColors).toEqual(['#654321'])
    // Mesma referência quando nada muda: hex igual, cor que já existe (o sanitize deduplicaria e
    // DESLOCARIA os índices), índice fixo ou fora das extras.
    expect(updateExtraColor(updated, 16, '#654321')).toBe(updated)
    expect(updateExtraColor(updated, 16, '#ffffff')).toBe(updated)
    expect(updateExtraColor(updated, 1, '#abcdef')).toBe(updated)
    expect(updateExtraColor(updated, 17, '#abcdef')).toBe(updated)
  })

  test('nextPartName respeita o teto de chars', () => {
    const model = {
      parts: [createPart({ name: 'a'.repeat(24), from: [0, 0, 0], to: [1, 1, 1], color: 1 })],
    }
    const name = nextPartName(model, 'a'.repeat(24))
    expect(name).toHaveLength(24)
    expect(name.endsWith(' 2')).toBe(true)
  })
})

const opsMod = await import('./partOps')
const fixturesMod = await import('../testing/fixtures')
const geometryMod = await import('./geometry')

describe('malha nas operações (06/09/2026)', () => {
  test('boxToMesh: a caixa vira malha com as peles migradas por face, sem re-amostrar', () => {
    const model = fixturesMod.makeModel()
    const body = model.parts[0]
    if (!body?.faces.py) throw new Error('fixture sem pele')
    const result = opsMod.boxToMesh(model, 'body')
    if (!result) throw new Error('sem conversão')
    const part = result.model.parts.find((p) => p.id === 'body')
    expect(part?.shape).toBe('mesh')
    expect(part?.faces.f_py).toBe(body.faces.py)
    expect(result.lostFaces).toEqual([])
    expect(faceSkinSize(part ?? body, 'f_py', model.texelsPerUnit)).toEqual(
      faceSkinSize(body, 'py', model.texelsPerUnit),
    )
    expect(geometryMod.partTriangleCount(part ?? body)).toBe(12)
    const clean = sanitizeMoldaAsset(structuredClone(result.model))
    expect(clean?.kind === 'model' && clean.parts[0]?.faces.f_py).toEqual(body.faces.py)
    expect(opsMod.boxToMesh(result.model, 'body')).toBeNull()
  })

  test('boxToMesh na rampa migra as retangulares e avisa as laterais pintadas', () => {
    const model = fixturesMod.makeModel()
    const wing = model.parts[1]
    if (!wing?.faces.slope) throw new Error('fixture sem rampa')
    const side = faceSkinSize(wing, 'px', model.texelsPerUnit)
    if (!side) throw new Error('sem lateral')
    wing.faces.px = fixturesMod.paintedSkin(side.width, side.height, () => 3)
    const result = opsMod.boxToMesh(model, 'wing')
    if (!result) throw new Error('sem conversão')
    const part = result.model.parts.find((p) => p.id === 'wing')
    expect(part?.faces.f_slope).toBe(wing.faces.slope)
    expect(part?.faces.f_px).toBeUndefined()
    expect(result.lostFaces).toEqual(['px'])
    expect(Object.keys(part?.mesh?.faces ?? {})).toHaveLength(5)
    expect(geometryMod.partTriangleCount(part ?? wing)).toBe(8)
  })

  test('boxToMesh na bola vira triângulos com vértices unidos', () => {
    const model = fixturesMod.makeModel({
      parts: [
        createPart({
          id: 'ball',
          name: 'bola',
          shape: 'sphere',
          from: [0, 0, 0],
          to: [4, 4, 4],
          color: 2,
        }),
      ],
    })
    const result = opsMod.boxToMesh(model, 'ball')
    if (!result) throw new Error('sem conversão')
    const part = result.model.parts[0]
    expect(part?.shape).toBe('mesh')
    expect(geometryMod.partTriangleCount(part ?? model.parts[0]!)).toBe(120)
    expect(Object.keys(part?.mesh?.vertices ?? {}).length).toBeLessThan(120 * 3)
  })

  test('setPartBox numa malha escala os vértices junto', () => {
    const model = fixturesMod.makeModel({
      parts: [
        createPart({
          id: 'm',
          name: 'malha',
          shape: 'mesh',
          from: [0, 0, 0],
          to: [2, 2, 2],
          color: 2,
        }),
      ],
    })
    const moved = setPartBox(model, 'm', [1, 0, 1], [5, 2, 3])
    const part = moved.parts[0]
    expect(part?.from).toEqual([1, 0, 1])
    expect(part?.mesh?.vertices.v_111).toEqual([5, 2, 3])
    expect(part?.mesh?.vertices.v_000).toEqual([1, 0, 1])
  })

  test('resize de malha já fica canônico e não muda ao salvar e abrir', () => {
    const mesh: MoldaMesh = {
      vertices: {
        v_a: [0, 0, 0],
        v_b: [1.5, 0, 0],
        v_c: [0, 1, 0],
        v_d: [0.5, 0, 1],
      },
      faces: {
        f_0: { v: ['v_a', 'v_b', 'v_c'] },
        f_1: { v: ['v_a', 'v_d', 'v_b'] },
        f_2: { v: ['v_b', 'v_d', 'v_c'] },
        f_3: { v: ['v_c', 'v_d', 'v_a'] },
      },
    }
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [1.5, 1, 1],
      color: 2,
      mesh,
    })
    const model = makeModel({ parts: [part] })

    const resized = setPartBox(model, 'm', [0, 0, 0], [2, 1, 1])
    const resizedMesh = resized.parts[0]?.mesh
    if (!resizedMesh) throw new Error('sem malha')
    expect(resizedMesh.vertices.v_d?.[0]).toBe(11 / 16)
    for (const point of Object.values(resizedMesh.vertices)) {
      for (const value of point) {
        expect(value / MOLDA_LIMITS.meshPrecision).toBe(
          Math.round(value / MOLDA_LIMITS.meshPrecision),
        )
      }
    }
    expect(sanitizeMoldaAsset(structuredClone(resized))).toEqual(resized)
  })
})

describe('movePartsBy + trancar/esconder (06/09/2026)', () => {
  test('o grupo anda pelo mesmo delta, preso à grade pelo grupo inteiro', () => {
    const model = makeModel()
    // corpo x ∈ [-2, 2], asa x ∈ [2, 5]: 20 para a direita vira 11 (a asa bate em 16).
    const moved = movePartsBy(model, ['body', 'wing'], [20, 0, 0])
    expect(moved.parts[0]?.from[0]).toBe(9)
    expect(moved.parts[1]?.to[0]).toBe(16)
    // Delta zero depois do clamp = mesma referência.
    expect(movePartsBy(moved, ['body', 'wing'], [1, 0, 0])).toBe(moved)
    expect(movePartsBy(model, [], [1, 0, 0])).toBe(model)
  })

  test('peça trancada fica parada; updatePart liga/desliga locked e hidden sem deixar `false`', () => {
    const model = makeModel()
    const locked = updatePart(model, 'body', { locked: true })
    expect(locked.parts[0]?.locked).toBe(true)
    const moved = movePartsBy(locked, ['body', 'wing'], [1, 0, 0])
    expect(moved.parts[0]?.from[0]).toBe(-2)
    expect(moved.parts[1]?.from[0]).toBe(3)
    expect(movePartsBy(locked, ['body'], [1, 0, 0])).toBe(locked)
    const unlocked = updatePart(locked, 'body', { locked: false })
    expect('locked' in (unlocked.parts[0] ?? {})).toBe(false)
    const hidden = updatePart(model, 'body', { hidden: true })
    expect(hidden.parts[0]?.hidden).toBe(true)
    expect('hidden' in (updatePart(hidden, 'body', { hidden: false }).parts[0] ?? {})).toBe(false)
  })

  test('recusa o grupo inteiro quando um novo gêmeo não cabe no teto de peças', () => {
    const crossing = createPart({
      id: 'a',
      name: 'a',
      from: [-1, 0, 0],
      to: [1, 1, 1],
      color: 1,
    })
    const otherCrossing = createPart({
      id: 'c',
      name: 'c',
      from: [-1, 2, 0],
      to: [1, 3, 1],
      color: 1,
    })
    const pairs = Array.from({ length: 63 }, (_unused, index) => {
      const source = createPart({
        id: `s${index}`,
        name: `s${index}`,
        from: [4, 4, 0],
        to: [5, 5, 1],
        color: 1,
      })
      return [source, mirrorTwinOf(source, { id: `t${index}`, name: `t${index}` })]
    }).flat()
    const model = {
      ...createModelAsset({ name: 'lotado', starter: false }),
      mirrorX: true,
      parts: [crossing, otherCrossing, ...pairs],
    }
    expect(model.parts).toHaveLength(MOLDA_LIMITS.maxParts)

    const moved = movePartsBy(model, ['a', 's0'], [2, 0, 0])

    expect(moved).toBe(model)
    expect(moved.parts.find((part) => part.id === 'a')?.from).toEqual([-1, 0, 0])
    expect(moved.parts.find((part) => part.id === 's0')?.from).toEqual([4, 4, 0])

    const dragged = setPartBoxes(model, [
      { id: 'a', from: [1, 0, 0], to: [3, 1, 1] },
      { id: 's0', from: [6, 4, 0], to: [7, 5, 1] },
    ])
    expect(dragged).toBe(model)
    expect(dragged.parts.find((part) => part.id === 's0')?.from).toEqual([4, 4, 0])
  })
})

describe('review 06/09: duplicar malha, teto de triângulos e mover sem deformar', () => {
  test('duplicar uma peça de malha leva os vértices junto com a caixa e nasce visível e destrancada', () => {
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
      mesh: boxMesh([0, 0, 0], [2, 2, 2]),
    })
    part.locked = true
    part.hidden = true
    const model = makeModel({ parts: [part], mirrorX: false })
    const result = duplicatePart(model, 'm')
    if (!result) throw new Error('sem cópia')
    const copy = result.model.parts.find((item) => item.id === result.partId)
    if (!copy?.mesh) throw new Error('cópia sem malha')
    expect(meshBox(copy.mesh)).toEqual({ from: copy.from, to: copy.to })
    expect(copy.from).not.toEqual(part.from)
    expect('locked' in copy).toBe(false)
    expect('hidden' in copy).toBe(false)
  })

  test('duplicar respeita o teto de triângulos do modelo', () => {
    // Uma grade de 22×22 quads (968 triângulos): ~20 cópias enchem o teto antes das 128 peças.
    const vertices: Record<string, Vec3> = {}
    const faces: MoldaMesh['faces'] = {}
    for (let i = 0; i <= 22; i += 1) {
      for (let j = 0; j <= 22; j += 1) vertices[`v_${i}x${j}`] = [i * 0.25, 0, j * 0.25]
    }
    for (let i = 0; i < 22; i += 1) {
      for (let j = 0; j < 22; j += 1) {
        faces[`f_${i}x${j}`] = {
          v: [`v_${i}x${j}`, `v_${i}x${j + 1}`, `v_${i + 1}x${j + 1}`, `v_${i + 1}x${j}`],
        }
      }
    }
    const big = createPart({
      id: 'b',
      name: 'grande',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [5.5, 0, 5.5],
      color: 2,
      mesh: { vertices, faces },
    })
    const model = makeModel({ parts: [big], mirrorX: false })
    const budget = MOLDA_LIMITS.maxTriangles
    const perCopy = partTriangleCount(big)
    let filler = model
    while (modelTriangleCount(filler) + perCopy <= budget) {
      const copy = duplicatePart(filler, 'b')
      if (!copy) break
      filler = copy.model
    }
    expect(filler.parts.length).toBeLessThan(MOLDA_LIMITS.maxParts)
    expect(modelTriangleCount(filler) + perCopy).toBeGreaterThan(budget)
    expect(duplicatePart(filler, 'b')).toBeNull()
  })

  test('ligar o espelho recusa atomicamente quando os gêmeos dobrariam o teto de triângulos', () => {
    const model = {
      ...createModelAsset({ name: 'cheio', starter: false }),
      parts: Array.from({ length: 20 }, (_unused, index) => denseMeshPart(`lado-${index}`, index)),
    }
    expect(modelTriangleCount(model)).toBe(MOLDA_LIMITS.maxTriangles)
    expect(setMirrorX(model, true)).toBe(model)
    expect(trySetMirrorX(model, true)).toEqual({ ok: false, reason: 'triangles-full' })
  })

  test('com o espelho ligado, adicionar e duplicar contam também o gêmeo projetado', () => {
    const full = setMirrorX(
      {
        ...createModelAsset({ name: 'cheio', starter: false }),
        parts: Array.from({ length: 10 }, (_unused, index) =>
          denseMeshPart(`lado-${index}`, index),
        ),
      },
      true,
    )
    expect(modelTriangleCount(full)).toBe(MOLDA_LIMITS.maxTriangles)
    expect(addPart(full, 'box')).toBeNull()

    const almostFull = setMirrorX(
      {
        ...createModelAsset({ name: 'quase-cheio', starter: false }),
        parts: Array.from({ length: 9 }, (_unused, index) =>
          denseMeshPart(`fonte-${index}`, index),
        ),
      },
      true,
    )
    almostFull.parts.push(denseMeshPart('eixo', 20, true))
    expect(modelTriangleCount(almostFull)).toBe(19_000)
    expect(duplicatePart(almostFull, 'fonte-0')).toBeNull()
  })

  test('mover uma fonte para fora do eixo recusa o gêmeo que estouraria o teto', () => {
    const model = setMirrorX(
      {
        ...createModelAsset({ name: 'quase-cheio', starter: false }),
        parts: Array.from({ length: 9 }, (_unused, index) =>
          denseMeshPart(`fonte-${index}`, index),
        ),
      },
      true,
    )
    const axis = denseMeshPart('eixo', 20, true)
    const box = createPart({
      id: 'caixa',
      name: 'caixa',
      from: [-1, 30, 4],
      to: [1, 31, 5],
      color: 2,
    })
    model.parts.push(axis, box)
    expect(modelTriangleCount(model)).toBe(19_012)
    expect(setPartBox(model, axis.id, [3, 20, -1], [5, 20, 1])).toBe(model)
  })

  test('mover uma malha cuja caixa não está no encaixe é uma translação exata', () => {
    const mesh = boxMesh([0, 0, 0], [2, 2, 2])
    mesh.vertices.v_111 = [2.6875, 2.6875, 2.6875]
    const part = createPart({
      id: 'm',
      name: 'malha',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [3, 3, 3],
      color: 2,
      mesh,
    })
    const model = makeModel({ parts: [part], mirrorX: false })
    const moved = movePartBy(model, 'm', [1, 0, 0])
    const next = moved.parts[0]
    if (!next?.mesh) throw new Error('sem malha')
    for (const [key, v] of Object.entries(mesh.vertices)) {
      expect(next.mesh.vertices[key]).toEqual([v[0] + 1, v[1], v[2]])
    }
    expect(next.from).toEqual([1, 0, 0])
    expect(next.to).toEqual([3.6875, 2.6875, 2.6875])
    // Mesma caixa = mesma referência (nada a fazer).
    expect(setPartBox(moved, 'm', next.from, next.to)).toBe(moved)
  })
})
