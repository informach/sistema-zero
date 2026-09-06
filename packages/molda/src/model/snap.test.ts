import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from '../core/limits'
import { createModelAsset, createPart, type MoldaModelAsset, type Vec3 } from '../core/model'
import {
  applySnapMove,
  type SnapAnchor,
  SnapAnchorCache,
  snapSourceAnchors,
  snapTargetAnchors,
} from './snap'
import { mirrorTwinOf } from './twins'

function modelWith(parts: MoldaModelAsset['parts'], mirrorX = false): MoldaModelAsset {
  return { ...createModelAsset({ name: 'snap', starter: false }), mirrorX, parts }
}

function vertexAt(anchors: readonly SnapAnchor[], point: Vec3): SnapAnchor {
  const anchor = anchors.find(
    (candidate) =>
      candidate.ref.kind === 'vertex' &&
      candidate.point.every((value, axis) => value === point[axis]),
  )
  if (!anchor) throw new Error(`âncora ausente em ${point.join(',')}`)
  return anchor
}

describe('âncoras do Grudar', () => {
  test('caixa oferece vértices únicos, pivô e centro do grupo sem pontos duplicados', () => {
    const a = createPart({ id: 'a', name: 'a', from: [0, 0, 0], to: [2, 2, 2], color: 2 })
    const b = createPart({ id: 'b', name: 'b', from: [4, 0, 0], to: [6, 2, 2], color: 2 })
    const model = modelWith([a, b])

    const one = snapSourceAnchors(model, 'a', ['a'])
    expect(one.filter((anchor) => anchor.ref.kind === 'vertex')).toHaveLength(8)
    expect(one.filter((anchor) => anchor.ref.kind === 'pivot')).toHaveLength(1)
    expect(one).toHaveLength(9)

    const group = snapSourceAnchors(model, 'a', ['a', 'b'])
    expect(group.find((anchor) => anchor.ref.kind === 'selection-center')?.point).toEqual([3, 1, 1])
  })

  test('vértices usam a rotação da peça e chaves de malha continuam estáveis', () => {
    const box = createPart({
      id: 'box',
      name: 'box',
      from: [0, 0, 0],
      to: [2, 2, 4],
      color: 2,
      rotation: [0, 90, 0],
    })
    const mesh = createPart({
      id: 'mesh',
      name: 'mesh',
      shape: 'mesh',
      from: [0, 0, 0],
      to: [2, 2, 2],
      color: 2,
    })
    const model = modelWith([box, mesh])

    expect(snapSourceAnchors(model, 'box', ['box']).some((anchor) => anchor.point[0] === -1)).toBe(
      true,
    )
    expect(
      snapSourceAnchors(model, 'mesh', ['mesh']).some(
        (anchor) => anchor.ref.kind === 'vertex' && anchor.ref.vertexKey === 'mesh:v_000',
      ),
    ).toBe(true)
  })

  test('alvo trancado é permitido; alvo escondido, seleção e seus gêmeos ficam fora', () => {
    const source = createPart({
      id: 'source',
      name: 'source',
      from: [1, 0, 0],
      to: [2, 1, 1],
      color: 2,
    })
    const twin = mirrorTwinOf(source, { id: 'twin', name: 'twin' })
    const locked = createPart({
      id: 'locked',
      name: 'locked',
      from: [4, 0, 0],
      to: [5, 1, 1],
      color: 2,
    })
    locked.locked = true
    const hidden = createPart({
      id: 'hidden',
      name: 'hidden',
      from: [6, 0, 0],
      to: [7, 1, 1],
      color: 2,
    })
    hidden.hidden = true
    const model = modelWith([source, twin, locked, hidden], true)

    expect(snapTargetAnchors(model, 'locked', ['source']).length).toBeGreaterThan(0)
    expect(snapTargetAnchors(model, 'hidden', ['source'])).toEqual([])
    expect(snapTargetAnchors(model, 'source', ['source'])).toEqual([])
    expect(snapTargetAnchors(model, 'twin', ['source'])).toEqual([])
  })

  test('cache não conserva uma geometria primitiva que mudou', () => {
    const cache = new SnapAnchorCache()
    const part = createPart({ id: 'a', name: 'a', from: [0, 0, 0], to: [1, 1, 1], color: 2 })
    const before = snapSourceAnchors(modelWith([part]), 'a', ['a'], cache)
    const changed = { ...part, to: [2, 1, 1] as Vec3 }
    const after = snapSourceAnchors(modelWith([changed]), 'a', ['a'], cache)

    expect(vertexAt(before, [1, 1, 1]).point).toEqual([1, 1, 1])
    expect(vertexAt(after, [2, 1, 1]).point).toEqual([2, 1, 1])
  })
})

