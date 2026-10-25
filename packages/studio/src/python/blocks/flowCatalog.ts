import type { PythonNode } from '../language/types'
import { metadata, PYTHON_IDENTIFIER, requiredInput, shapeInput, valueSlot } from './catalogHelpers'
import type { PythonBlockCodec, PythonBlockInput, PythonBlockShape } from './contract'
import {
  boolean,
  call,
  integer,
  isNode,
  name,
  node,
  nodes,
  pass,
  text,
  withTargetContext,
} from './nodes'
import { PYTHON_MAX_ITEMS } from './shapeControls'
import { structuralCodec } from './structuralCodec'

const suite = (shape: PythonBlockShape, key: string) => {
  const found = shapeInput(shape, key)
  if (!found) throw new Error('O bloco perdeu um de seus corpos.')
  return found.nodes.length ? found.nodes : [pass()]
}
const exact = (value: PythonNode, keys: readonly string[]) =>
  Object.keys(value.fields).length === keys.length &&
  keys.every((key) => Object.hasOwn(value.fields, key))
const statementInput = (key: string, label: string, body: PythonNode[]): PythonBlockInput => ({
  name: key,
  label,
  role: 'statement',
  nodes: body.length === 1 && body[0]!.kind === 'Pass' ? [] : body,
})
const isLoadName = (value: unknown, id?: string) =>
  isNode(value as PythonNode) &&
  (value as PythonNode).kind === 'Name' &&
  (id === undefined || (value as PythonNode).fields.id === id) &&
  isNode((value as PythonNode).fields.ctx) &&
  ((value as PythonNode).fields.ctx as PythonNode).kind === 'Load'

/** `if / elif / elif / else` as one flat block, never a staircase of nested ifs. */
const ifCodec: PythonBlockCodec = {
  ...metadata(
    'if',
    'se',
    'Lógica e decisões',
    1,
    'statement',
    'if / elif / else',
    'Faz os comandos de "então" quando a condição é verdadeira. Use "+ senão se" para testar outras condições em ordem e "+ senão" para o caso em que nenhuma vale.',
  ),
  match: { kinds: ['If'] },
  controls: [
    { key: 'elif:count', label: 'senão se', kind: 'count', minimum: 0, maximum: 31 },
    { key: 'orelse:present', label: 'senão', kind: 'optional' },
  ],
  defaultNode: () => node('If', { test: boolean(), body: [pass()], orelse: [] }),
  decode(value) {
    const inputs: PythonBlockInput[] = []
    let current: PythonNode = value
    let elifs = 0
    for (;;) {
      if (current.kind !== 'If' || !exact(current, ['test', 'body', 'orelse'])) return
      const { test, body, orelse } = current.fields
      if (!isNode(test) || !nodes(body) || !nodes(orelse)) return
      const index = elifs
      inputs.push({
        name: `test:${index}`,
        label: index ? 'senão se' : 'se',
        role: 'value',
        nodes: [test],
      })
      inputs.push(statementInput(`body:${index}`, 'então', body))
      if (orelse.length === 1 && orelse[0]!.kind === 'If' && elifs < 31) {
        current = orelse[0]!
        elifs++
        continue
      }
      const extra: PythonBlockShape['extra'] = {
        'elif:count': elifs,
        'orelse:present': orelse.length > 0,
      }
      if (orelse.length) inputs.push(statementInput('orelse', 'senão', orelse))
      return { fields: [], inputs, extra }
    }
  },
  encode(shape) {
    const count = Number(shape.extra?.['elif:count'] ?? 0)
    if (!Number.isSafeInteger(count) || count < 0 || count > 31)
      throw new Error('Quantidade de "senão se" inválida.')
    let orelse: PythonNode[] = shape.extra?.['orelse:present'] ? suite(shape, 'orelse') : []
    for (let index = count; index >= 0; index--)
      orelse = [
        node('If', {
          test: requiredInput(shape, `test:${index}`),
          body: suite(shape, `body:${index}`),
          orelse,
        }),
      ]
    return orelse[0]!
  },
  reshape(shape, key, value) {
    const result = structuredClone(shape)
    result.extra = { ...result.extra }
    if (key === 'orelse:present') {
      if (typeof value !== 'boolean') throw new Error('Opção inválida do bloco Python.')
      result.extra[key] = value
      result.inputs = result.inputs.filter((item) => item.name !== 'orelse')
      if (value)
        result.inputs.push({ name: 'orelse', label: 'senão', role: 'statement', nodes: [] })
      return result
    }
    if (key !== 'elif:count' || typeof value !== 'number' || value < 0 || value > 31)
      throw new Error('Opção desconhecida do bloco Python.')
    const current = Number(result.extra[key] ?? 0)
    const kept = result.inputs.filter((item) => {
      const [kind, at] = item.name.split(':')
      return (kind !== 'test' && kind !== 'body') || Number(at) <= value
    })
    const elseInput = kept.filter((item) => item.name === 'orelse')
    const branches = kept.filter((item) => item.name !== 'orelse')
    for (let index = current + 1; index <= value; index++)
      branches.push(
        { name: `test:${index}`, label: 'senão se', role: 'value', nodes: [boolean()] },
        { name: `body:${index}`, label: 'então', role: 'statement', nodes: [] },
      )
    result.inputs = [...branches, ...elseInput]
    result.extra[key] = value
    return result
  },
}

