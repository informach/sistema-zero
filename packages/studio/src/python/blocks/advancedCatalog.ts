import type { PythonNode } from '../language/types'
import { bodySlot, listSlot, metadata, textSlot, valueSlot } from './catalogHelpers'
import type { PythonBlockCodec, PythonBlockShape } from './contract'
import { pythonDecimalFieldToHex, pythonFloatFromHex } from './float'
import { boolean, integer, isNode, name, node, nodes, pass, text, withTargetContext } from './nodes'
import { resizePythonShape } from './shapeControls'
import { structuralCodec } from './structuralCodec'

const count = (shape: PythonBlockShape, key: string, minimum = 0) => {
  const value = shape.extra?.[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum || value > 32)
    throw new Error('Quantidade de entradas inválida.')
  return value
}
const input = (shape: PythonBlockShape, key: string) => {
  const value = shape.inputs.find((entry) => entry.name === key)
  if (value?.nodes.length !== 1) throw new Error('Preencha todas as entradas do bloco.')
  return value.nodes[0]!
}
const comparisons = [
  ['=', 'Eq'],
  ['≠', 'NotEq'],
  ['<', 'Lt'],
  ['≤', 'LtE'],
  ['>', 'Gt'],
  ['≥', 'GtE'],
  ['está em', 'In'],
  ['não está em', 'NotIn'],
  ['é', 'Is'],
  ['não é', 'IsNot'],
] as const
const arithmetic = ['Add', 'Sub', 'Mult', 'Div', 'FloorDiv', 'Mod', 'Pow']
const argumentsNode = () =>
  node('arguments', {
    posonlyargs: [],
    args: [node('arg', { arg: 'valor', annotation: null, type_comment: null })],
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })

export const PYTHON_ADVANCED_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  {
    ...metadata(
      'float',
      'número decimal',
      'Números e matemática',
      1,
      'value',
      'float',
      'Um número decimal Python. Use ponto, como 2.5; o valor segue a precisão binária oficial.',
    ),
    defaultNode: () =>
      node('Constant', { value: { literal: 'float', value: '0x1.4000000000000p+1' }, kind: null }),
    decode(value) {
      const literal = value.fields.value
      if (
        value.kind !== 'Constant' ||
        value.fields.kind !== null ||
        !literal ||
        typeof literal !== 'object' ||
        !('literal' in literal) ||
        literal.literal !== 'float'
      )
        return
      try {
        const number = literal.value === '0x0.0p+0' ? 0 : pythonFloatFromHex(literal.value)
        return { fields: [{ name: 'NUMBER', label: 'decimal', value: String(number) }], inputs: [] }
      } catch {
        return
      }
    },
    encode(shape) {
      const source = shape.fields.find((field) => field.name === 'NUMBER')?.value
      if (source === undefined) throw new Error('Preencha o número decimal.')
      return node('Constant', {
        value: { literal: 'float', value: pythonDecimalFieldToHex(source) },
        kind: null,
      })
    },
  },
  ...(['And', 'Or'] as const).map(
    (op): PythonBlockCodec =>
      structuralCodec({
        ...metadata(
          op.toLowerCase(),
          op === 'And' ? 'e' : 'ou',
          'Lógica e decisões',
          1,
          'value',
          op === 'And' ? 'and' : 'or',
          'Avalia da esquerda para a direita e para assim que o resultado estiver decidido. Python devolve o valor escolhido.',
        ),
        defaultNode: () => node('BoolOp', { op: node(op), values: [boolean(), boolean(false)] }),
        slots: [{ ...listSlot('values', 'condição'), minimum: 2 }],
        accepts: (value) => nodes(value.fields.values) && value.fields.values.length >= 2,
      }),
  ),
  {
    ...metadata(
      'compare',
      'comparar',
      'Lógica e decisões',
      1,
      'value',
      '< <= > >= == != in not in is is not',
      'Compara valores. Comparações encadeadas avaliam cada valor apenas uma vez, como no Python.',
    ),
    controls: [{ key: 'count', label: 'comparação', kind: 'count', minimum: 1, maximum: 32 }],
    reshape(shape, key, value) {
      if (key !== 'count' || typeof value !== 'number' || value < 1)
        throw new Error('Use pelo menos uma comparação.')
      return resizePythonShape(shape, key, value, this.decode(this.defaultNode())!)
    },
    defaultNode: () =>
      node('Compare', { left: integer('1'), ops: [node('Lt')], comparators: [integer('2')] }),
    decode(value) {
      const { left, ops, comparators } = value.fields
      if (
        value.kind !== 'Compare' ||
        !isNode(left) ||
        !nodes(ops) ||
        !nodes(comparators) ||
        !ops.length ||
        ops.length > 32 ||
        ops.length !== comparators.length ||
        !ops.every((op) => comparisons.some(([, kind]) => kind === op.kind))
      )
        return
      return {
        fields: ops.map((op, i) => ({
          name: `op:${i}`,
          label: 'comparação',
          value: op.kind,
          options: comparisons,
        })),
        inputs: [
          { name: 'left', label: 'valor', role: 'value', nodes: [left] },
          ...comparators.map((item, i) => ({
            name: `right:${i}`,
            label: 'com',
            role: 'value' as const,
            nodes: [item],
          })),
        ],
        extra: { count: ops.length },
      }
    },
    encode(shape) {
      const size = count(shape, 'count', 1)
      const ops: PythonNode[] = [],
        comparators: PythonNode[] = []
      for (let i = 0; i < size; i++) {
        const op = shape.fields.find((field) => field.name === `op:${i}`)?.value
        if (!comparisons.some(([, kind]) => kind === op)) throw new Error('Comparação inválida.')
        ops.push(node(op!))
        comparators.push(input(shape, `right:${i}`))
      }
      return node('Compare', { left: input(shape, 'left'), ops, comparators })
    },
  },
  {
    ...metadata(
      'update',
      'atualizar valor',
      'Variáveis',
      1,
      'statement',
      '+= -= *= /= //= %= **=',
      'Atualiza a variável, atributo ou item usando a operação Python escolhida.',
    ),
    defaultNode: () =>
      node('AugAssign', { target: name('pontos', 'Store'), op: node('Add'), value: integer('1') }),
    decode(value) {
      const { target, op, value: operand } = value.fields
      if (
        value.kind !== 'AugAssign' ||
        !isNode(target) ||
        !isNode(op) ||
        !arithmetic.includes(op.kind) ||
        !isNode(operand)
      )
        return
      return {
        fields: [
          {
            name: 'op',
            label: 'operação',
            value: op.kind,
            options: arithmetic.map(
              (kind, i) => [['+=', '-=', '*=', '/=', '//=', '%=', '**='][i]!, kind] as const,
            ),
          },
        ],
        inputs: [
          { name: 'target', label: 'atualizar', role: 'value', nodes: [target] },
          { name: 'value', label: 'com', role: 'value', nodes: [operand] },
        ],
      }
    },
    encode(shape) {
      const op = shape.fields.find((field) => field.name === 'op')?.value
      if (!op || !arithmetic.includes(op)) throw new Error('Operação inválida.')
      const target = withTargetContext(input(shape, 'target'), 'Store')
      if (!['Name', 'Attribute', 'Subscript'].includes(target.kind))
        throw new Error('Atualize uma variável, atributo ou item.')
      return node('AugAssign', { target, op: node(op), value: input(shape, 'value') })
    },
  },
  {
    ...metadata(
      'dictionary',
      'dicionário',
      'Listas e coleções',
      2,
      'value',
      'dict',
      'Guarda pares de chave e valor, na ordem de inserção. Cada chave identifica um valor.',
    ),
    controls: [
      { key: 'count', label: 'par chave e valor', kind: 'count', minimum: 0, maximum: 32 },
    ],
    reshape(shape, key, value) {
      if (key !== 'count' || typeof value !== 'number')
        throw new Error('Quantidade de pares inválida.')
      return resizePythonShape(shape, key, value, this.decode(this.defaultNode())!)
    },
    defaultNode: () => node('Dict', { keys: [text('pontos')], values: [integer('0')] }),
    decode(value) {
      const { keys, values } = value.fields
      if (
        value.kind !== 'Dict' ||
        !nodes(keys) ||
        !nodes(values) ||
        keys.length !== values.length ||
        keys.length > 32
      )
        return
      return {
        fields: [],
        inputs: keys.flatMap((key, i) => [
          { name: `key:${i}`, label: 'chave', role: 'value' as const, nodes: [key] },
          { name: `value:${i}`, label: 'valor', role: 'value' as const, nodes: [values[i]!] },
        ]),
        extra: { count: keys.length },
      }
    },
    encode(shape) {
      const size = count(shape, 'count')
      return node('Dict', {
        keys: Array.from({ length: size }, (_, i) => input(shape, `key:${i}`)),
        values: Array.from({ length: size }, (_, i) => input(shape, `value:${i}`)),
      })
    },
  },
  (() => {
    const codec = structuralCodec({
      ...metadata(
        'delete',
        'remover item ou variável',
        'Listas e coleções',
        2,
        'statement',
        'del',
        'Remove o índice de uma lista, a chave de um dicionário ou a ligação de uma variável.',
      ),
      defaultNode: () =>
        node('Delete', {
          targets: [
            node('Subscript', { value: name('lista'), slice: integer('0'), ctx: node('Del') }),
          ],
        }),
      slots: [listSlot('targets', 'remover')],
    })
    return {
      ...codec,
      encode(shape) {
        const result = codec.encode(shape)
        if (!nodes(result.fields.targets) || !result.fields.targets.length)
          throw new Error('Escolha o que remover.')
        result.fields.targets = result.fields.targets.map((target) =>
          withTargetContext(target, 'Del'),
        )
        return result
      },
    } satisfies PythonBlockCodec
  })(),
  structuralCodec({
    ...metadata(
      'function',
      'definir função',
      'Funções',
      2,
      'statement',
      'def',
      'Define uma função. Parâmetros com valor padrão ficam depois dos parâmetros obrigatórios.',
    ),
    defaultNode: () =>
      node('FunctionDef', {
        name: 'minha_funcao',
        args: argumentsNode(),
        body: [pass()],
        decorator_list: [],
        returns: null,
        type_comment: null,
        type_params: [],
      }),
    slots: [
      textSlot('name', 'nome'),
      valueSlot('args', 'parâmetros', false, 'parameters'),
      bodySlot('body', 'fazer'),
    ],
  }),
  structuralCodec({
    ...metadata(
      'parameters',
      'parâmetros da função',
      'Funções',
      2,
      'parameters',
      'def f(a, b=value)',
      'Os valores padrão correspondem aos últimos parâmetros da lista, na mesma ordem.',
    ),
    defaultNode: argumentsNode,
    slots: [
      listSlot('args', 'parâmetro', 'parameter'),
      listSlot('defaults', 'valor padrão dos últimos parâmetros'),
    ],
    accepts: (value) =>
      nodes(value.fields.args) &&
      nodes(value.fields.defaults) &&
      value.fields.defaults.length <= value.fields.args.length,
  }),
  structuralCodec({
    ...metadata(
      'parameter',
      'nome do parâmetro',
      'Funções',
      2,
      'parameter',
      'parameter',
      'O nome usado para receber este valor dentro da função. Em métodos, o primeiro costuma ser self.',
    ),
    defaultNode: () => node('arg', { arg: 'valor', annotation: null, type_comment: null }),
    slots: [textSlot('arg', 'nome')],
  }),
  structuralCodec({
    ...metadata(
      'class',
      'definir classe',
      'Classes e objetos',
      3,
      'statement',
      'class',
      'Define uma classe. Use __init__ para iniciar a instância e self para seus atributos e métodos. Em herda de, a classe-mãe empresta os métodos; super().__init__() chama o __init__ dela.',
    ),
    defaultNode: () =>
      node('ClassDef', {
        name: 'Personagem',
        bases: [],
        keywords: [],
        body: [pass()],
        decorator_list: [],
        type_params: [],
      }),
    slots: [
      textSlot('name', 'nome'),
      listSlot('bases', 'herda de'),
      bodySlot('body', 'métodos e atributos'),
    ],
  }),
  structuralCodec({
    ...metadata(
      'lambda',
      'função rápida',
      'Funções',
      3,
      'value',
      'lambda a, b=valor: resultado',
      'Cria uma função sem nome que devolve o valor da expressão. Útil em callbacks curtos, como tela.onkey(lambda: virar(90), "Up"). Valores padrão são calculados quando ela é criada.',
    ),
    defaultNode: () => node('Lambda', { args: argumentsNode(), body: name('valor') }),
    slots: [valueSlot('args', 'parâmetros', false, 'parameters'), valueSlot('body', 'devolve')],
  }),
  structuralCodec({
    ...metadata(
      'interpolation',
      'texto com valores',
      'Textos',
      2,
      'value',
      'f"text {value}"',
      'Monta um texto alternando partes escritas e valores. Os valores são avaliados na ordem do texto.',
    ),
    defaultNode: () =>
      node('JoinedStr', {
        values: [
          text('Pontos: '),
          node('FormattedValue', {
            value: name('pontos'),
            conversion: { literal: 'int', value: '-1' },
            format_spec: null,
          }),
        ],
      }),
    slots: [listSlot('values', 'parte do texto', 'format')],
    accepts: (value) =>
      nodes(value.fields.values) &&
      value.fields.values.every(
        (part) =>
          part.kind === 'FormattedValue' ||
          (part.kind === 'Constant' && typeof part.fields.value === 'string'),
      ),
  }),
  structuralCodec({
    ...metadata(
      'format_value',
      'valor dentro do texto',
      'Textos',
      2,
      'format',
      '{value}',
      'Insere a representação textual do valor na interpolação.',
    ),
    defaultNode: () =>
      node('FormattedValue', {
        value: name('pontos'),
        conversion: { literal: 'int', value: '-1' },
        format_spec: null,
      }),
    slots: [valueSlot('value', 'valor')],
  }),
]
