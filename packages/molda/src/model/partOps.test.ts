import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart } from '../core/model'
import { sanitizeMoldaAsset } from '../core/sanitize'
import { makeModel } from '../testing/fixtures'
import {
  addExtraColor,
  addPart,
  addPartAtSurface,
  boxesOverlap,
  duplicatePart,
  findFreeSpot,
  movePartBy,
  nextPartName,
  removePart,
  setMirrorX,
  setPartBox,
  setPartSize,
  setSnap,
  updatePart,
} from './partOps'
import { faceSkinSize, partSize } from './shapes'

function overlapsAny(model: ReturnType<typeof makeModel>, id: string): boolean {
  const part = model.parts.find((p) => p.id === id)
  if (!part) throw new Error(id)
  return model.parts.some((other) => other.id !== id && boxesOverlap(other, part))
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

  test('setSnap normaliza as peças agora e não deixa o arquivo mudar ao reabrir', () => {
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

    expect(snapped.parts[0]?.from).toEqual([1, 0, -1])
    expect(snapped.parts[0]?.to).toEqual([3, 2, 1])
    expect(snapped.parts[0]?.origin).toEqual([1.5, 0.5, -0.5])
    expect(sanitizeMoldaAsset(structuredClone(snapped))).toEqual(snapped)
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

  test('nextPartName respeita o teto de chars', () => {
    const model = {
      parts: [createPart({ name: 'a'.repeat(24), from: [0, 0, 0], to: [1, 1, 1], color: 1 })],
    }
    const name = nextPartName(model, 'a'.repeat(24))
    expect(name).toHaveLength(24)
    expect(name.endsWith(' 2')).toBe(true)
  })
})
