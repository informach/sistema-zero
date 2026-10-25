import type { PythonNode } from '../language/types'
import {
  bodySlot,
  listSlot,
  metadata,
  requiredField,
  requiredInput,
  textSlot,
  valueSlot,
} from './catalogHelpers'
import type { PythonBlockCodec } from './contract'
import { integer, isNode, name, node, nodes, pass, text, withTargetContext } from './nodes'
import { structuralCodec } from './structuralCodec'

/**
 * Python syntax that real projects use beyond the first steps: `*args`/`**kwargs`,
 * decorators, comprehensions with several clauses, dict/set comprehensions, generator
 * expressions and bitwise operators. Every codec here decodes only what the simpler blocks
 * before it (catalog order) cannot, so a beginner's code keeps its beginner blocks.
 */

const arg = (id: string) => node('arg', { arg: id, annotation: null, type_comment: null })
const parameters = (names: string[]) =>
  node('arguments', {
    posonlyargs: [],
    args: names.map(arg),
    vararg: null,
    kwonlyargs: [],
    kw_defaults: [],
    kwarg: null,
    defaults: [],
  })
const atLeastOne = (key: string) => (value: PythonNode) =>
  nodes(value.fields[key]) && (value.fields[key] as PythonNode[]).length > 0

/**
 * `def f(a, /, b=1, *resto, c, d=2, **nomeados)`. Python keeps one default per keyword-only
 * parameter (`None` in the tree when it has none); the block shows them like positional
 * defaults: the last ones of the list. A missing default AFTER a given one
 * (`def f(*, a=1, b)`) has no such reading and stays as Python text.
 */
const allParameters: PythonBlockCodec = (() => {
  const codec = structuralCodec({
    ...metadata(
      'parameters_full',
      'parâmetros com * e **',
      'Funções',
      3,
      'parameters',
      'def f(a, /, b=valor, *resto, c, **nomeados)',
      '*nome junta numa tupla os valores que sobrarem; **nome junta num dicionário os argumentos nomeados que sobrarem. Os parâmetros "só pelo nome" vêm depois do * e só podem ser passados como nome=valor; os "só por posição" vêm antes da barra /.',
    ),
    // def mostrar(texto, *valores, cor, separador=' '): every part of the block in use, and
    // room to add one more default to either list.
    defaultNode: () => {
      const result = parameters(['texto'])
      result.fields.vararg = arg('valores')
      result.fields.kwonlyargs = [arg('cor'), arg('separador')]
      result.fields.kw_defaults = [null, text(' ')]
      return result
    },
    slots: [
      listSlot('posonlyargs', 'só por posição', 'parameter'),
      listSlot('args', 'parâmetro', 'parameter'),
      listSlot('defaults', 'valor padrão dos últimos parâmetros'),
      valueSlot('vararg', '*junta os outros valores em', true, 'parameter'),
      listSlot('kwonlyargs', 'só pelo nome', 'parameter'),
      listSlot('kw_defaults', 'valor padrão dos últimos só pelo nome'),
      valueSlot('kwarg', '**junta os outros nomeados em', true, 'parameter'),
    ],
    accepts: (value) => {
      const { posonlyargs, args, defaults, kwonlyargs, kw_defaults } = value.fields
      return (
        nodes(posonlyargs) &&
        nodes(args) &&
        nodes(defaults) &&
        nodes(kwonlyargs) &&
        nodes(kw_defaults) &&
        defaults.length <= posonlyargs.length + args.length &&
        kw_defaults.length <= kwonlyargs.length
      )
    },
  })
  return {
    ...codec,
    decode(value, context) {
      if (value.kind !== 'arguments') return
      const { kwonlyargs, kw_defaults } = value.fields
      if (
        !nodes(kwonlyargs) ||
        !Array.isArray(kw_defaults) ||
        kw_defaults.length !== kwonlyargs.length
      )
        return
      const first = kw_defaults.findIndex((item) => item !== null)
      const given = first < 0 ? [] : kw_defaults.slice(first)
      if (!nodes(given)) return
      return codec.decode(node('arguments', { ...value.fields, kw_defaults: given }), context)
    },
    encode(shape) {
      const result = codec.encode(shape)
      const { kwonlyargs, kw_defaults } = result.fields
      if (!nodes(kwonlyargs) || !nodes(kw_defaults))
        throw new Error('Parâmetros da função inválidos.')
      result.fields.kw_defaults = [
        ...Array.from({ length: kwonlyargs.length - kw_defaults.length }, () => null),
        ...kw_defaults,
      ]
      return result
    },
  } satisfies PythonBlockCodec
})()

const decorators = { ...listSlot('decorator_list', 'decorador'), minimum: 1 }

