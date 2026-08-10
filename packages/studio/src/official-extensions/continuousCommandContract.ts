/**
 * Comandos que representam um passo de simulação contínua. O par bloco →
 * statement mantém o encaixe físico do Blockly alinhado à gramática da IR.
 */
export const CONTINUOUS_EXTENSION_COMMANDS = [
  // O cenário por quadro é contínuo por natureza: pintar UMA vez no início não
  // sobreviveria à primeira limpada da tela. O encaixe só no 🔁 é o que separa
  // este bloco do irmão fixo ("Pôr o cenário atrás de tudo"), que é start-only.
  { blockType: 'sz_g2d_draw_backdrop', statementType: 'g2d:drawBackdrop' },
  { blockType: 'sz_g2d_draw_prepared_tilemap', statementType: 'g2d:drawPreparedTileMap' },
  { blockType: 'sz_g2d_world_draw', statementType: 'g2d:drawWorld' },
  { blockType: 'sz_g2d_current_level_draw', statementType: 'g2d:drawCurrentLevel' },
  { blockType: 'sz_g2d_on_enemy_shot_hit', statementType: 'g2d:onEnemyShotHit' },
  { blockType: 'sz_g2d_on_enemy_beam_hit', statementType: 'g2d:onEnemyBeamHit' },
  { blockType: 'sz_g2d_on_group_overlap', statementType: 'g2d:onGroupOverlap' },
  { blockType: 'sz_g2d_on_sprite_group_overlap', statementType: 'g2d:onSpriteGroupOverlap' },
  { blockType: 'sz_gk_overlap_groups', statementType: 'gk:overlapGroups' },

  { blockType: 'sz_g3d_control_keys', statementType: 'g3d:controlWithKeys' },
  { blockType: 'sz_g3d_apply_gravity', statementType: 'g3d:applyGravity' },
  { blockType: 'sz_g3d_camera_follow', statementType: 'g3d:cameraFollow' },
  { blockType: 'sz_g3d_grid_step', statementType: 'g3d:gridStep' },
  { blockType: 'sz_g3d_move_across', statementType: 'g3d:moveAcross' },
  { blockType: 'sz_g3d_crosser_step', statementType: 'g3d:crosserStep' },
  { blockType: 'sz_g3d_move_traffic', statementType: 'g3d:moveTraffic' },
  { blockType: 'sz_g3d_move_in_circle', statementType: 'g3d:moveInCircle' },
  { blockType: 'sz_g3d_race_step', statementType: 'g3d:raceStep' },
  { blockType: 'sz_g3d_run_rivals', statementType: 'g3d:runRivals' },
  { blockType: 'sz_g3d_fall', statementType: 'g3d:fall' },
  { blockType: 'sz_g3d_slide_between', statementType: 'g3d:slideBetween' },
  { blockType: 'sz_g3d_spin', statementType: 'g3d:spin' },
  { blockType: 'sz_g3d_stack_step', statementType: 'g3d:stackStep' },
  { blockType: 'sz_g3d_move_by', statementType: 'g3d:moveBy' },
  { blockType: 'sz_g3d_rotate_by', statementType: 'g3d:rotateBy' },
  { blockType: 'sz_g3d_move_towards', statementType: 'g3d:moveTowards' },
  { blockType: 'sz_g3d_move_forward', statementType: 'g3d:moveForward' },
  { blockType: 'sz_g3d_step_body', statementType: 'g3d:stepBody' },
  { blockType: 'sz_g3d_platformer_controls', statementType: 'g3d:platformerControls' },
  { blockType: 'sz_g3d_fps_controls', statementType: 'g3d:fpsControls' },
] as const

export const CONTINUOUS_EXTENSION_STATEMENT_TYPES: ReadonlySet<string> = new Set(
  CONTINUOUS_EXTENSION_COMMANDS.map(({ statementType }) => statementType),
)
