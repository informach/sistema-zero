/** As abas e o estado visual continuam compartilhados pelas duas peles. */
export const ROOM_BUILDER_TABS = [
  'moveis',
  'enfeites',
  'trofeus',
  'plantas',
  'luzes',
  'piso',
  'parede',
  'clima',
  'bichinho',
  'tema',
] as const

export type RoomBuilderTab = (typeof ROOM_BUILDER_TABS)[number]

export type RoomLoadState = 'loading' | 'ready' | 'error'