const decoratedFunction = structuralCodec({
  ...metadata(
    'decorated_function',
    'definir função com decorador',
    'Funções',
    3,
    'statement',
    '@decorador def nome(parâmetros):',
    'Define uma função e a entrega a cada decorador, do mais perto do def para o mais longe. Em classes, @property faz o método ser lido como um atributo, sem parênteses; @nome.setter escolhe o que acontece ao guardar um valor nele; @staticmethod dispensa o self.',
  ),
  defaultNode: () =>
    node('FunctionDef', {
      name: 'vida',
      args: parameters(['self']),
      body: [pass()],
      decorator_list: [name('property')],
      returns: null,
      type_comment: null,
      type_params: [],
    }),
  slots: [
    decorators,
    textSlot('name', 'nome'),
    valueSlot('args', 'parâmetros', false, 'parameters'),
    bodySlot('body', 'fazer'),
  ],
  accepts: atLeastOne('decorator_list'),
})

const decoratedClass = structuralCodec({
  ...metadata(
    'decorated_class',
    'definir classe com decorador',
    'Classes e objetos',
    3,
    'statement',
    '@decorador class Nome:',
    'Define uma classe e a entrega a cada decorador, que pode completá-la: @dataclass cria o __init__ a partir dos atributos escritos na classe.',
  ),
  defaultNode: () =>
    node('ClassDef', {
      name: 'Ponto',
      bases: [],
      keywords: [],
      body: [pass()],
      decorator_list: [name('dataclass')],
      type_params: [],
    }),
  slots: [
    decorators,
    textSlot('name', 'nome'),
    listSlot('bases', 'herda de'),
    bodySlot('body', 'métodos e atributos'),
  ],
  accepts: atLeastOne('decorator_list'),
})

const forClause = () =>
  node('comprehension', {
    target: name('item', 'Store'),
    iter: name('lista'),
    ifs: [],
    is_async: { literal: 'int', value: '0' },
  })

/** One `for … in … if …` clause; a learner's target always becomes a destination. */
const comprehensionClause: PythonBlockCodec = (() => {
  const codec = structuralCodec({
    ...metadata(
      'comprehension_for',
      'para cada',
      'Listas e coleções',
      3,
      'comprehension',
      'for item in coleção if condição',
      'Uma repetição dentro de uma montagem: percorre a coleção guardando cada item no nome escolhido. Cada "só se" deixa de fora os itens que não passam. Várias repetições se combinam como laços um dentro do outro, a primeira por fora.',
    ),
    defaultNode: forClause,
    slots: [valueSlot('target', 'para cada'), valueSlot('iter', 'em'), listSlot('ifs', 'só se')],
  })
  return {
    ...codec,
    encode(shape) {
      const result = codec.encode(shape)
      if (!isNode(result.fields.target)) throw new Error('Escolha onde guardar cada item.')
      result.fields.target = withTargetContext(result.fields.target, 'Store')
      return result
    },
  } satisfies PythonBlockCodec
})()

const clauses = { ...listSlot('generators', 'repetição', 'comprehension'), minimum: 1 }

function builder(
  kind: 'ListComp' | 'SetComp' | 'GeneratorExp',
  id: string,
  title: string,
  api: string,
  help: string,
) {
  return structuralCodec({
    ...metadata(id, title, 'Listas e coleções', 3, 'value', api, help),
    defaultNode: () => node(kind, { elt: name('item'), generators: [forClause()] }),
    slots: [valueSlot('elt', 'valor'), clauses],
    accepts: atLeastOne('generators'),
  })
}

const collectionBuilders: PythonBlockCodec[] = [
  builder(
    'ListComp',
    'list_built',
    'lista montada com',
    '[valor for item in coleção for … if …]',
    'Monta uma lista calculando o valor para cada combinação das repetições, na ordem em que aparecem. Com duas repetições, [(x, y) for x in colunas for y in linhas] passa por todas as casas de uma grade.',
  ),
  builder(
    'SetComp',
    'set_built',
    'conjunto montado com',
    '{valor for item in coleção}',
    'Monta um conjunto com os valores calculados para cada item. Valores repetidos aparecem uma vez só.',
  ),
  builder(
    'GeneratorExp',
    'generator',
    'valores calculados um a um',
    '(valor for item in coleção)',
    'Calcula os valores só quando alguém pede, um de cada vez, sem guardar a lista inteira. Combina com sum, min, max, any e all: sum(moeda.valor for moeda in moedas).',
  ),
  structuralCodec({
    ...metadata(
      'dict_built',
      'dicionário montado com',
      'Listas e coleções',
      3,
      'value',
      '{chave: valor for item in coleção}',
      'Monta um dicionário: para cada item das repetições, guarda o valor na chave calculada. Se a mesma chave aparecer de novo, fica o último valor.',
    ),
    defaultNode: () =>
      node('DictComp', { key: name('item'), value: integer('0'), generators: [forClause()] }),
    slots: [valueSlot('key', 'chave'), valueSlot('value', 'valor'), clauses],
    accepts: atLeastOne('generators'),
  }),
]

