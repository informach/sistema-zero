/**
 * Comandos oficiais que criam ou configuram estado persistente e, por isso,
 * não podem rodar dentro de nenhum laço. O par bloco → statement mantém a
 * trava física do Blockly alinhada à validação de IR importada.
 */
export const GAME_KIT_PERSISTENT_COMMANDS = [
  { blockType: 'sz_gk_create_character', statementType: 'gk:createCharacter' },
  { blockType: 'sz_gk_tween_to', statementType: 'gk:tweenTo' },
  { blockType: 'sz_gk_fade_to', statementType: 'gk:fadeTo' },
  { blockType: 'sz_gk_tween_property', statementType: 'gk:tweenProperty' },
  { blockType: 'sz_gk_trail_on', statementType: 'gk:trailOn' },
  { blockType: 'sz_gk_lean_on_move', statementType: 'gk:leanOnMove' },
  { blockType: 'sz_gk_nave_wave_shooter', statementType: 'gk:naveWaveShooter' },
  { blockType: 'sz_gk_rpg_battle_stats', statementType: 'gk:rpgBattleStats' },
  { blockType: 'sz_gk_rpg_set_special', statementType: 'gk:rpgSetSpecial' },
  { blockType: 'sz_gk_rpg_add_ally', statementType: 'gk:rpgAddAlly' },
  { blockType: 'sz_gk_rpg_teach_move', statementType: 'gk:rpgTeachMove' },
  { blockType: 'sz_gk_rpg_teach_heal', statementType: 'gk:rpgTeachHeal' },
  { blockType: 'sz_gk_td_set_coins', statementType: 'gk:tdSetCoins' },
  { blockType: 'sz_gk_start_spawner', statementType: 'gk:startSpawner' },
] as const

export const GAME_KIT_3D_PERSISTENT_COMMANDS = [
  { blockType: 'sz_g3k_add_light', statementType: 'g3k:addLight' },
  { blockType: 'sz_g3k_set_ambient', statementType: 'g3k:setAmbient' },
  { blockType: 'sz_g3k_set_fog', statementType: 'g3k:setFog' },
  { blockType: 'sz_g3k_start_spawner', statementType: 'g3k:startSpawner' },
  { blockType: 'sz_g3k_start_timer', statementType: 'g3k:startTimer' },
] as const

export const GAME_2D_PERSISTENT_COMMANDS = [
  { blockType: 'sz_g2d_play_music', statementType: 'g2d:playMusic' },
] as const

export const WORLD_3D_PERSISTENT_COMMANDS = [
  { blockType: 'sz_w3d_ambience', statementType: 'w3d:ambience' },
  { blockType: 'sz_w3d_play_music', statementType: 'w3d:playMusic' },
] as const

export const PERSISTENT_EXTENSION_COMMANDS = [
  ...GAME_2D_PERSISTENT_COMMANDS,
  ...GAME_KIT_PERSISTENT_COMMANDS,
  ...GAME_KIT_3D_PERSISTENT_COMMANDS,
  ...WORLD_3D_PERSISTENT_COMMANDS,
] as const

export const PERSISTENT_EXTENSION_STATEMENT_TYPES: ReadonlySet<string> = new Set(
  PERSISTENT_EXTENSION_COMMANDS.map(({ statementType }) => statementType),
)
