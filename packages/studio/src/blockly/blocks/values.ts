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
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'x', kind: 'variable' }],
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
          ['verdadeiro', 'true'],
          ['falso', 'false'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Um valor lógico: verdadeiro ou falso.',
  },
  {
    type: 'sz_val_null',
    message0: 'nada',
    output: 'JSValue',
    colour: C,
    tooltip:
      'O valor "nada": a ausência de um objeto ou valor. Use quando uma variável ainda não aponta para nada (por exemplo, nenhum alvo). No modo código aparece como null.',
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
    tooltip: 'Compara dois valores e devolve verdadeiro ou falso.',
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
          ['e', '&&'],
          ['ou', '||'],
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
    type: 'sz_val_not',
    message0: 'não %1',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Inverte uma condição: verdadeiro vira falso e falso vira verdadeiro.',
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
    tooltip: 'Escolhe entre dois valores conforme uma condição.',
  },
  {
    type: 'sz_val_window_width',
    message0: 'largura da janela',
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura da área visível do navegador.',
  },
  {
    type: 'sz_val_window_height',
    message0: 'altura da janela',
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura da área visível do navegador.',
  },
  {
    type: 'sz_val_device_pixel_ratio',
    message0: 'densidade de pixels da tela',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quantos pixels reais cabem em 1 pixel de CSS (window.devicePixelRatio). Multiplique o tamanho do canvas por isto para um desenho nítido em telas Retina/2x.',
  },
  {
    type: 'sz_val_system_dark',
    message0: 'o sistema está no modo escuro?',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Verdadeiro se o aparelho/navegador está no tema escuro (prefers-color-scheme: dark). Use num "se" para escolher as cores.',
  },
  {
    type: 'sz_val_date_part',
    message0: 'agora: %1',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PART',
        options: [
          ['horas (0-23)', 'hours'],
          ['minutos (0-59)', 'minutes'],
          ['segundos (0-59)', 'seconds'],
          ['milissegundos (0-999)', 'ms'],
          ['dia do mês (1-31)', 'dayOfMonth'],
          ['mês (0-11)', 'month'],
          ['dia da semana (0-6)', 'weekday'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Pega uma parte da data ou hora atual. É útil para criar relógios e calendários.',
  },
  {
    type: 'sz_val_canvas_width',
    message0: 'largura do canvas %1',
    args0: [{ type: 'field_input', name: 'CTX', text: 'ctx' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A largura da tela de desenho ligada ao pincel.',
  },
  {
    type: 'sz_val_canvas_height',
    message0: 'altura do canvas %1',
    args0: [{ type: 'field_input', name: 'CTX', text: 'ctx' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'A altura da tela de desenho ligada ao pincel.',
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
    tooltip: 'Um número decimal sorteado de 0 (inclusive) até 1 (exclusivo).',
  },
  {
    type: 'sz_val_math_pi',
    message0: 'π (pi)',
    output: 'JSValue',
    colour: C,
    tooltip: 'A constante pi (≈ 3,14159), útil em círculos e ângulos.',
  },
  {
    type: 'sz_val_perf_now',
    message0: 'tempo agora (ms)',
    output: 'JSValue',
    colour: C,
    tooltip:
      'Quantos milissegundos se passaram desde que a página abriu (performance.now()). Guarde numa variável e, no quadro seguinte, subtraia para saber quanto tempo passou entre os quadros (delta), assim o jogo anda igual em telas rápidas e lentas.',
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
    tooltip: 'A posição (em pixels) do clique do mouse. Só funciona dentro de um bloco de clique.',
  },
  {
    type: 'sz_val_event_key',
    message0: '%1 do evento',
    args0: [
      {
        type: 'field_dropdown',
        name: 'PROP',
        options: [
          ['a tecla', 'key'],
          ['o código da tecla', 'code'],
        ],
      },
    ],
    output: 'JSValue',
    colour: C,
    tooltip:
      'A tecla do evento de teclado. "a tecla" = a letra/seta (ex.: "w", "ArrowUp"); "o código da tecla" = a posição física, independente do idioma (ex.: "KeyW", "Space"). Só funciona dentro de um bloco de evento de teclado.',
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
      'Um vetor com componentes x e y. Guarde numa variável e leia x/y com o bloco "propriedade … do objeto".',
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
    tooltip: 'Um vetor com componentes x, y e z.',
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
      'Cria uma lista de valores. Começa vazia; use os botões + e − para adicionar ou tirar itens. Pode ir numa variável ou em qualquer tomada de valor.',
  },
  {
    type: 'sz_val_array_length',
    message0: 'tamanho da lista %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'lista', kind: 'group' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Quantos itens a lista tem.',
  },
  {
    type: 'sz_val_array_map',
    message0: 'transformar lista %1 com cada %2 virando %3',
    args0: [
      { type: 'field_name_picker', name: 'ARR', text: 'lista', kind: 'group' },
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'input_value', name: 'TRANSFORM', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Cria uma nova lista transformando cada item. Use o valor da variável do item na transformação.',
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
      'Junta vários pedaços (texto fixo e valores) num só texto. Use + para adicionar pedaços.',
  },
  {
    type: 'sz_val_array_index',
    message0: 'item %1 da lista %2',
    args0: [
      { type: 'input_value', name: 'INDEX', check: 'JSValue' },
      { type: 'field_name_picker', name: 'NAME', text: 'lista', kind: 'group' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Pega um item da lista pela posição. A primeira posição é 0.',
  },
  {
    type: 'sz_val_array_last',
    message0: 'último item da lista %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'lista', kind: 'group' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'O último item da lista (o mesmo que o item na posição tamanho − 1).',
  },
  {
    type: 'sz_val_array_find',
    message0: 'na lista %1 achar o 1º %2 em que %3',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'lista', kind: 'group' },
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'input_value', name: 'COND', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Procura e devolve o primeiro item que passa no teste. Se nenhum passar, o resultado fica vazio.',
  },
  {
    type: 'sz_val_array_filter',
    message0: 'filtrar a lista %1 mantendo cada %2 em que %3',
    args0: [
      { type: 'input_value', name: 'ARRAY', check: 'JSValue' },
      { type: 'field_input', name: 'ITEM', text: 'item' },
      { type: 'input_value', name: 'COND', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip:
      'Cria uma nova lista somente com os itens que passam no teste. Use a variável do item para testar cada um.',
  },
  {
    // Espaços ITEM0.. via `sz_array_mutator`: cada um é uma lista a juntar.
    type: 'sz_val_concat_arrays',
    message0: 'juntar listas',
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_array_mutator',
    tooltip: 'Cria uma nova lista juntando outras listas.',
  },
  {
    type: 'sz_val_shuffle',
    message0: 'embaralhar a lista %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'lista', kind: 'group' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Devolve a lista com os itens em ordem aleatória.',
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
    tooltip: 'Lê um dado guardado num elemento.',
  },
  {
    type: 'sz_val_storage_get',
    message0: 'ler de %1 a chave %2',
    args0: [
      {
        type: 'field_dropdown',
        name: 'STORE',
        options: [
          ['permanente (fica entre visitas)', 'local'],
          ['só nesta sessão (zera ao fechar)', 'session'],
        ],
      },
      { type: 'field_input', name: 'KEY', text: 'nome' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê um valor salvo no navegador. Devolve texto ou nulo.',
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
          ['atual', 'this'],
        ],
      },
      { type: 'field_input', name: 'TARGET', text: 'elemento' },
      { type: 'field_input', name: 'CLASS', text: 'ativo' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Verdadeiro se o elemento tem a classe.',
  },
  {
    type: 'sz_val_this',
    message0: 'elemento atual',
    output: 'JSValue',
    colour: C,
    tooltip: 'O elemento que disparou o evento atual. Use dentro de uma função ligada a um evento.',
  },
]
