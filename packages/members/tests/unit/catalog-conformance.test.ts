import { describe, expect, test } from 'bun:test'
// Apresentação (community-kids): rótulo/emoji/anim/mapeamento DiceBear. O kids NÃO
// depende do @sistemazero/members (package.json), e ambos os catálogos do kids são
// PUROS (sem imports), então alcançamos por caminho relativo só nesta suíte.
import {
  AVATAR_PART_INFO,
  DEFAULT_AVATAR_PART_IDS as KIDS_AVATAR_DEFAULTS,
  AVATAR_LAYERS as KIDS_AVATAR_LAYERS,
} from '../../../community-kids/src/lib/avatar-catalog'
import { STREAK_FREEZE_PRICE as KIDS_STREAK_FREEZE_PRICE } from '../../../community-kids/src/lib/gamification-prices'
import { ROOM_ITEM_INFO, ROOM_THEME_INFO } from '../../../community-kids/src/lib/room-catalog'
// Autoridade (members): existência/preço/tamanho/camada.
import {
  AVATAR_PARTS,
  DEFAULT_AVATAR_PART_IDS as MEMBERS_AVATAR_DEFAULTS,
  AVATAR_LAYERS as MEMBERS_AVATAR_LAYERS,
} from '../../src/domain/avatar/parts-catalog'
import { STREAK_FREEZE_PRICE } from '../../src/domain/gamification/coins'
import { ROOM_ITEMS, ROOM_THEMES } from '../../src/domain/room/room-catalog'

/**
 * Os catálogos do kids (apresentação) são cópias PARALELAS dos do members (autoridade),
 * chaveadas pelo MESMO id. Drift silencioso = bug real:
 *  - quarto: w/h divergente → `canonicalizeRoomState` DESCARTA o item da grade na
 *    leitura/escrita = a criança perde a mobília sem erro;
 *  - avatar: peça vendida no members ausente no kids → cai no default = a criança paga
 *    Zappy e não vê mudança.
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

  test('avatar: toda peça do members existe no kids na MESMA camada', () => {
    for (const part of AVATAR_PARTS) {
      const kids = AVATAR_PART_INFO[part.id]
      expect(kids, `peça "${part.id}" ausente em AVATAR_PART_INFO (kids)`).toBeDefined()
      expect(kids?.layer, `camada divergente em "${part.id}"`).toBe(part.layer)
    }
  })

  test('avatar: AVATAR_LAYERS iguais em ordem + defaults iguais', () => {
    expect([...KIDS_AVATAR_LAYERS]).toEqual([...MEMBERS_AVATAR_LAYERS])
    expect(KIDS_AVATAR_DEFAULTS).toEqual({ ...MEMBERS_AVATAR_DEFAULTS })
  })

  test('preço do protetor de sequência: kids espelha o members', () => {
    expect(KIDS_STREAK_FREEZE_PRICE).toBe(STREAK_FREEZE_PRICE)
  })
})
