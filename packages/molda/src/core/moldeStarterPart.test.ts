import { describe, expect, test } from 'bun:test'
import { MOLDA_LIMITS } from './limits'
import { createAsset, moldeStarterPart } from './model'
import { sanitizeMoldaAsset } from './sanitize'

describe('moldeStarterPart', () => {
  test('caixa centrada no chão, com o lado em meio bloco (o que o sanitize guarda)', () => {
    const part = moldeStarterPart({ width: 13.12, height: 28, depth: 13.28 })
    expect(part.name).toBe('molde')
    expect(part.from).toEqual([-6.5, 0, -6.75])
    expect(part.to).toEqual([6.5, 28, 6.75])
    for (const v of [...part.from, ...part.to]) expect(Number.isInteger(v * 16)).toBe(true)
  })

  test('cabe na grade e nunca some', () => {
    const grande = moldeStarterPart({ width: 99, height: 99, depth: 0 })
    expect(grande.to[0] - grande.from[0]).toBe(MOLDA_LIMITS.gridHalf * 2)
    expect(grande.to[1]).toBe(MOLDA_LIMITS.gridHeight)
    expect(grande.to[2] - grande.from[2]).toBe(0.5)
  })

  test('o modelo novo com molde nasce só com a caixa dele', () => {
    const asset = createAsset(
      {
        kind: 'model',
        name: 'x',
        starterBox: { width: 2, height: 3, depth: 1, name: 'geladeira' },
      },
      'molde-x',
    )
    if (asset.kind !== 'model') throw new Error('modelo esperado')
    expect(asset.parts.map((p) => [p.name, p.from, p.to])).toEqual([
      ['geladeira', [-1, 0, -0.5], [1, 3, 0.5]],
    ])
  })

  test('o sanitize guarda a caixa do molde igualzinha (sem tirar do centro)', () => {
    const asset = createAsset(
      { kind: 'model', name: 'x', starterBox: { width: 13.12, height: 28, depth: 13.28 } },
      'molde-x',
    )
    const relido = sanitizeMoldaAsset(structuredClone(asset))
    if (relido?.kind !== 'model' || asset.kind !== 'model') throw new Error('modelo esperado')
    expect(relido.parts.map((p) => [p.from, p.to])).toEqual(asset.parts.map((p) => [p.from, p.to]))
  })
})
