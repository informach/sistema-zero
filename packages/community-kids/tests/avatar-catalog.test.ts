import { describe, expect, test } from 'bun:test'
import {
  AVATAR_LAYERS,
  AVATAR_PART_INFO,
  buildAvatarOptions,
  DEFAULT_AVATAR_PART_IDS,
} from '../src/lib/avatar-catalog'

describe('avatar-catalog (kids) — mapeamento DiceBear', () => {
  test('config nula → opções com a peça grátis de cada camada', () => {
    const opts = buildAvatarOptions(null)
    expect(opts.skinColor).toEqual(['ecad80']) // pele-media
    expect(opts.hair).toEqual(['short01']) // cabelo-curtinho
    expect(opts.hairColor).toEqual(['6a4e35']) // cor-castanho
    expect(opts.glassesProbability).toBe(0) // oculos-nenhum
    expect(opts.earringsProbability).toBe(0) // brincos-nenhum
  })

  test('acessório escolhido → variante + probabilidade 100', () => {
    const opts = buildAvatarOptions({
      parts: { glasses: 'oculos-estiloso', earrings: 'brincos-estrela' },
    })
    expect(opts.glasses).toEqual(['variant05'])
    expect(opts.glassesProbability).toBe(100)
    expect(opts.earrings).toEqual(['variant03'])
    expect(opts.earringsProbability).toBe(100)
  })

  test('peça desconhecida → cai no default da camada (forward-compat)', () => {
    const opts = buildAvatarOptions({ parts: { hair: 'cabelo-inexistente-xyz' } })
    expect(opts.hair).toEqual(['short01'])
  })

  test('todo default existe no info e está na camada certa', () => {
    for (const layer of AVATAR_LAYERS) {
      const info = AVATAR_PART_INFO[DEFAULT_AVATAR_PART_IDS[layer]]
      expect(info).toBeDefined()
      expect(info?.layer).toBe(layer)
    }
  })
})
