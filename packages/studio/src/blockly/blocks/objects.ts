import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.objects

/**
 * Blocos de Objetos — modelo unificado em que o OBJETO é uma TOMADA de valor
 * (encaixa variável, "minha propriedade", outro objeto…), o que permite
 * aninhamento (ex.: `this.velocidade.x`):
 *  - `sz_val_object`: cria um objeto literal `{ chave: valor, ... }` (mutator +/−).
 *  - `sz_val_member_get`: lê uma propriedade de um valor (`<obj>.prop`).
 *  - `sz_js_member_set`: escreve uma propriedade de um valor (`<obj>.prop = v`).
 *  - `sz_val_method_on` / `sz_js_method_on`: chama um método de um valor
 *    (`<obj>.metodo(args)`), em forma de valor ou de comando.
 *
 * Os blocos antigos por NOME (`sz_val_get_prop`, `sz_js_set_prop`,
 * `sz_val_call_method`, `sz_js_call_method`) continuam registrados só para abrir
 * projetos salvos — ficam fora da paleta.
 */
export const OBJECT_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_val_object',
    message0: 'objeto',
    output: 'JSValue',
    colour: C,
    mutator: 'sz_object_mutator',
    tooltip: 'Cria um objeto com pares chave: valor. Use + para adicionar campos.',
  },
  {
    type: 'sz_val_member_get',
    message0: 'propriedade %1 de %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'x' },
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê uma propriedade de um objeto. Encaixe o objeto na tomada.',
  },
  {
    type: 'sz_js_member_set',
    message0: 'em %1 definir propriedade %2 = %3',
    args0: [
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
      { type: 'field_input', name: 'NAME', text: 'x' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve uma propriedade de um objeto.',
  },
  {
    type: 'sz_val_method_on',
    message0: 'de %1 chamar método %2',
    args0: [
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
      { type: 'field_input', name: 'METHOD', text: 'calcular' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método que devolve um valor para usar numa tomada.',
  },
  {
    type: 'sz_js_method_on',
    message0: 'de %1 chamar método %2',
    args0: [
      { type: 'input_value', name: 'OBJ', check: 'JSValue' },
      { type: 'field_input', name: 'METHOD', text: 'desenhar' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método de um objeto, como comando.',
  },
]