/** `for _ in range(n):` — the first loop children learn. */
const repeatCodec: PythonBlockCodec = {
  ...metadata(
    'repeat',
    'repetir',
    'Repetições',
    1,
    'statement',
    'for _ in range(n)',
    'Repete os comandos o número de vezes escolhido.',
  ),
  binding: { root: 'range' },
  match: { kinds: ['For'] },
  defaultNode: () =>
    node('For', {
      target: name('_', 'Store'),
      iter: call(name('range'), [integer('4')]),
      body: [pass()],
      orelse: [],
      type_comment: null,
    }),
  decode(value) {
    const { target, iter, body, orelse, type_comment } = value.fields
    if (
      value.kind !== 'For' ||
      !exact(value, ['target', 'iter', 'body', 'orelse', 'type_comment']) ||
      type_comment !== null ||
      !nodes(orelse) ||
      orelse.length ||
      !nodes(body) ||
      !isNode(target) ||
      target.kind !== 'Name' ||
      target.fields.id !== '_' ||
      !isNode(iter) ||
      iter.kind !== 'Call' ||
      !isLoadName(iter.fields.func, 'range') ||
      !nodes(iter.fields.args) ||
      iter.fields.args.length !== 1 ||
      !nodes(iter.fields.keywords) ||
      iter.fields.keywords.length
    )
      return
    return {
      fields: [],
      inputs: [
        { name: 'times', label: 'vezes', role: 'value', nodes: [iter.fields.args[0]!] },
        statementInput('body', '', body),
      ],
    }
  },
  encode(shape) {
    return node('For', {
      target: name('_', 'Store'),
      iter: call(name('range'), [requiredInput(shape, 'times')]),
      body: suite(shape, 'body'),
      orelse: [],
      type_comment: null,
    })
  },
}

/** `while True:` — the game loop of console games. */
const foreverCodec: PythonBlockCodec = {
  ...metadata(
    'forever',
    'repetir para sempre',
    'Repetições',
    2,
    'statement',
    'while True',
    'Repete sem parar. Use "sair da repetição" (break) para terminar.',
  ),
  match: { kinds: ['While'] },
  defaultNode: () => node('While', { test: boolean(true), body: [pass()], orelse: [] }),
  decode(value) {
    const { test, body, orelse } = value.fields
    if (
      value.kind !== 'While' ||
      !exact(value, ['test', 'body', 'orelse']) ||
      !isNode(test) ||
      test.kind !== 'Constant' ||
      test.fields.value !== true ||
      test.fields.kind !== null ||
      !nodes(body) ||
      !nodes(orelse) ||
      orelse.length
    )
      return
    return { fields: [], inputs: [statementInput('body', '', body)] }
  },
  encode(shape) {
    return node('While', { test: boolean(true), body: suite(shape, 'body'), orelse: [] })
  },
}

/** `global pontos, vidas` — functions that change variables of the whole program. */
function namesStatement(kind: 'Global' | 'Nonlocal'): PythonBlockCodec {
  const global = kind === 'Global'
  return {
    ...metadata(
      global ? 'global' : 'nonlocal',
      global ? 'mudar as variáveis do programa' : 'mudar as variáveis de fora',
      'Variáveis',
      global ? 2 : 3,
      'statement',
      global ? 'global nome' : 'nonlocal nome',
      global
        ? 'Dentro de uma função, permite mudar variáveis criadas fora dela (separe os nomes com vírgula).'
        : 'Dentro de uma função interna, permite mudar variáveis da função de fora.',
    ),
    match: { kinds: [kind] },
    defaultNode: () => node(kind, { names: ['pontos'] }),
    decode(value) {
      const { names } = value.fields
      if (
        value.kind !== kind ||
        !exact(value, ['names']) ||
        !Array.isArray(names) ||
        !names.length ||
        !names.every((item) => typeof item === 'string')
      )
        return
      return {
        fields: [{ name: 'NAMES', label: '', value: (names as string[]).join(', ') }],
        inputs: [],
      }
    },
    encode(shape) {
      const raw = shape.fields.find((field) => field.name === 'NAMES')?.value ?? ''
      const names = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
      if (!names.length || names.some((item) => !PYTHON_IDENTIFIER.test(item)))
        throw new Error('Escreva os nomes das variáveis separados por vírgula.')
      return node(kind, { names })
    },
  }
}

