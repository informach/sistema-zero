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
  AVATAR_HIDE_GROUPS,
  AVATAR_PALETTE_SETS,
  AVATAR_REMOVABLE_NONE,
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
      // Grátis e da festa (B16, só a festa concede) não têm preço; as pagas têm.
      expect(p.tier === 'coins' ? p.price > 0 : p.price === 0).toBe(true)
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

/**
 * Peças próprias de 26/10/2026 (proposta "Provador do avatar"): a aba Enfeite, a paleta do
 * acessório e o rosto delicado grátis.
 */
describe('avatar3d: aba Enfeite e peças novas', () => {
  const cfg = (slots: Record<string, AvatarSlot>): AvatarConfig => ({
    version: 2,
    style: 'char-v1',
    slots: slots as AvatarConfig['slots'],
  })

  test('Enfeite: removível, tintável e escondido junto com o cabelo pelo chapéu', () => {
    expect(AVATAR_REMOVABLE_NONE.hairAccessory).toBe('enfeite-none')
    expect(AVATAR_CATEGORY_PALETTES.hairAccessory?.length).toBeGreaterThan(0)
    expect(AVATAR_HIDE_GROUPS.hat).toEqual(['hair', 'hairAccessory'])
    expect(DEFAULT_AVATAR_SLOTS.hairAccessory.asset).toBe('enfeite-none')
  })

  test('enfeite pago precisa estar no inventário; a cor vem da paleta das roupas', () => {
    const laco = { asset: 'enfeite-01', color: '#9b59b6' }
    expect(() => assertEquippableConfig(cfg({ hairAccessory: laco }), new Set())).toThrow(
      AvatarPartNotOwnedError,
    )
    expect(() =>
      assertEquippableConfig(cfg({ hairAccessory: laco }), new Set(['enfeite-01'])),
    ).not.toThrow()
    expect(() =>
      assertEquippableConfig(
        cfg({ hairAccessory: { asset: 'enfeite-01', color: '#123456' } }),
        new Set(['enfeite-01']),
      ),
    ).toThrow(AvatarInvalidError)
  })

  test('acessório aceita cor da paleta; config antiga sem cor ganha a cor padrão', () => {
    expect(() =>
      assertEquippableConfig(
        cfg({ accessory: { asset: 'acc-09', color: '#3498db' } }),
        new Set(['acc-09']),
      ),
    ).not.toThrow()
    const antigo = canonicalizeAvatarConfig({
      version: 2,
      style: 'char-v1',
      slots: { accessory: { asset: 'acc-01' } },
    } as unknown as AvatarConfig)
    expect(antigo.slots.accessory).toEqual({
      asset: 'acc-01',
      color: DEFAULT_AVATAR_SLOTS.accessory.color as string,
    })
    // Config gravada antes da aba Enfeite: a categoria nova entra com o "nenhum".
    expect(antigo.slots.hairAccessory?.asset).toBe('enfeite-none')
  })

  test('rosto delicado é grátis: sorrisos, olhos, sobrancelha, nariz e bochecha', () => {
    for (const id of [
      'head-05',
      'head-06',
      'eyes-13',
      'eyes-14',
      'eyebrow-11',
      'nose-05',
      'face-10',
    ]) {
      expect(AVATAR3D_PARTS_BY_ID.get(id)?.tier, id).toBe('free')
    }
    expect(AVATAR3D_PARTS_BY_ID.get('hair-12')?.tier).toBe('free')
  })
})
