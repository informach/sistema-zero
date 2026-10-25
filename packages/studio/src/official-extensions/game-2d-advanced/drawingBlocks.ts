import type { BlockDefinition } from '../../blockly/blocks/types'
import { GAME_KIT_COLOUR } from './blocks/shared'

function values(...names: string[]) {
  return names.map((name) => ({ type: 'input_value' as const, name, check: 'JSValue' }))
}

const common = {
  placement: {
    root: [],
    nested: ['draw-world', 'draw-hud', 'map-draw', 'function-body', 'derived-method-body'],
    forbiddenDirectNested: ['event-body', 'constructor-body'],
    role: 'command',
  } as const,
  previousStatement: 'JSStmt',
  nextStatement: 'JSStmt',
  inputsInline: true,
  colour: GAME_KIT_COLOUR,
}

export const gameKitDrawingBlocks: BlockDefinition[] = [
  {
    ...common,
    type: 'sz_gk_draw_rectangle',
    message0: 'Desenhar retângulo em x %1 y %2 largura %3 altura %4 cor %5',
    args0: values('X', 'Y', 'W', 'H', 'COLOR'),
    tooltip:
      'Desenha uma peça retangular da aparência ou do cenário. Use ao desenhar o jogo, a interface ou uma aparência.',
  },
  {
    ...common,
    type: 'sz_gk_draw_circle',
    message0: 'Desenhar círculo em x %1 y %2 raio %3 cor %4',
    args0: values('X', 'Y', 'R', 'COLOR'),
    tooltip:
      'Desenha uma peça redonda. x e y marcam o centro; o raio vai do centro à borda. Use no desenho do jogo ou de uma aparência.',
  },
  {
    ...common,
    type: 'sz_gk_draw_triangle',
    message0: 'Desenhar triângulo pelos pontos x %1 y %2, x %3 y %4, x %5 y %6 cor %7',
    args0: values('X1', 'Y1', 'X2', 'Y2', 'X3', 'Y3', 'COLOR'),
    tooltip:
      'Une três pontos e preenche o triângulo com a cor escolhida. Serve para peças da aparência, telhados e setas.',
  },
  {
    ...common,
    type: 'sz_gk_draw_text',
    message0: 'Escrever %1 em x %2 y %3 tamanho %4 cor %5',
    args0: values('TEXT', 'X', 'Y', 'SIZE', 'COLOR'),
    tooltip:
      'Escreve texto, números ou contas com a fonte do jogo. Use no desenho da interface para ficar acima do cenário; y marca a base do texto.',
  },
]

const number = (value: number) => ({ shadow: { type: 'sz_val_number', fields: { NUM: value } } })
const text = (value: string) => ({ shadow: { type: 'sz_val_text', fields: { TEXT: value } } })
const color = { shadow: { type: 'sz_val_color', fields: { COLOR: '#ffd166' } } }

export const GAME_KIT_DRAWING_SHADOWS = {
  sz_gk_draw_rectangle: {
    X: number(20),
    Y: number(20),
    W: number(80),
    H: number(40),
    COLOR: color,
  },
  sz_gk_draw_circle: { X: number(60), Y: number(60), R: number(20), COLOR: color },
  sz_gk_draw_triangle: {
    X1: number(40),
    Y1: number(0),
    X2: number(0),
    Y2: number(60),
    X3: number(80),
    Y3: number(60),
    COLOR: color,
  },
  sz_gk_draw_text: {
    TEXT: text('Olá!'),
    X: number(24),
    Y: number(32),
    SIZE: number(24),
    COLOR: color,
  },
}