/** `def nome(a, b):` with plain parameters typed right on the block. */
const simpleFunctionCodec: PythonBlockCodec = {
  ...metadata(
    'def',
    'definir a função',
    'Funções',
    1,
    'statement',
    'def nome(parâmetros):',
    'Cria uma função com um nome. Os parâmetros (separados por vírgula) recebem os valores de quem chama.',
  ),
  match: { kinds: ['FunctionDef'] },
  defaultNode: () =>
    node('FunctionDef', {
      name: 'minha_funcao',
      args: node('arguments', {
        posonlyargs: [],
        args: [],
        vararg: null,
        kwonlyargs: [],
        kw_defaults: [],
        kwarg: null,
        defaults: [],
      }),
      body: [pass()],
      decorator_list: [],
      returns: null,
      type_comment: null,
      type_params: [],
    }),
  decode(value) {
    const {
      name: functionName,
      args,
      body,
      decorator_list,
      returns,
      type_comment,
      type_params,
    } = value.fields
    if (
      value.kind !== 'FunctionDef' ||
      typeof functionName !== 'string' ||
      !isNode(args) ||
      !nodes(body) ||
      !nodes(decorator_list) ||
      decorator_list.length ||
      returns !== null ||
      type_comment !== null ||
      !nodes(type_params) ||
      type_params.length
    )
      return
    const a = args.fields
    if (
      !nodes(a.posonlyargs) ||
      a.posonlyargs.length ||
      a.vararg !== null ||
      !nodes(a.kwonlyargs) ||
      a.kwonlyargs.length ||
      !Array.isArray(a.kw_defaults) ||
      a.kw_defaults.length ||
      a.kwarg !== null ||
      !nodes(a.defaults) ||
      a.defaults.length ||
      !nodes(a.args) ||
      !a.args.every(
        (arg) =>
          typeof arg.fields.arg === 'string' &&
          arg.fields.annotation === null &&
          arg.fields.type_comment === null,
      )
    )
      return
    return {
      fields: [
        { name: 'NAME', label: '', value: functionName },
        {
          name: 'PARAMS',
          label: 'recebendo',
          value: a.args.map((arg) => arg.fields.arg).join(', '),
        },
      ],
      inputs: [statementInput('body', '', body)],
    }
  },
  encode(shape) {
    const field = (key: string) => shape.fields.find((item) => item.name === key)?.value ?? ''
    const functionName = field('NAME').trim()
    if (!PYTHON_IDENTIFIER.test(functionName)) throw new Error('Escolha um nome para a função.')
    const params = pythonDefinedParams(field('PARAMS'))
    if (!params) throw new Error('Escreva nomes de parâmetros diferentes, separados por vírgula.')
    return node('FunctionDef', {
      name: functionName,
      args: node('arguments', {
        posonlyargs: [],
        args: params.map((arg) => node('arg', { arg, annotation: null, type_comment: null })),
        vararg: null,
        kwonlyargs: [],
        kw_defaults: [],
        kwarg: null,
        defaults: [],
      }),
      body: suite(shape, 'body'),
      decorator_list: [],
      returns: null,
      type_comment: null,
      type_params: [],
    })
  },
}

/**
 * "chamar mover com distancia ⟨10⟩, angulo ⟨90⟩": the label of each value names the parameter
 * that receives it. Without the parameter (unknown function, extra value), the plain label.
 */
export function pythonCallArgumentLabel(index: number, params?: readonly string[]) {
  const param = params?.[index]
  return `${index ? ',' : 'com'}${param ? ` ${param}` : ''}`
}

/** The parameter names typed on a "definir a função" block, or undefined when one is not valid. */
export function pythonDefinedParams(text: string): readonly string[] | undefined {
  const params = text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  if (
    params.some((item) => !PYTHON_IDENTIFIER.test(item)) ||
    new Set(params).size !== params.length
  )
    return
  return params
}

