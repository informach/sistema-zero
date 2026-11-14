import { ITEM_DA_APARENCIA } from '@sistemazero/arquipelago-contracts'
import { ROOM_FLOORS, ROOM_ITEMS, ROOM_LIGHTINGS, ROOM_THEMES } from './room-catalog'

/** Direitos da Galeria permanecem, mesmo quando compartilham um id do quarto antigo. */
export function retiredRoomIds(): string[] {
  const gallery = new Set<string>(Object.values(ITEM_DA_APARENCIA))
  return [...ROOM_ITEMS, ...ROOM_FLOORS, ...ROOM_LIGHTINGS, ...ROOM_THEMES]
    .filter((item) => item.tier !== 'trophy' && !gallery.has(item.id))
    .map((item) => item.id)
}
export const RETIRED_ROOM_IDS: ReadonlySet<string> = new Set(retiredRoomIds())
