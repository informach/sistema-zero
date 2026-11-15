import {
  createMoradaHouse,
  MORADA_CATALOG,
  type MoradaCatalog,
  type MoradaHouse,
  reconcileMoradaHouse,
} from '@sistemazero/core/morada'
import { z } from 'zod'
import type { RoomState } from './room-catalog'

const LegacyRoomSchema = z.looseObject({
  theme: z.string(),
  placedItems: z.array(
    z.looseObject({ itemId: z.string(), x: z.number().finite(), y: z.number().finite() }),
  ),
  pet: z.string().nullable(),
})

export const PRESERVED_ROOM_TROPHIES = [
  'trofeu-primeiro-jogo',
  'trofeu-diploma',
  'trofeu-chama',
  'trofeu-medalha-mil',
  'trofeu-foguete',
  'trofeu-console',
  'trofeu-estrela-do-mural',
  'trofeu-oficina-completa',
] as const

/** Reset aprovado: preserva conquistas e espécie; arranjo antigo pode ser omitido. */
export function migrateLegacyRoom(
  raw: RoomState | null,
  owned: readonly string[],
  catalog: MoradaCatalog = MORADA_CATALOG,
): MoradaHouse {
  if (raw !== null) LegacyRoomSchema.parse(raw)
  const house = createMoradaHouse(catalog)
  const lighting = z
    .enum(['dia', 'tarde', 'noite', 'neon-rosa', 'neon-ciano', 'festa'])
    .safeParse(raw?.lighting)
  if (lighting.success && house.rooms[0]) house.rooms[0].lighting = lighting.data
  for (const instance of house.instances) {
    const color = instance.id.startsWith('parede-esq')
      ? raw?.wallColors?.left
      : instance.id.startsWith('parede-fundo')
        ? raw?.wallColors?.right
        : undefined
    if (color && /^#[\da-fA-F]{6}$/.test(color)) instance.materials = { face_a: { color } }
  }
  if (raw?.pet && owned.includes(raw.pet)) {
    const species = raw.pet === 'pet-gato' ? 'cat' : raw.pet === 'pet-cachorro' ? 'dog' : null
    if (species)
      house.pet =
        Object.values(catalog.pieces).find(
          (piece) => piece.kind === 'pet' && piece.species === species,
        )?.id ?? null
  }
  // O prêmio continua disponível mesmo quando não estava exposto no quarto antigo.
  house.instances.push(
    ...PRESERVED_ROOM_TROPHIES.filter(
      (id) => owned.includes(id) && catalog.pieces[`trophy/${id}`],
    ).map<MoradaHouse['instances'][number]>((id, index) => {
      const piece = catalog.pieces[`trophy/${id}`]!
      const wall = piece.mount === 'wall'
      return {
        id: `premio-${id}`,
        pieceId: piece.id,
        roomId: house.roomId,
        // A face de dentro da parede está a 7,5 cm da linha; não esconder metade do prêmio nela.
        position: [
          -3.5 + index,
          wall ? 1.5 : -piece.min[1],
          wall ? -3 + 0.075 - piece.min[2] + 0.01 : -2,
        ],
        rotation: 0,
      }
    }),
  )
  return reconcileMoradaHouse(house, catalog)
}
