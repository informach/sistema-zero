/** Valores compartilhados pela IR, pelo schema central e pelo runtime clássico. */
export const GAME_TWO_D_VECTOR_TILE_ROLES = ['decor', 'solid', 'platform', 'contact'] as const

export type GameTwoDVectorTileRole = (typeof GAME_TWO_D_VECTOR_TILE_ROLES)[number]

export const GAME_TWO_D_TILE_CONTACT_SIDES = ['head', 'feet', 'left', 'right', 'inside'] as const

export type GameTwoDTileContactSide = (typeof GAME_TWO_D_TILE_CONTACT_SIDES)[number]

export const GAME_TWO_D_TILE_CONTACT_FILTERS = ['any', ...GAME_TWO_D_TILE_CONTACT_SIDES] as const

export type GameTwoDTileContactFilter = (typeof GAME_TWO_D_TILE_CONTACT_FILTERS)[number]