/** `pular()` / `pular(10)` — calling the child's own function by name. */
function namedCall(role: 'statement' | 'value'): PythonBlockCodec {
  const statement = role === 'statement'
  return {
    ...metadata(
      statement ? 'run' : 'run_value',
      statement ? 'chamar' : 'resultado de',
      'Funções',
      1,
      role,
      'nome(valores)',
      statement
        ? 'Chama uma função pelo nome, mandando os valores na ordem dos parâmetros.'
        : 'Chama uma função e usa o valor que ela devolve.',
    ),
    match: { kinds: [statement ? 'Expr' : 'Call'] },
    controls: [
      { key: 'args:count', label: 'valor', kind: 'count', minimum: 0, maximum: PYTHON_MAX_ITEMS },
    ],
    defaultNode: () => {
      const value = call(name('minha_funcao'), [])
      return statement ? node('Expr', { value }) : value
    },
    decode(value, context) {
      const target = statement ? value.fields.value : value
      if (statement && (value.kind !== 'Expr' || !exact(value, ['value']))) return
      if (!isNode(target) || target.kind !== 'Call' || !exact(target, ['func', 'args', 'keywords']))
        return
      const { func, args, keywords } = target.fields
      if (
        !isLoadName(func) ||
        !nodes(args) ||
        args.length > PYTHON_MAX_ITEMS ||
        !nodes(keywords) ||
        keywords.length
      )
        return
      if (args.some((arg) => arg.kind === 'Starred')) return
      // The names come from the def; in the editor, pythonCallLabels keeps them up to date.
      const params = context?.functionParams?.(func as PythonNode)
      return {
        fields: [{ name: 'NAME', label: '', value: (func as PythonNode).fields.id as string }],
        inputs: args.map((arg, index) => ({
          name: `args:${index}`,
          label: pythonCallArgumentLabel(index, params),
          role: 'value' as const,
          nodes: [arg],
        })),
        extra: { 'args:count': args.length },
      }
    },
    encode(shape) {
      const functionName = shape.fields.find((item) => item.name === 'NAME')?.value.trim() ?? ''
      if (!PYTHON_IDENTIFIER.test(functionName)) throw new Error('Escolha o nome da função.')
      const count = Number(shape.extra?.['args:count'] ?? 0)
      if (!Number.isSafeInteger(count) || count < 0 || count > PYTHON_MAX_ITEMS)
        throw new Error('Quantidade de valores inválida.')
      const args = Array.from({ length: count }, (_, index) =>
        requiredInput(shape, `args:${index}`),
      )
      const value = call(name(functionName), args)
      return statement ? node('Expr', { value }) : value
    },
    reshape(shape, key, value) {
      if (
        key !== 'args:count' ||
        typeof value !== 'number' ||
        value < 0 ||
        value > PYTHON_MAX_ITEMS
      )
        throw new Error('Opção desconhecida do bloco Python.')
      const result = structuredClone(shape)
      const kept = result.inputs.filter((item) => Number(item.name.split(':')[1]) < value)
      for (let index = kept.length; index < value; index++)
        kept.push({
          name: `args:${index}`,
          label: pythonCallArgumentLabel(index),
          role: 'value',
          nodes: [integer('0')],
        })
      result.inputs = kept
      result.extra = { ...result.extra, 'args:count': value }
      return result
    },
  }
}

/** `objeto.metodo(...)` — any method, named on the block. */
function methodCall(role: 'statement' | 'value'): PythonBlockCodec {
  const statement = role === 'statement'
  return {
    ...metadata(
      statement ? 'method' : 'method_value',
      statement ? 'chamar o método' : 'resultado do método',
      'Classes e objetos',
      2,
      role,
      'objeto.metodo(valores)',
      'Chama um método do objeto (por exemplo, o draw de um ator ou o append de uma lista).',
    ),
    match: { kinds: [statement ? 'Expr' : 'Call'] },
    controls: [
      { key: 'args:count', label: 'valor', kind: 'count', minimum: 0, maximum: PYTHON_MAX_ITEMS },
    ],
    defaultNode: () => {
      const value = call(
        node('Attribute', { value: name('objeto'), attr: 'metodo', ctx: node('Load') }),
        [],
      )
      return statement ? node('Expr', { value }) : value
    },
    decode(value) {
      const target = statement ? value.fields.value : value
      if (statement && (value.kind !== 'Expr' || !exact(value, ['value']))) return
      if (!isNode(target) || target.kind !== 'Call' || !exact(target, ['func', 'args', 'keywords']))
        return
      const { func, args, keywords } = target.fields
      if (
        !isNode(func) ||
        func.kind !== 'Attribute' ||
        typeof func.fields.attr !== 'string' ||
        !isNode(func.fields.value) ||
        !isNode(func.fields.ctx) ||
        func.fields.ctx.kind !== 'Load' ||
        !nodes(args) ||
        args.length > PYTHON_MAX_ITEMS ||
        !nodes(keywords) ||
        keywords.length ||
        args.some((arg) => arg.kind === 'Starred')
      )
        return
      return {
        fields: [{ name: 'METHOD', label: '', value: func.fields.attr }],
        inputs: [
          { name: 'receiver', label: 'de', role: 'value', nodes: [func.fields.value] },
          ...args.map((arg, index) => ({
            name: `args:${index}`,
            label: index ? ',' : 'com',
            role: 'value' as const,
            nodes: [arg],
          })),
        ],
        extra: { 'args:count': args.length },
      }
    },
    encode(shape) {
      const method = shape.fields.find((item) => item.name === 'METHOD')?.value.trim() ?? ''
      if (!PYTHON_IDENTIFIER.test(method)) throw new Error('Escolha o nome do método.')
      const count = Number(shape.extra?.['args:count'] ?? 0)
      if (!Number.isSafeInteger(count) || count < 0 || count > PYTHON_MAX_ITEMS)
        throw new Error('Quantidade de valores inválida.')
      const args = Array.from({ length: count }, (_, index) =>
        requiredInput(shape, `args:${index}`),
      )
      const value = call(
        node('Attribute', {
          value: requiredInput(shape, 'receiver'),
          attr: method,
          ctx: node('Load'),
        }),
        args,
      )
      return statement ? node('Expr', { value }) : value
    },
    reshape(shape, key, value) {
      if (
        key !== 'args:count' ||
        typeof value !== 'number' ||
        value < 0 ||
        value > PYTHON_MAX_ITEMS
      )
        throw new Error('Opção desconhecida do bloco Python.')
      const result = structuredClone(shape)
      const receiver = result.inputs.filter((item) => item.name === 'receiver')
      const kept = result.inputs.filter(
        (item) => item.name !== 'receiver' && Number(item.name.split(':')[1]) < value,
      )
      for (let index = kept.length; index < value; index++)
        kept.push({
          name: `args:${index}`,
          label: pythonCallArgumentLabel(index),
          role: 'value',
          nodes: [integer('0')],
        })
      result.inputs = [...receiver, ...kept]
      result.extra = { ...result.extra, 'args:count': value }
      return result
    },
  }
}

