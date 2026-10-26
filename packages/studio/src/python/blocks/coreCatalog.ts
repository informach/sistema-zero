import type { PythonNode } from '../language/types'
import { requiredField, requiredInput } from './catalogHelpers'
import type { PythonBlockCodec, PythonBlockShape, PythonCategory } from './contract'
import {
  boolean,
  contextOf,
  integer,
  isNode,
  name,
  node,
  none,
  pass,
  text,
  withTargetContext,
} from './nodes'

const base = (
  id: string,
  title: string,
  category: PythonCategory,
  level: 1 | 2 | 3,
  api: string,
  help: string,
) => ({ id: `sz_py_${id}`, owner: 'programming' as const, title, category, level, api, help })
const emptyShape = (): PythonBlockShape => ({ fields: [], inputs: [] })
const exactFields = (value: PythonNode, fields: string[]) =>
  Object.keys(value.fields).length === fields.length &&
  fields.every((key) => Object.hasOwn(value.fields, key))

const literals: PythonBlockCodec[] = [
  {
    ...base(
      'text',
      'texto',
      'Textos',
      1,
      'str',
      'Um texto Python. Pode conter acentos, emojis e quebras de linha.',
    ),
    role: 'value',
    compact: 'quoted',
    defaultNode: () => text('Olá!'),
    decode(value) {
      return value.kind === 'Constant' &&
        value.fields.kind === null &&
        typeof value.fields.value === 'string'
        ? { fields: [{ name: 'TEXT', label: 'texto', value: value.fields.value }], inputs: [] }
        : undefined
    },
    encode(shape) {
      return text(requiredField(shape, 'TEXT'))
    },
  },
  {
    ...base(
      'integer',
      'número inteiro',
      'Números e matemática',
      1,
      'int',
      'Um número inteiro, sem perder precisão em valores grandes.',
    ),
    role: 'value',
    compact: 'plain',
    defaultNode: integer,
    decode(value) {
      const literal = value.fields.value
      return value.kind === 'Constant' &&
        value.fields.kind === null &&
        literal &&
        typeof literal === 'object' &&
        !Array.isArray(literal) &&
        'literal' in literal &&
        literal.literal === 'int'
        ? { fields: [{ name: 'NUMBER', label: 'número', value: literal.value }], inputs: [] }
        : undefined
    },
    encode(shape) {
      const value = requiredField(shape, 'NUMBER')
      if (!/^(0|[1-9][0-9]*)$/.test(value))
        throw new Error(
          'Digite um número inteiro positivo ou zero. Para negativo, use o bloco de sinal.',
        )
      return integer(value)
    },
  },
  {
    ...base(
      'boolean',
      'verdadeiro ou falso',
      'Lógica e decisões',
      1,
      'True / False',
      'Os dois valores lógicos do Python.',
    ),
    role: 'value',
    defaultNode: boolean,
    decode(value) {
      return value.kind === 'Constant' &&
        value.fields.kind === null &&
        typeof value.fields.value === 'boolean'
        ? {
            fields: [
              {
                name: 'BOOL',
                label: '',
                value: value.fields.value ? 'True' : 'False',
                options: [
                  ['verdadeiro', 'True'],
                  ['falso', 'False'],
                ],
              },
            ],
            inputs: [],
          }
        : undefined
    },
    encode(shape) {
      const value = requiredField(shape, 'BOOL')
      if (!['True', 'False'].includes(value)) throw new Error('Valor lógico inválido.')
      return boolean(value === 'True')
    },
  },
  {
    ...base(
      'none',
      'nenhum valor',
      'Variáveis',
      1,
      'None',
      'None representa a ausência de um valor.',
    ),
    role: 'value',
    defaultNode: none,
    decode(value) {
      return value.kind === 'Constant' && value.fields.kind === null && value.fields.value === null
        ? emptyShape()
        : undefined
    },
    encode: none,
  },
  {
    ...base('variable', 'variável', 'Variáveis', 1, 'name', 'Lê uma variável no escopo atual.'),
    role: 'value',
    compact: 'plain',
    defaultNode: name,
    decode(value) {
      return value.kind === 'Name' &&
        typeof value.fields.id === 'string' &&
        ['Load', 'Store', 'Del'].includes(contextOf(value) ?? '')
        ? {
            fields: [{ name: 'NAME', label: '', value: value.fields.id }],
            inputs: [],
            extra: { context: contextOf(value)! },
          }
        : undefined
    },
    encode(shape) {
      const context = shape.extra?.context ?? 'Load'
      if (!['Load', 'Store', 'Del'].includes(String(context)))
        throw new Error('Escopo de variável inválido.')
      return name(requiredField(shape, 'NAME'), context as 'Load' | 'Store' | 'Del')
    },
  },
]

