import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.math

/**
 * Blocos de MATEMÁTICA (com `output: 'JSValue'`). Encaixam em qualquer tomada de
 * valor (`input_value` com `check: 'JSValue'`) — constante, variável, sockets de
 * canvas/OOP, etc. As próprias tomadas (A/B/VALUE) recebem por padrão um shadow
 * `sz_val_number` (ver `valueSockets.ts`), preservando a UX de digitar inline.
 */
export const MATH_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_math_arithmetic',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'A', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['+', '+'],
          ['−', '-'],
          ['×', '*'],
          ['÷', '/'],
          ['resto (%)', '%'],
          ['potência (^)', '**'],
        ],
      },
      { type: 'input_value', name: 'B', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Faz uma conta entre dois valores (somar, subtrair, multiplicar, dividir, resto, potência).',
  },
  {
    type: 'sz_math_function',
    message0: '%1 de %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'FN',
        options: [
          ['arredondar', 'round'],
          ['piso (arredondar p/ baixo)', 'floor'],
          ['teto (arredondar p/ cima)', 'ceil'],
          ['valor absoluto', 'abs'],
          ['raiz quadrada', 'sqrt'],
          ['sinal (-1, 0, 1)', 'sign'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Aplica uma função matemática a um valor (arredondar, raiz, valor absoluto, etc.).',
  },
  {
    type: 'sz_math_minmax',
    message0: '%1 entre %2 e %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'FN',
        options: [
          ['menor valor', 'min'],
          ['maior valor', 'max'],
        ],
      },
      { type: 'input_value', name: 'A', check: 'JSValue' },
      { type: 'input_value', name: 'B', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'O menor ou o maior valor entre dois.',
  },
  {
    type: 'sz_math_trig',
    message0: '%1 de %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'FN',
        options: [
          ['seno', 'sin'],
          ['cosseno', 'cos'],
          ['tangente', 'tan'],
          ['arco-seno', 'asin'],
          ['arco-cosseno', 'acos'],
          ['arco-tangente', 'atan'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Funções de trigonometria (seno, cosseno, tangente, etc.). O ângulo é em radianos. Use "converter graus → radianos" se precisar.',
  },
  {
    type: 'sz_math_atan2',
    message0: 'ângulo de y %1 x %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'JSValue' },
      { type: 'input_value', name: 'B', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'O ângulo (em radianos) da direção até o ponto (x, y). Muito usado para mira/direção em jogos.',
  },
  {
    type: 'sz_val_distance',
    message0: 'distância entre %1 e %2',
    args0: [
      { type: 'input_value', name: 'OBJ1', check: 'JSValue' },
      { type: 'input_value', name: 'OBJ2', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'A distância entre dois objetos que têm posição (x e y), como o jogador e um inimigo.',
  },
  {
    type: 'sz_math_hypot',
    message0: 'distância (hipotenusa) de %1 e %2',
    args0: [
      { type: 'input_value', name: 'A', check: 'JSValue' },
      { type: 'input_value', name: 'B', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'A hipotenusa √(a² + b²). Para a distância entre dois pontos, use as diferenças dos x e dos y.',
  },
  {
    type: 'sz_math_angle_convert',
    message0: 'converter %1 %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'DIR',
        options: [
          ['graus → radianos', 'degToRad'],
          ['radianos → graus', 'radToDeg'],
        ],
      },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Converte um ângulo entre graus e radianos.',
  },
]