/** `lista[1:3]` — a piece of a list or text. */
const sliceCodec: PythonBlockCodec = {
  ...metadata(
    'slice',
    'pedaço de',
    'Listas e coleções',
    2,
    'value',
    'coleção[início:fim:passo]',
    'Um pedaço de uma lista ou texto, do início até antes do fim. Sem início, começa do primeiro; sem fim, vai até o último.',
  ),
  match: { kinds: ['Subscript'] },
  controls: [
    { key: 'lower:present', label: 'início', kind: 'optional' },
    { key: 'upper:present', label: 'fim', kind: 'optional' },
    { key: 'step:present', label: 'passo', kind: 'optional' },
  ],
  defaultNode: () =>
    node('Subscript', {
      value: name('lista'),
      slice: node('Slice', { lower: integer('0'), upper: integer('2'), step: null }),
      ctx: node('Load'),
    }),
  decode(value) {
    const { slice, ctx } = value.fields
    if (
      value.kind !== 'Subscript' ||
      !exact(value, ['value', 'slice', 'ctx']) ||
      !isNode(value.fields.value) ||
      !isNode(ctx) ||
      !['Load', 'Store', 'Del'].includes(ctx.kind) ||
      !isNode(slice) ||
      slice.kind !== 'Slice' ||
      !exact(slice, ['lower', 'upper', 'step'])
    )
      return
    const extra: PythonBlockShape['extra'] = { context: ctx.kind }
    const inputs: PythonBlockInput[] = [
      { name: 'value', label: '', role: 'value', nodes: [value.fields.value] },
    ]
    for (const [key, label] of [
      ['lower', 'de'],
      ['upper', 'até'],
      ['step', 'pulando'],
    ] as const) {
      const part = slice.fields[key]
      extra[`${key}:present`] = part !== null
      if (part === null) continue
      if (!isNode(part)) return
      inputs.push({ name: key, label, role: 'value', nodes: [part] })
    }
    return { fields: [], inputs, extra }
  },
  encode(shape) {
    const part = (key: string) =>
      shape.extra?.[`${key}:present`] ? requiredInput(shape, key) : null
    const context = String(shape.extra?.context ?? 'Load')
    if (!['Load', 'Store', 'Del'].includes(context)) throw new Error('Destino Python inválido.')
    return node('Subscript', {
      value: requiredInput(shape, 'value'),
      slice: node('Slice', { lower: part('lower'), upper: part('upper'), step: part('step') }),
      ctx: node(context),
    })
  },
  reshape(shape, key, value) {
    const field = key.split(':')[0]!
    if (!['lower', 'upper', 'step'].includes(field) || typeof value !== 'boolean')
      throw new Error('Opção desconhecida do bloco Python.')
    const result = structuredClone(shape)
    result.extra = { ...result.extra, [key]: value }
    const labels: Record<string, string> = { lower: 'de', upper: 'até', step: 'pulando' }
    const rest = result.inputs.filter((item) => item.name !== field)
    if (value)
      rest.push({ name: field, label: labels[field]!, role: 'value', nodes: [integer('1')] })
    const order = ['value', 'lower', 'upper', 'step']
    result.inputs = rest.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name))
    return result
  },
}

