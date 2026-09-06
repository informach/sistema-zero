import { describe, expect, test } from 'bun:test'
import { createPart, type MoldaModelAsset } from '../core/model'
import { makeModel, paintedSkin } from '../testing/fixtures'
import { faceSkinSize } from './shapes'
import { bakeTwins, mirrorTwinOf, syncTwins, twinFaceSkin } from './twins'

function withTwins(): MoldaModelAsset {
  const model = makeModel({ mirrorX: true })
  const source = createPart({
    id: 'src',
    name: 'braco',
    from: [1, 0, -1],
    to: [3, 2, 1],
    color: 3,
    rotation: [15, 30, 45],
  })
  source.origin = [1, 0, 0]
  const size = faceSkinSize(source, 'px', model.texelsPerUnit)
  if (!size) throw new Error('size')
  source.faces.px = paintedSkin(size.width, size.height, (x) => (x === 0 ? 7 : 0))
  const twin = {
    ...createPart({ id: 'twin', name: 'braco-2', from: [0, 0, 0], to: [1, 1, 1], color: 1 }),
    mirrorOf: 'src',
  }
  return { ...model, parts: [source, twin] }
}

describe('gêmeos', () => {
  test('mirrorTwinOf espelha a caixa no X, inverte ry/rz e copia a cor', () => {
    const model = withTwins()
    const [source, twin] = model.parts
    if (!source || !twin) throw new Error('fixture')
    const derived = mirrorTwinOf(source, twin)
    expect(derived.from).toEqual([-3, 0, -1])
    expect(derived.to).toEqual([-1, 2, 1])
    expect(derived.rotation).toEqual([15, 330, 315])
    expect(derived.origin).toEqual([-1, 0, 0])
    expect(derived.color).toBe(3)
    expect(derived.id).toBe('twin')
    expect(derived.name).toBe('braco-2')
    expect(derived.faces).toEqual({})
  })

  test('syncTwins reescreve o gêmeo e é idempotente (mesma referência na 2ª vez)', () => {
    const model = withTwins()
    const synced = syncTwins(model)
    expect(synced).not.toBe(model)
    expect(synced.parts[1]?.from).toEqual([-3, 0, -1])
    expect(syncTwins(synced)).toBe(synced)
  })

  test('syncTwins remove o gêmeo quando a fonte passa a cruzar o plano X', () => {
    const synced = syncTwins(withTwins())
    const source = synced.parts[0]
    if (!source) throw new Error('fixture')
    const crossing = {
      ...synced,
      parts: synced.parts.map((part) =>
        part.id === source.id
          ? {
              ...part,
              from: [-1, 0, -1] as [number, number, number],
              to: [1, 2, 1] as [number, number, number],
            }
          : part,
      ),
    }

    const out = syncTwins(crossing)

    expect(out.parts).toHaveLength(1)
    expect(out.parts[0]?.id).toBe('src')
    expect(syncTwins(out)).toBe(out)
  })

  test('a pele do gêmeo é a da face espelhada da fonte, invertida', () => {
    const model = syncTwins(withTwins())
    const source = model.parts[0]
    if (!source) throw new Error('fixture')
    const skin = twinFaceSkin(source, 'nx')
    expect(skin).toBeDefined()
    if (!skin || !source.faces.px) return
    expect(skin.data[skin.width - 1]).toBe(7)
    expect(skin.data[0]).toBe(0)
    expect(twinFaceSkin(source, 'py')).toBeUndefined()
  })

  test('bakeTwins solta o gêmeo com a pele que ele mostrava', () => {
    const model = syncTwins(withTwins())
    const baked = bakeTwins(model)
    const twin = baked.parts[1]
    expect(twin?.mirrorOf).toBeUndefined()
    expect(twin?.faces.nx).toBeDefined()
    expect(twin?.faces.nx?.data[(twin?.faces.nx?.width ?? 1) - 1]).toBe(7)
    expect(bakeTwins(baked)).toBe(baked)
  })
})

const { meshFaceFrame: frameOfMesh } = await import('./meshFrame')
const twinsMod = await import('./twins')
const modelMod = await import('../core/model')
const fixtures = await import('../testing/fixtures')

describe('gêmeos de malha (06/09/2026)', () => {
  test('o gêmeo espelha x, inverte os ciclos, a base da face é a da caixa espelhada, e o sync repetido é no-op', () => {
    const model = fixtures.makeModel({
      mirrorX: true,
      parts: [
        modelMod.createPart({
          id: 'm',
          name: 'malha',
          shape: 'mesh',
          from: [1, 0, 0],
          to: [3, 2, 2],
          color: 2,
        }),
      ],
    })
    const synced = twinsMod.syncTwins(model)
    const source = synced.parts.find((p) => p.id === 'm')
    const twin = synced.parts.find((p) => p.mirrorOf === 'm')
    if (!source?.mesh || !twin?.mesh) throw new Error('sem gêmeo')
    expect(twin.from).toEqual([-3, 0, 0])
    expect(twin.to).toEqual([-1, 2, 2])
    expect(twin.mesh.vertices.v_111).toEqual([-3, 2, 2])
    expect(twin.mesh.faces.f_pz?.v).toEqual([...(source.mesh.faces.f_pz?.v ?? [])].reverse())
    const frame = frameOfMesh(twin.mesh, 'f_pz')
    if (!frame) throw new Error('sem base')
    expect(frame.origin).toEqual([-3, 2, 2])
    expect(frame.s.map((n) => Math.round(n * 1e6) / 1e6 + 0)).toEqual([1, 0, 0])
    expect(frame.normal.map((n) => Math.round(n * 1e6) / 1e6 + 0)).toEqual([0, 0, 1])
    expect(twinsMod.syncTwins(synced)).toBe(synced)
  })
})

describe('gêmeos: trancada / escondida', () => {
  test('o gêmeo herda locked e hidden da fonte', () => {
    const source = createPart({ id: 's', name: 'fonte', from: [1, 0, 0], to: [3, 1, 1], color: 2 })
    source.locked = true
    source.hidden = true
    const twin = mirrorTwinOf(source, { id: 't', name: 'espelho' })
    expect(twin.locked).toBe(true)
    expect(twin.hidden).toBe(true)
    const { locked: _locked, hidden: _hidden, ...plainSource } = source
    const plain = mirrorTwinOf(plainSource, { id: 't', name: 'e' })
    expect('locked' in plain).toBe(false)
  })
})
