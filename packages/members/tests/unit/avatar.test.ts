import { describe, expect, test } from 'bun:test'
import { AvatarInvalidError, AvatarPartNotOwnedError } from '../../src/domain/avatar/avatar.errors'
import {
  type AvatarConfig,
  assertEquippableConfig,
  canonicalizeAvatarConfig,
  defaultAvatarConfig,
} from '../../src/domain/avatar/avatar-config'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_PALETTES,
  AVATAR_PALETTE_SETS,
  AVATAR3D_PARTS,
  AVATAR3D_PARTS_BY_ID,
  type AvatarSlot,
  DEFAULT_AVATAR_SLOTS,
} from '../../src/domain/avatar/avatar3d-catalog'

describe('avatar3d — catálogo', () => {
  test('ids únicos; default existe/grátis/categoria certa; cor default ∈ paleta; preço coerente', () => {
    const ids = AVATAR3D_PARTS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length) // sem duplicados

    for (const category of AVATAR_CATEGORIES) {
      const def = DEFAULT_AVATAR_SLOTS[category]
      const part = AVATAR3D_PARTS_BY_ID.get(def.asset)
      expect(part, `default de ${category} (${def.asset}) existe`).toBeDefined()
      expect(part?.tier).toBe('free')
      expect(part?.category).toBe(category)
      const palette = AVATAR_PALETTE_SETS[category]
      if (palette) {
        expect(def.color, `default de ${category} tem cor`).toBeDefined()
        expect(palette.has(def.color as string)).toBe(true)
      } else {
        expect(def.color, `categoria ${category} sem paleta → sem cor default`).toBeUndefined()
      }
    }
    for (const p of AVATAR3D_PARTS) {
      expect(AVATAR_CATEGORIES).toContain(p.category)
      expect(p.tier === 'free' ? p.price === 0 : p.price > 0).toBe(true)
    }
  })

  test('paletas: todo hex minúsculo e válido', () => {
    for (const colors of Object.values(AVATAR_CATEGORY_PALETTES)) {
      for (const c of colors ?? []) expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('avatar3d — defaultAvatarConfig / canonicalize', () => {
  test('default tem version 2 + uma peça grátis por categoria', () => {
    const cfg = defaultAvatarConfig()
    expect(cfg.version).toBe(2)
    for (const category of AVATAR_CATEGORIES) {
      expect(cfg.slots[category]?.asset).toBe(DEFAULT_AVATAR_SLOTS[category].asset)
    }
  })

  test('legado DiceBear (sem version:2) → default 3D inteiro', () => {
    const cfg = canonicalizeAvatarConfig({
      style: 'adventurer',
      parts: { hair: 'cabelo-curtinho' },
    } as unknown as AvatarConfig)
    expect(cfg.version).toBe(2)
    expect(cfg.slots.hair?.asset).toBe(DEFAULT_AVATAR_SLOTS.hair.asset)
    expect(cfg.slots.head?.asset).toBe(DEFAULT_AVATAR_SLOTS.head.asset)
  })

  test('null → default', () => {
    expect(canonicalizeAvatarConfig(null).slots.top?.asset).toBe(DEFAULT_AVATAR_SLOTS.top.asset)
  })

  test('v2: válida mantida; desconhecida → default; cor fora da paleta → cor default; sem paleta → cor dropada', () => {
    const cfg = canonicalizeAvatarConfig({
      version: 2,
      style: 'char-v1',
      slots: {
        hair: { asset: 'hair-04', color: '#27ae60' },
        top: { asset: 'inexistente-xyz' },
        bottom: { asset: 'bottom-02', color: '#000000' },
        eyes: { asset: 'eyes-02', color: '#ffffff' },
      },
    } as unknown as AvatarConfig)
    expect(cfg.slots.hair).toEqual({ asset: 'hair-04', color: '#27ae60' })
    expect(cfg.slots.top?.asset).toBe(DEFAULT_AVATAR_SLOTS.top.asset)
    expect(cfg.slots.bottom?.asset).toBe('bottom-02')
    expect(cfg.slots.bottom?.color).toBe(DEFAULT_AVATAR_SLOTS.bottom.color)
    expect(cfg.slots.eyes?.asset).toBe('eyes-02')
    expect(cfg.slots.eyes?.color).toBeUndefined()
  })

  test('cor em MAIÚSCULO é normalizada (minúsculo) e aceita', () => {
    const cfg = canonicalizeAvatarConfig({
      version: 2,
      style: 'char-v1',
      slots: { hair: { asset: 'hair-01', color: '#2C1B18' } },
    } as unknown as AvatarConfig)
    expect(cfg.slots.hair?.color).toBe('#2c1b18')
  })
})

describe('avatar3d — assertEquippableConfig (escrita estrita)', () => {
  const cfg = (slots: Record<string, AvatarSlot>): AvatarConfig => ({
    version: 2,
    style: 'char-v1',
    slots: slots as AvatarConfig['slots'],
  })

  test('aceita peças grátis sem inventário', () => {
    expect(() =>
      assertEquippableConfig(
        cfg({ hair: { asset: 'hair-01' }, head: { asset: 'head-03' } }),
        new Set(),
      ),
    ).not.toThrow()
  })

  test('peça desconhecida → AvatarInvalidError', () => {
    expect(() => assertEquippableConfig(cfg({ hair: { asset: 'nao-existe' } }), new Set())).toThrow(
      AvatarInvalidError,
    )
  })

  test('peça na categoria errada → AvatarInvalidError', () => {
    expect(() => assertEquippableConfig(cfg({ head: { asset: 'hair-01' } }), new Set())).toThrow(
      AvatarInvalidError,
    )
  })

  test('categoria desconhecida → AvatarInvalidError', () => {
    expect(() => assertEquippableConfig(cfg({ xpto: { asset: 'hair-01' } }), new Set())).toThrow(
      AvatarInvalidError,
    )
  })

  test('peça paga não possuída → AvatarPartNotOwnedError; possuída → ok', () => {
    expect(() => assertEquippableConfig(cfg({ hair: { asset: 'hair-04' } }), new Set())).toThrow(
      AvatarPartNotOwnedError,
    )
    expect(() =>
      assertEquippableConfig(cfg({ hair: { asset: 'hair-04' } }), new Set(['hair-04'])),
    ).not.toThrow()
  })

  test('cor fora da paleta → 400; categoria sem paleta + cor → 400; cor na paleta → ok', () => {
    expect(() =>
      assertEquippableConfig(cfg({ hair: { asset: 'hair-01', color: '#000000' } }), new Set()),
    ).toThrow(AvatarInvalidError)
    expect(() =>
      assertEquippableConfig(cfg({ eyes: { asset: 'eyes-01', color: '#ffffff' } }), new Set()),
    ).toThrow(AvatarInvalidError)
    expect(() =>
      assertEquippableConfig(cfg({ hair: { asset: 'hair-01', color: '#2c1b18' } }), new Set()),
    ).not.toThrow()
  })
})