/** `[x * 2 for x in lista if x > 0]` with one `for` and at most one `if`. */
const listComprehensionCodec: PythonBlockCodec = {
  ...metadata(
    'list_comprehension',
    'lista com',
    'Listas e coleções',
    3,
    'value',
    '[valor for item in coleção if condição]',
    'Monta uma lista nova: para cada item da coleção (que passa no teste, se houver), guarda o valor calculado.',
  ),
  match: { kinds: ['ListComp'] },
  controls: [{ key: 'if:present', label: 'só se', kind: 'optional' }],
  defaultNode: () =>
    node('ListComp', {
      elt: name('item'),
      generators: [
        node('comprehension', {
          target: name('item', 'Store'),
          iter: name('lista'),
          ifs: [],
          is_async: { literal: 'int', value: '0' },
        }),
      ],
    }),
  decode(value) {
    const { elt, generators } = value.fields
    if (
      value.kind !== 'ListComp' ||
      !exact(value, ['elt', 'generators']) ||
      !isNode(elt) ||
      !nodes(generators) ||
      generators.length !== 1
    )
      return
    const generator = generators[0]!
    const { target, iter, ifs, is_async } = generator.fields
    if (
      generator.kind !== 'comprehension' ||
      !exact(generator, ['target', 'iter', 'ifs', 'is_async']) ||
      !isNode(target) ||
      !isNode(iter) ||
      !nodes(ifs) ||
      ifs.length > 1 ||
      !is_async ||
      typeof is_async !== 'object' ||
      !('literal' in is_async) ||
      is_async.value !== '0'
    )
      return
    const inputs: PythonBlockInput[] = [
      { name: 'elt', label: '', role: 'value', nodes: [elt] },
      { name: 'target', label: 'para cada', role: 'value', nodes: [target] },
      { name: 'iter', label: 'em', role: 'value', nodes: [iter] },
    ]
    if (ifs.length) inputs.push({ name: 'if', label: 'só se', role: 'value', nodes: [ifs[0]!] })
    return { fields: [], inputs, extra: { 'if:present': ifs.length > 0 } }
  },
  encode(shape) {
    return node('ListComp', {
      elt: requiredInput(shape, 'elt'),
      generators: [
        node('comprehension', {
          target: withTargetContext(requiredInput(shape, 'target'), 'Store'),
          iter: requiredInput(shape, 'iter'),
          ifs: shape.extra?.['if:present'] ? [requiredInput(shape, 'if')] : [],
          is_async: { literal: 'int', value: '0' },
        }),
      ],
    })
  },
  reshape(shape, key, value) {
    if (key !== 'if:present' || typeof value !== 'boolean')
      throw new Error('Opção desconhecida do bloco Python.')
    const result = structuredClone(shape)
    result.extra = { ...result.extra, [key]: value }
    result.inputs = result.inputs.filter((item) => item.name !== 'if')
    if (value) result.inputs.push({ name: 'if', label: 'só se', role: 'value', nodes: [boolean()] })
    return result
  },
}

/** `a if condição else b` */
const conditionalValueCodec = structuralCodec({
  ...metadata(
    'if_value',
    'valor escolhido',
    'Lógica e decisões',
    2,
    'value',
    'a if condição else b',
    'Vale o primeiro valor quando a condição é verdadeira; senão, vale o segundo.',
  ),
  defaultNode: () => node('IfExp', { test: boolean(), body: text('sim'), orelse: text('não') }),
  slots: [valueSlot('body', ''), valueSlot('test', 'se'), valueSlot('orelse', 'senão')],
})

/** `a = b = 0` — the same value in several variables. */
const assignManyCodec: PythonBlockCodec = {
  ...metadata(
    'assign_many',
    'guardar o mesmo valor',
    'Variáveis',
    2,
    'statement',
    'a = b = valor',
    'Guarda o mesmo valor em várias variáveis de uma vez.',
  ),
  match: { kinds: ['Assign'] },
  controls: [
    {
      key: 'targets:count',
      label: 'variável',
      kind: 'count',
      minimum: 2,
      maximum: PYTHON_MAX_ITEMS,
    },
  ],
  defaultNode: () =>
    node('Assign', {
      targets: [name('a', 'Store'), name('b', 'Store')],
      value: integer('0'),
      type_comment: null,
    }),
  decode(value) {
    const { targets, type_comment } = value.fields
    if (
      value.kind !== 'Assign' ||
      !exact(value, ['targets', 'value', 'type_comment']) ||
      type_comment !== null ||
      !nodes(targets) ||
      targets.length < 2 ||
      targets.length > PYTHON_MAX_ITEMS ||
      !isNode(value.fields.value)
    )
      return
    return {
      fields: [],
      inputs: [
        ...targets.map((target, index) => ({
          name: `targets:${index}`,
          label: index ? 'e em' : 'em',
          role: 'value' as const,
          nodes: [target],
        })),
        { name: 'value', label: 'guardar', role: 'value', nodes: [value.fields.value] },
      ],
      extra: { 'targets:count': targets.length },
    }
  },
  encode(shape) {
    const count = Number(shape.extra?.['targets:count'] ?? 2)
    if (!Number.isSafeInteger(count) || count < 2 || count > PYTHON_MAX_ITEMS)
      throw new Error('Quantidade de variáveis inválida.')
    return node('Assign', {
      targets: Array.from({ length: count }, (_, index) =>
        withTargetContext(requiredInput(shape, `targets:${index}`), 'Store'),
      ),
      value: requiredInput(shape, 'value'),
      type_comment: null,
    })
  },
  reshape(shape, key, value) {
    if (
      key !== 'targets:count' ||
      typeof value !== 'number' ||
      value < 2 ||
      value > PYTHON_MAX_ITEMS
    )
      throw new Error('Opção desconhecida do bloco Python.')
    const result = structuredClone(shape)
    const targets = result.inputs.filter((item) => item.name.startsWith('targets:'))
    const kept = targets.slice(0, value)
    for (let index = kept.length; index < value; index++)
      kept.push({
        name: `targets:${index}`,
        label: 'e em',
        role: 'value',
        nodes: [name(`v${index}`)],
      })
    result.inputs = [...kept, ...result.inputs.filter((item) => !item.name.startsWith('targets:'))]
    result.extra = { ...result.extra, 'targets:count': value }
    return result
  },
}

