import { describe, expect, test } from 'bun:test'
import {
  AVATAR_CATEGORIES,
  AVATAR_CATEGORY_LABELS,
  AVATAR_CATEGORY_PALETTES,
  AVATAR_PART_INFO,
  AVATAR_REMOVABLE_NONE,
  DEFAULT_AVATAR_SLOTS,
} from '../src/lib/avatar3d-catalog'

/**
 * Consistência INTERNA do catálogo de apresentação do avatar 3D do kids. A conformância
 * kids×members (cada peça/categoria/paleta/default casa) é travada no members
 * (`tests/unit/catalog-conformance.test.ts`); aqui garantimos a sanidade local.
 */
describe('avatar3d-catalog (kids) — apresentação', () => {
  test('toda categoria tem rótulo e default coerente', () => {
    for (const cat of AVATAR_CATEGORIES) {
      expect(AVATAR_CATEGORY_LABELS[cat], `rótulo de ${cat}`).toBeTruthy()
      const def = DEFAULT_AVATAR_SLOTS[cat]
      const info = AVATAR_PART_INFO[def.asset]
      expect(info, `default ${cat} (${def.asset}) tem info`).toBeDefined()
      expect(info?.category).toBe(cat)
    }
  })

  test('toda peça do info tem categoria válida + rótulo PT', () => {
    for (const [id, info] of Object.entries(AVATAR_PART_INFO)) {
      expect(AVATAR_CATEGORIES, `categoria de ${id}`).toContain(info.category)
      expect(info.labelPt, `rótulo de ${id}`).toBeTruthy()
    }
  })

  test('removíveis apontam p/ uma peça "nenhum" existente na mesma categoria', () => {
    for (const [cat, noneId] of Object.entries(AVATAR_REMOVABLE_NONE)) {
      const info = AVATAR_PART_INFO[noneId]
      expect(info, `none de ${cat} (${noneId})`).toBeDefined()
      expect(info?.category as string | undefined).toBe(cat)
    }
  })

  test('paletas: hex minúsculo válido; cor default ∈ paleta (ou sem paleta → sem cor)', () => {
    for (const cat of AVATAR_CATEGORIES) {
      const palette = AVATAR_CATEGORY_PALETTES[cat]
      const def = DEFAULT_AVATAR_SLOTS[cat]
      if (palette) {
        for (const c of palette) expect(c).toMatch(/^#[0-9a-f]{6}$/)
        expect(
          Boolean(def.color && palette.includes(def.color)),
          `default de ${cat} ∈ paleta`,
        ).toBe(true)
      } else {
        expect(def.color, `categoria ${cat} sem paleta`).toBeUndefined()
      }
    }
  })
})
