import type { ExtensionToolboxCategory } from '#extensions'

const C = '#a78bfa'

export const gameThreeDBlocks = [
  {
    type: 'sz_g3d_create_scene',
    message0: 'Criar cena 3D no canvas %1 e guardar em %2',
    args0: [
      { type: 'field_input', name: 'CANVAS', text: 'tela' },
      { type: 'field_input', name: 'NAME', text: 'cena' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Cria cena + câmera + renderizador + luz, prontos para desenhar. Crie um <canvas> no HTML antes.',
  },
  {
    type: 'sz_g3d_set_background',
    message0: 'Cor de fundo da cena %1 como %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_colour', name: 'COLOR', colour: '#0b1020' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_set_camera',
    message0: 'Posicionar câmera da cena %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Move a câmera (ela sempre olha para o centro 0,0,0).',
  },
  {
    type: 'sz_g3d_create_box',
    message0: 'Criar cubo %1 na cena %2 tamanho %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'caixa' },
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_number', name: 'SIZE', value: 1, min: 0.1 },
      { type: 'field_colour', name: 'COLOR', colour: '#22d3ee' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_create_sphere',
    message0: 'Criar esfera %1 na cena %2 raio %3 cor %4',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'bola' },
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'field_number', name: 'RADIUS', value: 0.5, min: 0.1 },
      { type: 'field_colour', name: 'COLOR', colour: '#f59e0b' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_set_position',
    message0: 'Posição do objeto %1 em x %2 y %3 z %4',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
  },
  {
    type: 'sz_g3d_set_rotation',
    message0: 'Rotação do objeto %1 em x %2 y %3 z %4 (radianos)',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'caixa' },
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Gira o objeto. Anime dentro de "A cada frame 3D" usando uma variável que aumenta.',
  },
  {
    type: 'sz_g3d_animate',
    message0: 'A cada frame 3D da cena %1, fazer %2',
    args0: [
      { type: 'field_input', name: 'WORLD', text: 'cena' },
      { type: 'input_statement', name: 'BODY' },
    ],
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip:
      'Loop de animação 3D (setAnimationLoop): roda o "fazer" e redesenha a cena a cada quadro.',
  },
]

export const gameThreeDToolboxCategory: ExtensionToolboxCategory = {
  kind: 'category',
  name: 'Jogo 3D',
  colour: C,
  contents: gameThreeDBlocks.map((b) => ({ kind: 'block', type: b.type })),
}