/** `import random` — one module, no alias. */
const importOneCodec: PythonBlockCodec = {
  ...metadata(
    'import_one',
    'usar o módulo',
    'Módulos',
    1,
    'statement',
    'import módulo',
    'Deixa o programa usar um módulo: random (sorteios), math (contas), time (tempo), turtle (desenhos)…',
  ),
  match: { kinds: ['Import'] },
  defaultNode: () => node('Import', { names: [node('alias', { name: 'random', asname: null })] }),
  decode(value) {
    const { names } = value.fields
    if (value.kind !== 'Import' || !exact(value, ['names']) || !nodes(names) || names.length !== 1)
      return
    const alias = names[0]!
    if (
      alias.kind !== 'alias' ||
      typeof alias.fields.name !== 'string' ||
      alias.fields.asname !== null
    )
      return
    return { fields: [{ name: 'MODULE', label: '', value: alias.fields.name }], inputs: [] }
  },
  encode(shape) {
    const module = shape.fields.find((item) => item.name === 'MODULE')?.value.trim() ?? ''
    if (
      !/^[_\p{ID_Start}][_\p{ID_Continue}]*(\.[_\p{ID_Start}][_\p{ID_Continue}]*)*$/u.test(module)
    )
      throw new Error('Escreva o nome do módulo.')
    return node('Import', { names: [node('alias', { name: module, asname: null })] })
  },
}

/** `from turtle import *` */
const importAllCodec: PythonBlockCodec = {
  ...metadata(
    'import_all',
    'usar tudo do módulo',
    'Módulos',
    2,
    'statement',
    'from módulo import *',
    'Traz todos os nomes do módulo para o programa, sem precisar escrever o nome do módulo antes.',
  ),
  match: { kinds: ['ImportFrom'] },
  defaultNode: () =>
    node('ImportFrom', {
      module: 'turtle',
      names: [node('alias', { name: '*', asname: null })],
      level: { literal: 'int', value: '0' },
    }),
  decode(value) {
    const { module, names, level } = value.fields
    if (
      value.kind !== 'ImportFrom' ||
      !exact(value, ['module', 'names', 'level']) ||
      typeof module !== 'string' ||
      !nodes(names) ||
      names.length !== 1 ||
      names[0]!.fields.name !== '*' ||
      !level ||
      typeof level !== 'object' ||
      !('literal' in level) ||
      level.value !== '0'
    )
      return
    return { fields: [{ name: 'MODULE', label: '', value: module }], inputs: [] }
  },
  encode(shape) {
    const module = shape.fields.find((item) => item.name === 'MODULE')?.value.trim() ?? ''
    if (
      !/^[_\p{ID_Start}][_\p{ID_Continue}]*(\.[_\p{ID_Start}][_\p{ID_Continue}]*)*$/u.test(module)
    )
      throw new Error('Escreva o nome do módulo.')
    return node('ImportFrom', {
      module,
      names: [node('alias', { name: '*', asname: null })],
      level: { literal: 'int', value: '0' },
    })
  },
}

/** `{pontos:.1f}` inside an f-string: a value with a format. */
const formatSpecCodec: PythonBlockCodec = {
  ...metadata(
    'format_spec',
    'valor formatado',
    'Textos',
    3,
    'format',
    '{valor:formato}',
    'Põe o valor no texto com um formato: ".2f" para duas casas decimais, "03d" para três dígitos, ">10" para alinhar à direita.',
  ),
  match: { kinds: ['FormattedValue'] },
  defaultNode: () =>
    node('FormattedValue', {
      value: name('pontos'),
      conversion: { literal: 'int', value: '-1' },
      format_spec: node('JoinedStr', { values: [text('.2f')] }),
    }),
  decode(value) {
    const { conversion, format_spec } = value.fields
    if (
      value.kind !== 'FormattedValue' ||
      !exact(value, ['value', 'conversion', 'format_spec']) ||
      !isNode(value.fields.value) ||
      !conversion ||
      typeof conversion !== 'object' ||
      !('literal' in conversion) ||
      conversion.value !== '-1' ||
      !isNode(format_spec) ||
      format_spec.kind !== 'JoinedStr' ||
      !nodes(format_spec.fields.values) ||
      format_spec.fields.values.length !== 1 ||
      format_spec.fields.values[0]!.kind !== 'Constant' ||
      typeof format_spec.fields.values[0]!.fields.value !== 'string'
    )
      return
    return {
      fields: [
        { name: 'SPEC', label: 'formato', value: format_spec.fields.values[0]!.fields.value },
      ],
      inputs: [{ name: 'value', label: '', role: 'value', nodes: [value.fields.value] }],
    }
  },
  encode(shape) {
    const spec = shape.fields.find((item) => item.name === 'SPEC')?.value ?? ''
    if (!spec || /[{}]/.test(spec)) throw new Error('Escreva o formato, como .2f.')
    return node('FormattedValue', {
      value: requiredInput(shape, 'value'),
      conversion: { literal: 'int', value: '-1' },
      format_spec: node('JoinedStr', { values: [text(spec)] }),
    })
  },
}