describe('movimento do Grudar', () => {
  test('recalcula as âncoras, arredonda o delta a 1/16 e move o grupo inteiro', () => {
    const a = createPart({ id: 'a', name: 'a', from: [0, 0, 0], to: [1, 1, 1], color: 2 })
    const b = createPart({ id: 'b', name: 'b', from: [0, 2, 0], to: [1, 3, 1], color: 2 })
    const target = createPart({
      id: 'target',
      name: 'target',
      from: [2 + 5 / 64, 0, 0],
      to: [3 + 5 / 64, 1, 1],
      color: 2,
    })
    const model = modelWith([a, b, target])
    const source = vertexAt(snapSourceAnchors(model, 'a', ['a', 'b']), [1, 1, 1])
    const destination = snapTargetAnchors(model, 'target', ['a', 'b']).find(
      (anchor) => anchor.ref.kind === 'vertex' && anchor.point[0] > 3,
    )
    if (!destination) throw new Error('destino ausente')

    const result = applySnapMove(model, ['a', 'b'], source.ref, destination.ref)

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.delta).toEqual([2 + 1 / 16, 0, 0])
    expect(result.model.parts.find((part) => part.id === 'a')?.from).toEqual([2 + 1 / 16, 0, 0])
    expect(result.model.parts.find((part) => part.id === 'b')?.from).toEqual([2 + 1 / 16, 2, 0])
    expect(result.model.parts.find((part) => part.id === 'target')).toBe(target)
  })

  test('recusa atomicamente grade, origem trancada, alvo inválido e referência velha', () => {
    const source = createPart({
      id: 'source',
      name: 'source',
      from: [0, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    const target = createPart({
      id: 'target',
      name: 'target',
      from: [15, 0, 0],
      to: [16, 1, 1],
      color: 2,
    })
    const model = modelWith([source, target])
    const sourceAnchor = vertexAt(snapSourceAnchors(model, 'source', ['source']), [0, 0, 0])
    const targetAnchor = vertexAt(snapTargetAnchors(model, 'target', ['source']), [16, 1, 1])

    const outside = applySnapMove(model, ['source'], sourceAnchor.ref, targetAnchor.ref)
    expect(outside).toEqual({ ok: false, reason: 'outside-grid' })

    const lockedModel = modelWith([{ ...source, locked: true }, target])
    expect(applySnapMove(lockedModel, ['source'], sourceAnchor.ref, targetAnchor.ref)).toEqual({
      ok: false,
      reason: 'locked-source',
    })

    const hiddenTarget = modelWith([source, { ...target, hidden: true }])
    expect(applySnapMove(hiddenTarget, ['source'], sourceAnchor.ref, targetAnchor.ref)).toEqual({
      ok: false,
      reason: 'invalid-target',
    })

    const changedTarget = modelWith([source, { ...target, to: [15.5, 1, 1] }])
    expect(applySnapMove(changedTarget, ['source'], sourceAnchor.ref, targetAnchor.ref)).toEqual({
      ok: false,
      reason: 'stale-anchor',
    })
  })

  test('espelho move o gêmeo junto e falha sem deixar movimento parcial quando falta vaga', () => {
    const source = createPart({
      id: 'source',
      name: 'source',
      from: [2, 0, 0],
      to: [3, 1, 1],
      color: 2,
    })
    const twin = mirrorTwinOf(source, { id: 'twin', name: 'twin' })
    const target = createPart({
      id: 'target',
      name: 'target',
      from: [5, 0, 0],
      to: [6, 1, 1],
      color: 2,
    })
    const mirrored = modelWith([source, twin, target], true)
    const sourceAnchor = vertexAt(snapSourceAnchors(mirrored, 'source', ['source']), [3, 1, 1])
    const targetAnchor = vertexAt(snapTargetAnchors(mirrored, 'target', ['source']), [5, 1, 1])
    const moved = applySnapMove(mirrored, ['source'], sourceAnchor.ref, targetAnchor.ref)
    expect(moved.ok).toBe(true)
    if (moved.ok) expect(moved.model.parts.find((part) => part.id === 'twin')?.to[0]).toBe(-4)

    const crossing = createPart({
      id: 'axis',
      name: 'axis',
      from: [-1, 0, 0],
      to: [1, 1, 1],
      color: 2,
    })
    const full = modelWith(
      [
        crossing,
        target,
        ...Array.from({ length: MOLDA_LIMITS.maxParts - 2 }, (_unused, index) =>
          createPart({
            id: `filler-${index}`,
            name: 'filler',
            from: [-1, 2, 0],
            to: [1, 3, 1],
            color: 2,
          }),
        ),
      ],
      true,
    )
    const axisAnchor = vertexAt(snapSourceAnchors(full, 'axis', ['axis']), [1, 1, 1])
    const farAnchor = vertexAt(snapTargetAnchors(full, 'target', ['axis']), [5, 1, 1])
    const failed = applySnapMove(full, ['axis'], axisAnchor.ref, farAnchor.ref)

    expect(failed).toEqual({ ok: false, reason: 'mirror-failure' })
    expect(full.parts[0]).toBe(crossing)
  })
})