const binaryOptions = [
  ['+', 'Add'],
  ['−', 'Sub'],
  ['×', 'Mult'],
  ['÷', 'Div'],
  ['divisão inteira', 'FloorDiv'],
  ['resto', 'Mod'],
  ['potência', 'Pow'],
] as const
const operators: PythonBlockCodec[] = [
  {
    ...base(
      'arithmetic',
      'calcular',
      'Números e matemática',
      1,
      '+ - * / // % **',
      'A divisão / produz decimal. // faz divisão inteira; ** calcula uma potência.',
    ),
    role: 'value',
    defaultNode: () => node('BinOp', { left: integer('1'), op: node('Add'), right: integer('2') }),
    decode(value) {
      const { left, right, op } = value.fields
      return value.kind === 'BinOp' &&
        isNode(left) &&
        isNode(right) &&
        isNode(op) &&
        binaryOptions.some(([, kind]) => kind === op.kind)
        ? {
            fields: [{ name: 'OP', label: 'operação', value: op.kind, options: binaryOptions }],
            inputs: [
              { name: 'LEFT', label: 'primeiro', role: 'value', nodes: [left] },
              { name: 'RIGHT', label: 'segundo', role: 'value', nodes: [right] },
            ],
          }
        : undefined
    },
    encode(shape) {
      const op = requiredField(shape, 'OP')
      if (!binaryOptions.some(([, kind]) => kind === op)) throw new Error('Operação inválida.')
      return node('BinOp', {
        left: requiredInput(shape, 'LEFT'),
        op: node(op),
        right: requiredInput(shape, 'RIGHT'),
      })
    },
  },
  ...(['Not', 'USub', 'UAdd'] as const).map(
    (op): PythonBlockCodec => ({
      ...base(
        op === 'Not' ? 'not' : op === 'USub' ? 'negative' : 'positive',
        op === 'Not' ? 'não' : op === 'USub' ? 'negativo de' : 'positivo de',
        op === 'Not' ? 'Lógica e decisões' : 'Números e matemática',
        1,
        op === 'Not' ? 'not' : op === 'USub' ? '-' : '+',
        'Aplica a operação ao valor conectado.',
      ),
      role: 'value',
      defaultNode: () =>
        node('UnaryOp', { op: node(op), operand: op === 'Not' ? boolean() : integer('1') }),
      decode(value) {
        return value.kind === 'UnaryOp' &&
          isNode(value.fields.op) &&
          value.fields.op.kind === op &&
          isNode(value.fields.operand)
          ? {
              fields: [],
              inputs: [
                { name: 'VALUE', label: 'valor', role: 'value', nodes: [value.fields.operand] },
              ],
            }
          : undefined
      },
      encode(shape) {
        return node('UnaryOp', { op: node(op), operand: requiredInput(shape, 'VALUE') })
      },
    }),
  ),
]

const statements: PythonBlockCodec[] = [
  {
    ...base(
      'assign',
      'guardar',
      'Variáveis',
      1,
      'target = value',
      'Cria ou atualiza uma variável, atributo ou item.',
    ),
    role: 'statement',
    defaultNode: () =>
      node('Assign', {
        targets: [name('pontos', 'Store')],
        value: integer('0'),
        type_comment: null,
      }),
    decode(value) {
      const targets = value.fields.targets
      return value.kind === 'Assign' &&
        exactFields(value, ['targets', 'value', 'type_comment']) &&
        value.fields.type_comment === null &&
        Array.isArray(targets) &&
        targets.length === 1 &&
        isNode(targets[0]) &&
        isNode(value.fields.value)
        ? {
            fields: [],
            inputs: [
              { name: 'TARGET', label: 'em', role: 'value', nodes: [targets[0]] },
              { name: 'VALUE', label: 'o valor', role: 'value', nodes: [value.fields.value] },
            ],
          }
        : undefined
    },
    encode(shape) {
      return node('Assign', {
        targets: [withTargetContext(requiredInput(shape, 'TARGET'), 'Store')],
        value: requiredInput(shape, 'VALUE'),
        type_comment: null,
      })
    },
  },
  {
    ...base(
      'expression',
      'calcular sem guardar',
      'Funções',
      3,
      'expression',
      'Calcula um valor e não guarda o resultado.',
    ),
    role: 'statement',
    hidden: true,
    defaultNode: () => node('Expr', { value: name('valor') }),
    decode(value) {
      return value.kind === 'Expr' && isNode(value.fields.value)
        ? {
            fields: [],
            inputs: [{ name: 'VALUE', label: '', role: 'value', nodes: [value.fields.value] }],
          }
        : undefined
    },
    encode(shape) {
      return node('Expr', { value: requiredInput(shape, 'VALUE') })
    },
  },
  ...(
    [
      ['pass', 'não fazer nada', 'Pass', 'Repetições', 2, 'Preenche um corpo ainda sem comandos.'],
      [
        'break',
        'sair da repetição',
        'Break',
        'Repetições',
        2,
        'Encerra a repetição atual. Use dentro de for ou while.',
      ],
      [
        'continue',
        'próxima repetição',
        'Continue',
        'Repetições',
        2,
        'Pula para a próxima volta da repetição atual.',
      ],
    ] as const
  ).map(
    ([id, title, kind, category, level, help]): PythonBlockCodec => ({
      ...base(id, title, category, level, id, help),
      role: 'statement',
      defaultNode: () => (kind === 'Pass' ? pass() : node(kind)),
      decode(value) {
        return value.kind === kind && exactFields(value, []) ? emptyShape() : undefined
      },
      encode: () => node(kind),
    }),
  ),
]

/** Not exposed in the product until the complete catalog/codec/UI batch is qualified. */
export const PYTHON_CORE_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  ...literals,
  ...operators,
  ...statements,
]
