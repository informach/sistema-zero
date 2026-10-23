/** Paste the PROJECT asset ID from Materials. Pinta's library ID is a different identity. */
export type CharacterRole = 'player' | 'seeker' | 'drifter'
export type AnimationState = 'idle' | 'walk' | 'hurt' | 'death'
export interface CharacterBinding {
  assetId: string
  displayWidth: number
  displayHeight: number
  animations: Record<AnimationState, string>
  /** Fixed keeps the game's body when art changes. Sprite opts into the drawing's box. */
  collision: 'fixed' | 'sprite'
}
export const CHARACTER_ROLES = ['player', 'seeker', 'drifter'] as const
export const characters: Record<CharacterRole, CharacterBinding> = {
  player: {
    assetId: 'canvas-survival-player-v1',
    displayWidth: 52,
    displayHeight: 52,
    animations: { idle: 'idle', walk: 'walk', hurt: 'hurt', death: 'death' },
    collision: 'fixed',
  },
  seeker: {
    assetId: 'canvas-survival-seeker-v1',
    displayWidth: 46,
    displayHeight: 46,
    animations: { idle: 'idle', walk: 'walk', hurt: 'hurt', death: 'death' },
    collision: 'fixed',
  },
  drifter: {
    assetId: 'canvas-survival-drifter-v1',
    displayWidth: 46,
    displayHeight: 46,
    animations: { idle: 'idle', walk: 'walk', hurt: 'hurt', death: 'death' },
    collision: 'fixed',
  },
}
