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
      'Cria uma classe. Use + para herdar de outra classe (extends). Encaixe um construtor e métodos dentro dela.',
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
    message0: 'método %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'falar' }],
    message1: 'fazer %1',
    args1: [{ type: 'input_statement', name: 'BODY', check: 'JSStmt' }],
    inputsInline: true,
    previousStatement: 'ClassMember',
    nextStatement: 'ClassMember',
    colour: C,
    mutator: 'sz_params_mutator',
    tooltip: 'Um método da classe. Use + para adicionar parâmetros; "retornar" devolve um valor.',
  },
  {
    type: 'sz_js_return',
    message0: 'retornar %1',
    args0: [{ type: 'input_value', name: 'VALUE', check: 'JSValue' }],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Devolve um valor de dentro de um método (return).',
  },
  {
    type: 'sz_js_return_void',
    message0: 'sair / parar aqui (return)',
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Sai da função imediatamente, sem devolver valor (return;).',
  },
  {
    type: 'sz_js_new_var',
    message0: 'criar %1 = novo %2',
    args0: [
      { type: 'field_input', name: 'VARNAME', text: 'pessoa' },
      { type: 'field_input', name: 'CLASS', text: 'Pessoa' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip:
      'Cria um novo objeto da classe e guarda numa variável (const x = new Classe(...)). Os espaços de valor se rotulam pela classe.',
  },
  {
    type: 'sz_js_call_method',
    message0: 'no objeto %1 chamar método %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'pessoa' },
      { type: 'field_input', name: 'METHOD', text: 'falar' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método de um objeto, como comando (objeto.metodo(...)).',
  },
  {
    type: 'sz_val_call_method',
    message0: 'no objeto %1 chamar método %2',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'pessoa' },
      { type: 'field_input', name: 'METHOD', text: 'calcular' },
    ],
    inputsInline: true,
    output: 'JSValue',
    colour: C,
    mutator: 'sz_args_mutator',
    tooltip: 'Chama um método que devolve um valor (objeto.metodo(...)) para usar numa tomada.',
  },
  {
    type: 'sz_js_set_this_prop',
    message0: 'definir minha propriedade %1 = %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'nome' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve uma propriedade do próprio objeto, dentro de um método (this.nome = valor).',
  },
  {
    type: 'sz_js_set_prop',
    message0: 'no objeto %1 definir propriedade %2 = %3',
    args0: [
      { type: 'field_input', name: 'OBJ', text: 'pessoa' },
      { type: 'field_input', name: 'NAME', text: 'nome' },
      { type: 'input_value', name: 'VALUE', check: 'JSValue' },
    ],
    inputsInline: true,
    previousStatement: 'JSStmt',
    nextStatement: 'JSStmt',
    colour: C,
    tooltip: 'Escreve a propriedade de um objeto (objeto.nome = valor).',
  },
  {
    type: 'sz_val_this_prop',
    message0: 'minha propriedade %1',
    args0: [{ type: 'field_input', name: 'NAME', text: 'nome' }],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê uma propriedade do próprio objeto, dentro de um método (this.nome).',
  },
  {
    type: 'sz_val_get_prop',
    message0: 'propriedade %1 do objeto %2',
    args0: [
      { type: 'field_input', name: 'NAME', text: 'nome' },
      { type: 'field_input', name: 'OBJ', text: 'pessoa' },
    ],
    output: 'JSValue',
    colour: C,
    tooltip: 'Lê a propriedade de um objeto (objeto.nome).',
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
    tooltip: 'O valor de um parâmetro do construtor ou método atual.',
  },
]