const FILE_MODES = [
  ['ler', 'r'],
  ['escrever (apaga o que havia)', 'w'],
  ['acrescentar no fim', 'a'],
] as const

/** `with open(arquivo, modo) as nome:` — reading and saving a file, closed at the end. */
const withOpenCodec: PythonBlockCodec = {
  ...metadata(
    'with_open',
    'abrir o arquivo',
    'Entrada e saída',
    2,
    'statement',
    'with open(arquivo, modo) as nome',
    'Abre um arquivo para ler, escrever ou acrescentar, faz os comandos de dentro com ele e o fecha no fim. Escrever apaga o conteúdo anterior.',
  ),
  binding: { root: 'open' },
  match: { kinds: ['With'] },
  defaultNode: () =>
    node('With', {
      items: [
        node('withitem', {
          context_expr: call(name('open'), [text('recorde.txt'), text('r')]),
          optional_vars: name('arquivo', 'Store'),
        }),
      ],
      body: [pass()],
      type_comment: null,
    }),
  decode(value) {
    const { items, body, type_comment } = value.fields
    if (
      value.kind !== 'With' ||
      !exact(value, ['items', 'body', 'type_comment']) ||
      type_comment !== null ||
      !nodes(items) ||
      items.length !== 1 ||
      !nodes(body)
    )
      return
    const item = items[0]!
    const { context_expr: opened, optional_vars: target } = item.fields
    if (
      item.kind !== 'withitem' ||
      !isNode(opened) ||
      opened.kind !== 'Call' ||
      !isLoadName(opened.fields.func, 'open') ||
      !nodes(opened.fields.args) ||
      (opened.fields.args.length !== 1 && opened.fields.args.length !== 2) ||
      !nodes(opened.fields.keywords) ||
      opened.fields.keywords.length ||
      !isNode(target) ||
      target.kind !== 'Name' ||
      typeof target.fields.id !== 'string' ||
      !PYTHON_IDENTIFIER.test(target.fields.id)
    )
      return
    // open(arquivo) reads: the block shows the mode and gives back the same spelling.
    const omitted = opened.fields.args.length === 1
    const mode = omitted ? text('r') : opened.fields.args[1]!
    if (
      mode.kind !== 'Constant' ||
      mode.fields.kind !== null ||
      !FILE_MODES.some(([, option]) => option === mode.fields.value)
    )
      return
    return {
      fields: [
        {
          name: 'MODE',
          label: 'para',
          value: String(mode.fields.value),
          options: FILE_MODES.map(([label, option]) => [label, option] as const),
        },
        { name: 'NAME', label: 'como', value: target.fields.id },
      ],
      inputs: [
        { name: 'file', label: 'arquivo', role: 'value', nodes: [opened.fields.args[0]!] },
        statementInput('body', '', body),
      ],
      ...(omitted ? { extra: { 'mode:omitted': true } } : {}),
    }
  },
  encode(shape) {
    const mode = shape.fields.find((item) => item.name === 'MODE')?.value ?? ''
    const target = shape.fields.find((item) => item.name === 'NAME')?.value ?? ''
    if (!FILE_MODES.some(([, option]) => option === mode)) throw new Error('Escolha como abrir.')
    if (!PYTHON_IDENTIFIER.test(target)) throw new Error('Dê um nome para o arquivo aberto.')
    return node('With', {
      items: [
        node('withitem', {
          context_expr: call(
            name('open'),
            shape.extra?.['mode:omitted'] && mode === 'r'
              ? [requiredInput(shape, 'file')]
              : [requiredInput(shape, 'file'), text(mode)],
          ),
          optional_vars: name(target, 'Store'),
        }),
      ],
      body: suite(shape, 'body'),
      type_comment: null,
    })
  },
}

/** Blocks for everyday Python flow, ordered before the general structural codecs. */
export const PYTHON_FLOW_BLOCK_CODECS: readonly PythonBlockCodec[] = [
  ifCodec,
  repeatCodec,
  foreverCodec,
  simpleFunctionCodec,
  namedCall('statement'),
  namedCall('value'),
  methodCall('statement'),
  methodCall('value'),
  namesStatement('Global'),
  namesStatement('Nonlocal'),
  conditionalValueCodec,
  sliceCodec,
  listComprehensionCodec,
  assignManyCodec,
  importOneCodec,
  importAllCodec,
  formatSpecCodec,
  withOpenCodec,
]
