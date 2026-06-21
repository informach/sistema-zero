import { describe, expect, test } from 'bun:test'
import { AvatarInvalidError, AvatarPartNotOwnedError } from '../../src/domain/avatar/avatar.errors'
import {
  assertEquippableConfig,
  canonicalizeAvatarConfig,
  defaultAvatarConfig,
} from '../../src/domain/avatar/avatar-config'
import {
  AVATAR_LAYERS,
  AVATAR_PARTS,
  AVATAR_PARTS_BY_ID,
  DEFAULT_AVATAR_PART_IDS,
} from '../../src/domain/avatar/parts-catalog'

describe('avatar — catálogo', () => {
  test('ids únicos; todo default existe e é grátis; toda peça tem camada válida', () => {
    const ids = AVATAR_PARTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length) // sem duplicados

    for (const layer of AVATAR_LAYERS) {
      const defId = DEFAULT_AVATAR_PART_IDS[layer]
      const part = AVATAR_PARTS_BY_ID.get(defId)
      expect(part).toBeDefined()
      expect(part?.tier).toBe('free')
      expect(part?.layer).toBe(layer)
    }
    for (const p of AVATAR_PARTS) {
      expect(AVATAR_LAYERS).toContain(p.layer)
      expect(p.tier === 'free' ? p.price === 0 : p.price > 0).toBe(true)
    }
  })
})

describe('avatar — defaultAvatarConfig / canonicalize', () => {
  test('default tem uma peça grátis por camada', () => {
    const cfg = defaultAvatarConfig()
    for (const layer of AVATAR_LAYERS) {
      expect(cfg.parts[layer]).toBe(DEFAULT_AVATAR_PART_IDS[layer])
    }
  })

  test('canonicalize preenche camadas faltantes e descarta peça desconhecida', () => {
    const cfg = canonicalizeAvatarConfig({
      style: 'adventurer',
      parts: { hair: 'cabelo-cacheado', eyes: 'inexistente-xyz' },
    })
    expect(cfg.parts.hair).toBe('cabelo-cacheado') // mantém a válida
    expect(cfg.parts.eyes).toBe(DEFAULT_AVATAR_PART_IDS.eyes) // desconhecida → default
    expect(cfg.parts.skin).toBe(DEFAULT_AVATAR_PART_IDS.skin) // faltante → default
  })
})

describe('avatar — assertEquippableConfig (escrita estrita)', () => {
  test('aceita peças grátis sem inventário', () => {
    expect(() =>
      assertEquippableConfig(
        { style: 'adventurer', parts: { hair: 'cabelo-curtinho', skin: 'pele-escura' } },
        new Set(),
      ),
    ).not.toThrow()
  })

  test('peça desconhecida → AvatarInvalidError', () => {
    expect(() =>
      assertEquippableConfig({ style: 'adventurer', parts: { hair: 'nao-existe' } }, new Set()),
    ).toThrow(AvatarInvalidError)
  })

  test('peça na camada errada → AvatarInvalidError', () => {
    expect(() =>
      assertEquippableConfig(
        { style: 'adventurer', parts: { skin: 'cabelo-curtinho' } },
        new Set(),
      ),
    ).toThrow(AvatarInvalidError)
  })

  test('peça paga não possuída → AvatarPartNotOwnedError; possuída → ok', () => {
    expect(() =>
      assertEquippableConfig(
        { style: 'adventurer', parts: { hair: 'cabelo-cacheado' } },
        new Set(),
      ),
    ).toThrow(AvatarPartNotOwnedError)
    expect(() =>
      assertEquippableConfig(
        { style: 'adventurer', parts: { hair: 'cabelo-cacheado' } },
        new Set(['cabelo-cacheado']),
      ),
    ).not.toThrow()
  })
})
