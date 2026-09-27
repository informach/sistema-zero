export const GAME_KIT_ACTIONS = [
  'esquerda',
  'direita',
  'cima',
  'baixo',
  'pular',
  'correr',
  'agir',
  'pausar',
  'confirmar',
  'voltar',
] as const

export type GameKitAction = (typeof GAME_KIT_ACTIONS)[number]

const gameKitActionSet = new Set<string>(GAME_KIT_ACTIONS)

export function isGameKitAction(value: unknown): value is GameKitAction {
  return typeof value === 'string' && gameKitActionSet.has(value)
}

export const GAME_KIT_CAMPAIGN_ENTITY_KINDS = [
  'hero',
  'coin',
  'gem',
  'walker',
  'flyer',
  'spiky',
  'shell',
  'movingPlatform',
  'checkpoint',
  'exit',
  'secretExit',
  'boss',
  'powerup',
  'portal',
  'sign',
] as const

export type GameKitCampaignEntityKind = (typeof GAME_KIT_CAMPAIGN_ENTITY_KINDS)[number]

export type GameKitInputDevice = 'teclado' | 'toque' | 'controle-1' | 'controle-2'

export const GAME_KIT_CAMPAIGN_EVENT_FIELDS = [
  'event',
  'id',
  'kind',
  'stageId',
  'reason',
  'target',
  'value',
  'complete',
  'journey',
  'column',
  'row',
] as const

export type GameKitCampaignEventField = (typeof GAME_KIT_CAMPAIGN_EVENT_FIELDS)[number]

const gameKitCampaignEventFieldSet = new Set<string>(GAME_KIT_CAMPAIGN_EVENT_FIELDS)

export function isGameKitCampaignEventField(value: unknown): value is GameKitCampaignEventField {
  return typeof value === 'string' && gameKitCampaignEventFieldSet.has(value)
}
