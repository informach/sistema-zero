import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.functions

/**
 * Blocos de Funções nomeadas (estilo "procedimentos"):
 *  - `sz_js_function`: declara `function nome(params) { ... }`. Parâmetros via
 *    `sz_params_mutator` (+/−), corpo livre no input `BODY`. O `sz_js_return`
 *    (categoria Classes/Funções) devolve um valor de dentro dela.
 *  - `sz_js_call_function`: chama a função como comando (`nome(args);`).
 *  - `sz_val_call_function`: chama a função como valor (`nome(args)`).
 *
 * As chamadas usam `sz_args_mutator`: quando há uma `sz_js_function` de mesmo
 * nome no workspace, os espaços ganham os rótulos dos parâmetros (modo AUTO);
 * senão caem nos botões +/− (modo MANUAL). Os relatores `sz_val_arg` dos
 * parâmetros aparecem no flyout dinâmico da categoria "Funções".
 */
export const FUNCTION_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_js_function',
    message0: 'função %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'fazerAlgo' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY', check: 'JSStmt' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_params_mutator',
    tooltip:
      'Cria uma função nomeada. Use + para adicionar parâmetros; dentro, faça o que quiser e use "retornar" para devolver um valor.',
  },
  {
    type: 'sz_js_call_function',
    message0: 'chamar função %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'fazerAlgo', kind: 'function' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Executa uma função já criada, como comando.',
  },
  {
    type: 'sz_val_call_function',
    message0: 'resultado da função %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'calcular', kind: 'function' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Usa o valor que uma função devolve numa tomada de valor.',
  },
]