const bitOperations = [
  ['e de bits (&)', 'BitAnd'],
  ['ou de bits (|)', 'BitOr'],
  ['ou exclusivo (^)', 'BitXor'],
  ['empurrar à esquerda (<<)', 'LShift'],
  ['empurrar à direita (>>)', 'RShift'],
] as const
const bitUpdates = [
  ['|=', 'BitOr'],
  ['&=', 'BitAnd'],
  ['^=', 'BitXor'],
  ['<<=', 'LShift'],
  ['>>=', 'RShift'],
] as const
const isBitOperation = (kind: string) => bitOperations.some(([, option]) => option === kind)

const bitwise: PythonBlockCodec[] = [
  {
    ...metadata(
      'bitwise',
      'combinar bits',
      'Números e matemática',
      3,
      'value',
      '& | ^ << >>',
      'Opera nos bits de números inteiros. Em Pygame, | junta opções (pygame.SRCALPHA | pygame.SCALED) e & testa se uma opção está ligada (bandeiras & pygame.SRCALPHA).',
    ),
    defaultNode: () =>
      node('BinOp', { left: name('bandeiras'), op: node('BitAnd'), right: integer('1') }),
    decode(value) {
      const { left, op, right } = value.fields
      if (value.kind !== 'BinOp' || !isNode(left) || !isNode(right) || !isNode(op)) return
      if (!isBitOperation(op.kind)) return
      return {
        fields: [{ name: 'OP', label: 'operação', value: op.kind, options: bitOperations }],
        inputs: [
          { name: 'LEFT', label: 'primeiro', role: 'value', nodes: [left] },
          { name: 'RIGHT', label: 'segundo', role: 'value', nodes: [right] },
        ],
      }
    },
    encode(shape) {
      const op = requiredField(shape, 'OP')
      if (!isBitOperation(op)) throw new Error('Operação de bits inválida.')
      return node('BinOp', {
        left: requiredInput(shape, 'LEFT'),
        op: node(op),
        right: requiredInput(shape, 'RIGHT'),
      })
    },
  },
  {
    ...metadata(
      'invert',
      'inverter os bits de',
      'Números e matemática',
      3,
      'value',
      '~',
      'Troca cada bit do inteiro: ~0 vale -1. Com &, desliga uma opção: bandeiras & ~pygame.SCALED.',
    ),
    defaultNode: () => node('UnaryOp', { op: node('Invert'), operand: integer('0') }),
    decode(value) {
      const { op, operand } = value.fields
      return value.kind === 'UnaryOp' && isNode(op) && op.kind === 'Invert' && isNode(operand)
        ? {
            fields: [],
            inputs: [{ name: 'VALUE', label: 'valor', role: 'value', nodes: [operand] }],
          }
        : undefined
    },
    encode(shape) {
      return node('UnaryOp', { op: node('Invert'), operand: requiredInput(shape, 'VALUE') })
    },
  },
  {
    ...metadata(
      'update_bits',
      'atualizar bits',
      'Números e matemática',
      3,
      'statement',
      '|= &= ^= <<= >>=',
      'Atualiza a variável, atributo ou item combinando os bits com o valor: bandeiras |= pygame.SCALED liga mais uma opção.',
    ),
    defaultNode: () =>
      node('AugAssign', {
        target: name('bandeiras', 'Store'),
        op: node('BitOr'),
        value: integer('1'),
      }),
    decode(value) {
      const { target, op, value: operand } = value.fields
      if (value.kind !== 'AugAssign' || !isNode(target) || !isNode(op) || !isNode(operand)) return
      if (!bitUpdates.some(([, option]) => option === op.kind)) return
      return {
        fields: [{ name: 'op', label: 'operação', value: op.kind, options: bitUpdates }],
        inputs: [
          { name: 'target', label: 'atualizar', role: 'value', nodes: [target] },
          { name: 'value', label: 'com', role: 'value', nodes: [operand] },
        ],
      }
    },
    encode(shape) {
      const op = requiredField(shape, 'op')
      if (!bitUpdates.some(([, option]) => option === op)) throw new Error('Operação inválida.')
      const target = withTargetContext(requiredInput(shape, 'target'), 'Store')
      if (!['Name', 'Attribute', 'Subscript'].includes(target.kind))
        throw new Error('Atualize uma variável, atributo ou item.')
      return node('AugAssign', { target, op: node(op), value: requiredInput(shape, 'value') })
    },
  },
]

export const PYTHON_SYNTAX_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  allParameters,
  decoratedFunction,
  decoratedClass,
  comprehensionClause,
  ...collectionBuilders,
  ...bitwise,
]
