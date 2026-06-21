import { describe, expect, test } from 'bun:test'
// Apresentação (community-kids): rótulo/emoji/anim/URL do GLB. O kids NÃO depende do
// @sistemazero/members (package.json), e os catálogos do kids são PUROS (sem imports),
// então alcançamos por caminho relativo só nesta suíte.
import {
  AVATAR_CATEGORIES as KIDS_AVATAR_CATEGORIES,
  DEFAULT_AVATAR_SLOTS as KIDS_AVATAR_DEFAULTS,
  AVATAR_HIDE_GROUPS as KIDS_AVATAR_HIDE,
  AVATAR_PART_INFO as KIDS_AVATAR_INFO,
  AVATAR_CATEGORY_PALETTES as KIDS_AVATAR_PALETTES,
  AVATAR_REMOVABLE_NONE as KIDS_AVATAR_REMOVABLE,
} from '../../../community-kids/src/lib/avatar3d-catalog'
import { STREAK_FREEZE_PRICE as KIDS_STREAK_FREEZE_PRICE } from '../../../community-kids/src/lib/gamification-prices'
import {
  ROOM_WALL_PALETTE as KIDS_WALL_PALETTE,
  LIGHTING_PRESETS,
  ROOM_FLOOR_INFO,
  ROOM_ITEM_INFO,
  ROOM_THEME_INFO,
} from '../../../community-kids/src/lib/room-catalog'
// Autoridade (members): existência/preço/categoria/paleta/oclusão.
import {
  AVATAR3D_PARTS,
  AVATAR_CATEGORIES as MEMBERS_AVATAR_CATEGORIES,
  DEFAULT_AVATAR_SLOTS as MEMBERS_AVATAR_DEFAULTS,
  AVATAR_HIDE_GROUPS as MEMBERS_AVATAR_HIDE,
  AVATAR_CATEGORY_PALETTES as MEMBERS_AVATAR_PALETTES,
  AVATAR_REMOVABLE_NONE as MEMBERS_AVATAR_REMOVABLE,
} from '../../src/domain/avatar/avatar3d-catalog'
import { STREAK_FREEZE_PRICE } from '../../src/domain/gamification/coins'
import {
  ROOM_WALL_PALETTE as MEMBERS_WALL_PALETTE,
  ROOM_FLOORS,
  ROOM_ITEMS,
  ROOM_LIGHTINGS,
  ROOM_THEMES,
} from '../../src/domain/room/room-catalog'

/**
 * Os catálogos do kids (apresentação) são cópias PARALELAS dos do members (autoridade),
 * chaveadas pelo MESMO id. Drift silencioso = bug real:
 *  - quarto: w/h divergente → `canonicalizeRoomState` DESCARTA o item da grade na
 *    leitura/escrita = a criança perde a mobília sem erro;
 *  - avatar: peça vendida no members ausente no kids → cai no default = a criança paga
 *    Zappy e não vê mudança; paleta/oclusão divergente → preview ≠ render.
 * Esta suíte torna o invariante (prosa no CLAUDE.md) EXECUTÁVEL: drift → CI vermelho.
 */
describe('conformância de catálogo (kids apresentação × members autoridade)', () => {
  test('quarto: todo item do members existe no kids com o MESMO w×h', () => {
    for (const m of ROOM_ITEMS) {
      const kids = ROOM_ITEM_INFO[m.id]
      expect(kids, `item "${m.id}" ausente em ROOM_ITEM_INFO (kids)`).toBeDefined()
      expect(kids?.w, `w divergente em "${m.id}"`).toBe(m.w)
      expect(kids?.h, `h divergente em "${m.id}"`).toBe(m.h)
    }
  })

  test('quarto: todo tema do members existe no kids', () => {
    for (const t of ROOM_THEMES) {
      expect(
        ROOM_THEME_INFO[t.id],
        `tema "${t.id}" ausente em ROOM_THEME_INFO (kids)`,
      ).toBeDefined()
    }
  })

  test('quarto: todo piso do members existe no kids', () => {
    for (const f of ROOM_FLOORS) {
      expect(
        ROOM_FLOOR_INFO[f.id],
        `piso "${f.id}" ausente em ROOM_FLOOR_INFO (kids)`,
      ).toBeDefined()
    }
  })

  test('quarto: toda iluminação do members existe no kids', () => {
    for (const l of ROOM_LIGHTINGS) {
      expect(
        LIGHTING_PRESETS[l.id],
        `luz "${l.id}" ausente em LIGHTING_PRESETS (kids)`,
      ).toBeDefined()
    }
  })

  test('quarto: paleta de paredes kids = a do members (mesmo conjunto de cores)', () => {
    const kids = [...new Set(KIDS_WALL_PALETTE.map((c) => c.hex))].sort()
    const members = [...new Set(MEMBERS_WALL_PALETTE)].sort()
    expect(kids).toEqual(members)
  })

  test('avatar3d: toda peça do members existe no kids na MESMA categoria', () => {
    for (const part of AVATAR3D_PARTS) {
      const kids = KIDS_AVATAR_INFO[part.id]
      expect(kids, `peça "${part.id}" ausente em AVATAR_PART_INFO (kids)`).toBeDefined()
      expect(kids?.category, `categoria divergente em "${part.id}"`).toBe(part.category)
    }
  })

  test('avatar3d: categorias iguais em ordem', () => {
    expect([...KIDS_AVATAR_CATEGORIES]).toEqual([...MEMBERS_AVATAR_CATEGORIES])
  })

  test('avatar3d: defaults (asset + cor) iguais', () => {
    expect({ ...KIDS_AVATAR_DEFAULTS }).toEqual({ ...MEMBERS_AVATAR_DEFAULTS })
  })

  test('avatar3d: paletas por categoria iguais', () => {
    for (const cat of MEMBERS_AVATAR_CATEGORIES) {
      expect([...(KIDS_AVATAR_PALETTES[cat] ?? [])], `paleta de ${cat}`).toEqual([
        ...(MEMBERS_AVATAR_PALETTES[cat] ?? []),
      ])
    }
  })

  test('avatar3d: oclusão e removíveis iguais', () => {
    expect({ ...KIDS_AVATAR_HIDE }).toEqual({ ...MEMBERS_AVATAR_HIDE })
    expect({ ...KIDS_AVATAR_REMOVABLE }).toEqual({ ...MEMBERS_AVATAR_REMOVABLE })
  })

  test('preço do protetor de sequência: kids espelha o members', () => {
    expect(KIDS_STREAK_FREEZE_PRICE).toBe(STREAK_FREEZE_PRICE)
  })
})
