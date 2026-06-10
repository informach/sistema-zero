import type { ExtensionToolboxCategory } from '#extensions'

const C = '#f472b6'

export const gameTwoDBlocks = [
  {
    type: 'sz_g2d_create_sprite',
    message0: 'Criar sprite %1 em x %2 y %3 largura %4 altura %5 cor %6',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'jogador' },
      { type: 'field_number', name: 'X', value: 100 },
      { type: 'field_number', name: 'Y', value: 100 },
      { type: 'field_number', name: 'W', value: 40, min: 1 },
      { type: 'field_number', name: 'H', value: 40, min: 1 },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_draw_sprite',
    message0: 'Desenhar sprite %1 no pincel %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_input', name: 'CTX', text: 'ctx' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_move_by_keys',
    message0: 'Mover sprite %1 com setas, velocidade %2',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'SPEED', value: 4, min: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_position',
    message0: 'Definir posição do sprite %1 para x %2 y %3',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'X', value: 0 },
      { type: 'field_number', name: 'Y', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_set_velocity',
    message0: 'Definir velocidade do sprite %1 para vx %2 vy %3',
    args0: [
      { type: 'field_input', name: 'SPRITE', text: 'jogador' },
      { type: 'field_number', name: 'VX', value: 0 },
      { type: 'field_number', name: 'VY', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_collides',
    message0: 'Guardar em %1 se sprite %2 colide com sprite %3',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bateu' },
      { type: 'field_input', name: 'A', text: 'jogador' },
      { type: 'field_input', name: 'B', text: 'inimigo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_score',
    message0: 'Criar pontuação %1 começando em %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'pontos' },
      { type: 'field_number', name: 'INITIAL', value: 0 },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_game_over',
    message0: 'Mostrar fim de jogo no pincel %1 com texto %2',
    args0: [
      { type: 'field_input', name: 'CTX', text: 'ctx' },
      { type: 'field_input', name: 'TEXT', text: 'Fim de jogo' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g2d_update_each_frame',
    message0: 'A cada frame do jogo, fazer %1',
    args0: [{ type: 'input_statement', name: 'BODY' }],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
]

export const gameTwoDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 2D',
  colour: C,
  contents: gameTwoDBlocks.map((b) => ({ kind: 'block', type: b.type })),
}
