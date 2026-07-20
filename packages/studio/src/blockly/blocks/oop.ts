import { CATEGORY_COLORS } from '../theme'
import type { BlockDefinition } from './types'

const C = CATEGORY_COLORS.classes

/**
 * Blocos de Orientação a Objetos:
 *  - `sz_js_class`: define a classe (nome + `+` opcional para herança `extends`).
 *    Tem um "buraco" onde encaixam o construtor e os métodos.
 *  - `sz_js_constructor`: o construtor (palavra-chave fixa, não renomeável), com
 *    parâmetros (+/−) e corpo livre.
 *  - `sz_js_class_method`: um método, com parâmetros (+/−) e corpo livre.
 *  - `sz_js_return`: retorna um valor de dentro de um método.
 *  - `sz_js_new_var`: instancia (`const x = new Classe(args)`).
 *  - `sz_js_call_method` / `sz_val_call_method`: chama um método (comando/valor).
 *  - `sz_js_set_this_prop` / `sz_js_set_prop`: escreve uma propriedade.
 *  - `sz_val_this_prop` / `sz_val_get_prop`: lê uma propriedade.
 *  - `sz_val_arg`: relator de um parâmetro do construtor/método em edição.
 *
 * Herança usa `sz_extends_mutator`; parâmetros usam `sz_params_mutator`; os
 * argumentos de `new`/chamar-método usam `sz_args_mutator`.
 */
export const OOP_BLOCKS: BlockDefinition[] = [
  {
    type: 'sz_js_class',
    message0: 'Classe %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'Pessoa' }],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'MEMBERS', check: 'ClassMember' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_extends_mutator',
    tooltip:
      'Cria uma classe. Use + para herdar de outra classe. Encaixe um construtor e métodos dentro dela.',
  },
  {
    type: 'sz_js_constructor',
    message0: 'construtor',
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY', check: 'JSStmt' }],
    inputsInline: true,
    previousStatement: 'ClassMember',
    nextStatement: 'ClassMember',
    colour: C,
    mutator: 'sz_params_mutator',
    tooltip:
      'O construtor da classe (roda ao criar o objeto). Use + para adicionar parâmetros; dentro, defina propriedades ou faça o que quiser.',
  },
  {
    type: 'sz_js_class_method',
    message0: 'método %1 assíncrono %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'falar' },
      { type: 'field_checkbox', name: 'ASYNC', checked: false },
    ],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY', check: 'JSStmt' }],
    inputsInline: true,
    previousStatement: 'ClassMember',
    nextStatement: 'ClassMember',
    colour: C,
    mutator: 'sz_params_mutator',
    tooltip:
      'Um método da classe. Use + para adicionar parâmetros; "retornar" devolve um valor. Marque "assíncrono" só se usar "esperar…" (await) dentro.',
  },
  {
    type: 'sz_js_return',
    message0: 'retornar %1',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    placement: { root: [], nested: ['function-body'], role: 'command' },
    tooltip: 'Devolve um valor de dentro da função ou do método atual.',
  },
  {
    type: 'sz_js_return_void',
    message0: 'sair / parar aqui',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    placement: { root: [], nested: ['function-body'], role: 'command' },
    tooltip: 'Sai da função imediatamente, sem devolver valor.',
  },
  {
    type: 'sz_js_new_var',
    message0: 'criar %1 = novo %2',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'pessoa' },
      { type: 'field_name_picker', name: 'CLASS', text: 'Pessoa', kind: 'class' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um novo objeto da classe e guarda numa variável. Os espaços de valor se rotulam pela classe.',
  },
  {
    type: 'sz_js_call_method',
    hidden: true,
    message0: 'no objeto %1 chamar método %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'pessoa', kind: 'variable' },
      { type: 'field_name_picker', name: 'METHOD', text: 'falar', kind: 'method' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método de um objeto, como comando.',
  },
  {
    type: 'sz_js_super_ctor',
    message0: 'chamar o construtor da classe-mãe',
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    placement: { root: [], nested: ['derived-constructor-body'], role: 'command' },
    mutator: 'sz_args_mutator',
    tooltip:
      'Dentro de uma classe filha, prepara primeiro a parte herdada da classe-mãe. Use + para passar informações.',
  },
  {
    type: 'sz_js_super_method',
    message0: 'na classe-mãe chamar método %1',
    args0: [{ type: 'field_name_picker', name: 'METHOD', text: 'desenhar', kind: 'method' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    placement: { root: [], nested: ['derived-method-body'], role: 'command' },
    mutator: 'sz_args_mutator',
    tooltip: 'Chama a versão herdada de um método da classe-mãe. Use + para passar informações.',
  },
  {
    type: 'sz_val_call_method',
    hidden: true,
    message0: 'no objeto %1 chamar método %2',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'pessoa', kind: 'variable' },
      { type: 'field_name_picker', name: 'METHOD', text: 'calcular', kind: 'method' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método que devolve um valor para usar numa tomada.',
  },
  {
    type: 'sz_val_new',
    message0: 'novo objeto da classe %1',
    args0: [{ type: 'field_name_picker', name: 'CLASS', text: 'Pessoa', kind: 'class' }],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um objeto novo da classe para encaixar como valor, guardar em uma propriedade ou adicionar a uma lista.',
  },
  {
    type: 'sz_js_set_this_prop',
    message0: 'definir minha propriedade %1 = %2',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'nome', kind: 'property' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve uma propriedade do próprio objeto, dentro de um método.',
  },
  {
    type: 'sz_js_set_prop',
    hidden: true,
    message0: 'no objeto %1 definir propriedade %2 = %3',
    args0: [
      { type: 'field_name_picker', name: 'OBJ', text: 'pessoa', kind: 'variable' },
      { type: 'field_name_picker', name: 'NAME', text: 'nome', kind: 'property' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve a propriedade de um objeto.',
  },
  {
    type: 'sz_val_this_prop',
    message0: 'minha propriedade %1',
    args0: [{ type: 'field_name_picker', name: 'NAME', text: 'nome', kind: 'property' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê uma propriedade do próprio objeto, dentro de um método.',
  },
  {
    type: 'sz_val_get_prop',
    hidden: true,
    message0: 'propriedade %1 do objeto %2',
    args0: [
      { type: 'field_name_picker', name: 'NAME', text: 'nome', kind: 'property' },
      { type: 'field_name_picker', name: 'OBJ', text: 'pessoa', kind: 'variable' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê a propriedade de um objeto.',
  },
  {
    // Bloco-relator de parâmetro (estilo MakeCode): o valor de um parâmetro do
    // construtor/método. Gera o identificador puro. Populado pelo flyout dinâmico
    // escopado ao método/construtor em edição.
    type: 'sz_val_arg',
    message0: 'parâmetro %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'x' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'O valor de um parâmetro da função, do construtor ou do método atual.',
  },
]
