import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.values

/**
 * Blocos de VALOR (com `output: 'JSValue'`). Encaixam no lugar de um valor
 * numérico/textual de outro bloco (slots `input_value` com `check: 'JSValue'`).
 *
 * `sz_val_number` é o bloco-sombra (shadow) padrão dos slots: preserva a UX de
 * "digitar um número inline", mas pode ser substituído por qualquer helper
 * (largura da janela, aleatório, variável, etc.).
 */
export const VALUE_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_val_number',
    message0: '%1',
    args0: [{ type: 'field_number', name: 'NUM', value: 0 }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Um valor numérico.',
  },
  {
    type: 'sz_val_text',
    message0: 'texto %1',
    args0: [{ type: 'field_input', name: 'TEXT', text: 'Olá' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Um valor de texto.',
  },
  {
    type: 'sz_val_color',
    message0: 'cor %1',
    args0: [{ type: 'field_colour_sz', name: 'COLOR', colour: '#22d3ee' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Uma cor. Use no lugar de valores que aceitam cor (ex.: cor do pincel).',
  },
  {
    type: 'sz_val_color_alpha',
    message0: 'cor %1 transparência %2 %',
    args0: [
      { type: 'field_colour_sz', name: 'COLOR', colour: '#000000' },
      { type: 'field_number', name: 'ALPHA', value: 10, min: 0, max: 100, precision: 1 },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Uma cor com transparência (0% = invisível, 100% = sólida). Ótima para rastros e desvanecer.',
  },
  {
    type: 'sz_val_variable',
    message0: 'valor da variável %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Usa o conteúdo de uma variável já criada como valor.',
  },
  {
    type: 'sz_val_bool',
    message0: '%1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'VALUE',
        options: [
          ['verdadeiro (true)', 'true'],
          ['falso (false)', 'false'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Um valor lógico: verdadeiro ou falso (true/false).',
  },
  {
    type: 'sz_val_compare',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'LEFT', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['=', '==='],
          ['≠', '!=='],
          ['= (solto)', '=='],
          ['≠ (solto)', '!='],
          ['>', '>'],
          ['<', '<'],
          ['≥', '>='],
          ['≤', '<='],
        ],
      },
      { type: 'input_value', name: 'RIGHT', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Compara dois valores e devolve verdadeiro ou falso (ex.: a === b).',
  },
  {
    type: 'sz_val_logic',
    message0: '%1 %2 %3',
    args0: [
      { type: 'input_value', name: 'LEFT', check: 'JSValue' },
      {
        type: 'field_dropdown',
        name: 'OP',
        options: [
          ['e (&&)', '&&'],
          ['ou (||)', '||'],
        ],
      },
      { type: 'input_value', name: 'RIGHT', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Combina duas condições: "e" (ambas) ou "ou" (qualquer uma).',
  },
  {
    type: 'sz_val_ternary',
    message0: 'se %1 então %2 senão %3',
    args0: [
      { type: 'input_value', name: 'COND', check: 'JSValue' },
      { type: 'input_value', name: 'TRUE_VAL', check: 'JSValue' },
      { type: 'input_value', name: 'FALSE_VAL', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Escolhe entre dois valores conforme uma condição (operador ternário: condição ? valor se verdadeiro : valor se falso).',
  },
  {
    type: 'sz_val_window_width',
    message0: 'largura da janela',
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura da área visível do navegador (window.innerWidth).',
  },
  {
    type: 'sz_val_window_height',
    message0: 'altura da janela',
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura da área visível do navegador (window.innerHeight).',
  },
  {
    type: 'sz_val_canvas_width',
    message0: 'largura do canvas %1',
    args0: [{ type: 'field_input', name: 'CTX', text: 'ctx' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura do canvas associado ao pincel/contexto (canvas.width).',
  },
  {
    type: 'sz_val_canvas_height',
    message0: 'altura do canvas %1',
    args0: [{ type: 'field_input', name: 'CTX', text: 'ctx' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura do canvas associado ao pincel/contexto (canvas.height).',
  },
  {
    type: 'sz_val_random',
    message0: 'número aleatório de %1 até %2',
    args0: [
      { type: 'input_value', name: 'MIN', check: 'JSValue' },
      { type: 'input_value', name: 'MAX', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Um número inteiro sorteado entre os dois valores (inclusive).',
  },
  {
    type: 'sz_val_color_hsl',
    message0: 'cor HSL matiz %1 saturação %2 % luminosidade %3 %',
    args0: [
      { type: 'input_value', name: 'H', check: 'JSValue' },
      { type: 'input_value', name: 'S', check: 'JSValue' },
      { type: 'input_value', name: 'L', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Uma cor no formato HSL. Matiz (0–360), saturação e luminosidade (0–100%). Cada valor pode ser número, variável ou cálculo (ex.: matiz aleatório).',
  },
  {
    type: 'sz_val_random_float',
    message0: 'número aleatório (0 a 1)',
    output: 'JSValue',
    colour: C,
    tooltip: 'Um número decimal sorteado de 0 (inclusive) até 1 (exclusivo) — Math.random().',
  },
  {
    type: 'sz_val_math_pi',
    message0: 'π (pi)',
    output: 'JSValue',
    colour: C,
    tooltip: 'A constante pi (Math.PI ≈ 3,14159), útil em círculos e ângulos.',
  },
  {
    type: 'sz_val_event_pos',
    message0: 'posição do clique %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'AXIS',
        options: [
          ['X (horizontal)', 'clientX'],
          ['Y (vertical)', 'clientY'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A posição (em pixels) do clique do mouse. Só funciona dentro de um bloco de clique (event.clientX / event.clientY).',
  },
  {
    type: 'sz_val_vector2d',
    message0: 'vetor 2D x %1 y %2',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Um vetor com componentes x e y (objeto { x, y }). Guarde numa variável e leia x/y com o bloco "propriedade … do objeto".',
  },
  {
    type: 'sz_val_vector3d',
    message0: 'vetor 3D x %1 y %2 z %3',
    args0: [
      { type: 'input_value', name: 'X', check: 'JSValue' },
      { type: 'input_value', name: 'Y', check: 'JSValue' },
      { type: 'input_value', name: 'Z', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Um vetor com componentes x, y e z (objeto { x, y, z }).',
  },
  {
    // Os espaços de valor (ITEM0, ITEM1, …) e os botões +/− são criados pelo
    // mutator `sz_array_mutator` (começa vazia).
    type: 'sz_val_array',
    message0: 'lista',
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_array_mutator',
    tooltip:
      'Cria uma lista (array) de valores. Começa vazia; use os botões + e − para adicionar ou tirar itens. Pode ir numa variável ou em qualquer tomada de valor.',
  },
  {
    type: 'sz_val_array_length',
    message0: 'tamanho da lista %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'lista' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos itens a lista tem (arr.length).',
  },
  {
    // Os espaços (ITEM0, ITEM1, …) e os botões +/− vêm do `sz_array_mutator`.
    type: 'sz_val_join',
    message0: 'juntar texto',
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_array_mutator',
    tooltip:
      'Junta vários pedaços (texto fixo e valores) num só texto. Use + para adicionar pedaços. Vira um template literal de texto.',
  },
  {
    type: 'sz_val_array_index',
    message0: 'item %1 da lista %2',
    args0: [
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
      { type: 'field_input', name: 'NAME', text: 'lista' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Pega um item da lista pela posição (arr[i]). A primeira posição é 0.',
  },
  {
    // Espaços ITEM0.. via `sz_array_mutator`: cada um é uma lista a juntar.
    type: 'sz_val_concat_arrays',
    message0: 'juntar listas',
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_array_mutator',
    tooltip: 'Cria uma nova lista juntando outras listas ([...a, ...b]).',
  },
  {
    type: 'sz_val_shuffle',
    message0: 'embaralhar a lista %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'lista' }],
    output: 'JSValue',
    colour: C,
    tooltip:
      'Devolve a lista com os itens em ordem aleatória (arr.sort(() => Math.random() - 0.5)).',
  },
  {
    type: 'sz_val_dataset',
    message0: 'dado %1 da variável %2',
    args0: [
      { type: 'field_input', name: 'KEY', text: 'chave' },
      { type: 'field_input', name: 'OBJ', text: 'elemento' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê um data-attribute guardado num elemento (el.dataset.chave).',
  },
  {
    type: 'sz_val_storage_get',
    message0: 'ler de %1 a chave %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STORE',
        options: [
          ['localStorage', 'local'],
          ['sessionStorage', 'session'],
        ],
      },
      { type: 'field_input', name: 'KEY', text: 'nome' },
    ],
    output: 'JSValue',
    colour: C,
    level: 'intermediario',
    tooltip: 'Lê um valor salvo no navegador (localStorage.getItem). Devolve texto ou nulo.',
  },
  {
    type: 'sz_val_class_contains',
    message0: 'o elemento %1 %2 tem a classe %3',
    args0: [
      {
        type: 'field_dropdown',
        name: 'TARGET_KIND',
        options: [
          ['id', 'id'],
          ['variável', 'var'],
          ['atual (this)', 'this'],
        ],
      },
      { type: 'field_input', name: 'TARGET', text: 'elemento' },
      { type: 'field_input', name: 'CLASS', text: 'ativo' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o elemento tem a classe (el.classList.contains).',
  },
  {
    type: 'sz_val_this',
    message0: 'elemento atual (this)',
    output: 'JSValue',
    colour: C,
    tooltip:
      'O elemento que disparou o evento atual (this). Use dentro de uma função usada como listener.',
  },
]
