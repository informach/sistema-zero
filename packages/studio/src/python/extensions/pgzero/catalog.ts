import {
  optional,
  type PythonApiParam,
  type PythonApiSpec,
  pythonApiCallCodec,
  required,
} from '../../blocks/apiCallCodec'
import type { PythonBlockCodec, PythonBlockInput, PythonBlockShape } from '../../blocks/contract'
import { attribute, call, integer, isNode, name, node, nodes, pass, text } from '../../blocks/nodes'
import type { PythonProvidedBuiltin, PythonResolverOptions } from '../../blocks/scope'
import type { PythonNode } from '../../language/types'

const OWNER = 'python-pgzero' as const
const PROVIDER = 'pgzero'
const IDENTIFIER = /^[_\p{ID_Start}][_\p{ID_Continue}]*$/u

/** Names Pygame Zero gives every program (pgzero.builtins), resolved without import. */
export const PGZERO_BUILTINS: ReadonlyMap<string, PythonProvidedBuiltin> = new Map([
  ['screen', { provider: PROVIDER }],
  ['Actor', { provider: PROVIDER, constructs: 'Actor' }],
  ['Rect', { provider: PROVIDER, constructs: 'Rect' }],
  ['ZRect', { provider: PROVIDER, constructs: 'Rect' }],
  ['keyboard', { provider: PROVIDER }],
  ['keys', { provider: PROVIDER }],
  ['keymods', { provider: PROVIDER }],
  ['mouse', { provider: PROVIDER }],
  ['clock', { provider: PROVIDER }],
  ['animate', { provider: PROVIDER, constructs: 'Animation' }],
  ['images', { provider: PROVIDER }],
  ['sounds', { provider: PROVIDER }],
  ['music', { provider: PROVIDER }],
  ['tone', { provider: PROVIDER }],
  ['exit', { provider: PROVIDER }],
])
export const PGZERO_RESOLVER_OPTIONS: PythonResolverOptions = {
  builtins: PGZERO_BUILTINS,
  starExports: new Map([['pgzero.builtins', [...PGZERO_BUILTINS.keys()]]]),
}

const n = (value: number) => () => integer(String(value))
const t = (value: string) => () => text(value)
const pair = (x: number, y: number) => () =>
  node('Tuple', { elts: [integer(String(x)), integer(String(y))], ctx: node('Load') })
const exact = (value: PythonNode, keys: readonly string[]) =>
  Object.keys(value.fields).length === keys.length &&
  keys.every((key) => Object.hasOwn(value.fields, key))
const isName = (value: unknown, id?: string): value is PythonNode =>
  isNode(value as PythonNode) &&
  (value as PythonNode).kind === 'Name' &&
  typeof (value as PythonNode).fields.id === 'string' &&
  (id === undefined || (value as PythonNode).fields.id === id) &&
  isNode((value as PythonNode).fields.ctx) &&
  ((value as PythonNode).fields.ctx as PythonNode).kind === 'Load'
const field = (shape: PythonBlockShape, key: string) =>
  shape.fields.find((item) => item.name === key)?.value ?? ''
const one = (shape: PythonBlockShape, key: string) => {
  const found = shape.inputs.find((item) => item.name === key)
  if (found?.nodes.length !== 1) throw new Error('Preencha todas as entradas do bloco.')
  return found.nodes[0]!
}

type Spec = Omit<PythonApiSpec, 'owner'>
const api = (spec: Spec): PythonBlockCodec => pythonApiCallCodec({ ...spec, owner: OWNER })
const screenCall = (path: string[]) => ({
  kind: 'path' as const,
  path: ['screen', ...path],
  builtin: PROVIDER,
})
const builtinCall = (path: string[]) => ({ kind: 'path' as const, path, builtin: PROVIDER })
const actorMethod = (names: string[], any = true) => ({
  kind: 'method' as const,
  names,
  receiver: {
    label: 'ator',
    default: () => name('heroi'),
    instance: { builtin: PROVIDER, name: 'Actor' },
    ...(any ? { any: true } : {}),
  },
})

// ⚡ Quando acontecer ------------------------------------------------------------------------

interface HandlerSpec {
  name: string
  title: string
  help: string
  params: readonly (readonly [param: string, label: string])[]
  initial?: readonly string[]
  level?: 1 | 2 | 3
}
/** `def draw():`, `def on_key_down(key):`… — the functions Pygame Zero calls by name. */
function handlerCodec(spec: HandlerSpec): PythonBlockCodec {
  const allowed = spec.params.map(([param]) => param)
  const template = (params: readonly string[]) =>
    node('FunctionDef', {
      name: spec.name,
      args: node('arguments', {
        posonlyargs: [],
        args: params.map((arg) => node('arg', { arg, annotation: null, type_comment: null })),
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
    })
  return {
    id: `sz_py_pgzero_${spec.name}`,
    owner: OWNER,
    title: spec.title,
    category: 'Quando acontecer',
    level: spec.level ?? 1,
    role: 'statement',
    api: `def ${spec.name}(${allowed.join(', ')}):`,
    help: spec.help,
    starter: spec.name === 'draw' || spec.name === 'update',
    match: { kinds: ['FunctionDef'], names: [spec.name] },
    binding: { root: spec.name, handler: PROVIDER },
    controls: spec.params.map(([param, label]) => ({
      key: `${param}:present`,
      label,
      kind: 'optional' as const,
    })),
    defaultNode: () => template(spec.initial ?? []),
    decode(value) {
      const f = value.fields
      if (
        value.kind !== 'FunctionDef' ||
        f.name !== spec.name ||
        !isNode(f.args) ||
        !nodes(f.body) ||
        !nodes(f.decorator_list) ||
        f.decorator_list.length ||
        f.returns !== null ||
        f.type_comment !== null ||
        !nodes(f.type_params) ||
        f.type_params.length
      )
        return
      const a = f.args.fields
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
        !nodes(a.args)
      )
        return
      const args = a.args
      const params = args.map((arg) => arg.fields.arg)
      if (
        params.some(
          (param, index) =>
            typeof param !== 'string' ||
            !allowed.includes(param) ||
            params.indexOf(param) !== index ||
            args[index]!.fields.annotation !== null ||
            args[index]!.fields.type_comment !== null,
        )
      )
        return
      const extra: PythonBlockShape['extra'] = {}
      for (const param of allowed) extra[`${param}:present`] = params.includes(param)
      const canonical = allowed.filter((param) => params.includes(param))
      if (canonical.join(',') !== params.join(',')) extra.order = params.join(',')
      return {
        fields: [],
        inputs: [
          {
            name: 'body',
            label: params.length ? `(${params.join(', ')})` : '',
            role: 'statement',
            nodes: f.body.length === 1 && f.body[0]!.kind === 'Pass' ? [] : f.body,
          },
        ],
        extra,
      }
    },
    encode(shape) {
      const present = allowed.filter((param) => shape.extra?.[`${param}:present`] === true)
      const order = typeof shape.extra?.order === 'string' ? shape.extra.order.split(',') : []
      const params =
        order.length &&
        order.every((param) => present.includes(param)) &&
        order.length === present.length
          ? order
          : present
      const body = shape.inputs.find((item) => item.name === 'body')?.nodes ?? []
      const result = template(params)
      result.fields.body = body.length ? body : [pass()]
      return result
    },
    reshape(shape, key, value) {
      const param = key.replace(/:present$/, '')
      if (!allowed.includes(param) || typeof value !== 'boolean')
        throw new Error('Opção desconhecida do bloco Python.')
      const result = structuredClone(shape)
      result.extra = { ...result.extra, [key]: value }
      delete result.extra.order
      const present = allowed.filter((item) => result.extra?.[`${item}:present`] === true)
      result.inputs = result.inputs.map((input) =>
        input.name === 'body'
          ? { ...input, label: present.length ? `(${present.join(', ')})` : '' }
          : input,
      )
      return result
    },
  }
}

const HANDLERS: PythonBlockCodec[] = [
  handlerCodec({
    name: 'draw',
    title: '🎨 quando desenhar a tela',
    help: 'O Pygame Zero chama esta função sempre que precisa mostrar o jogo. Comece limpando a tela e depois desenhe os atores e textos.',
    params: [],
  }),
  handlerCodec({
    name: 'update',
    title: '🔁 quando atualizar o jogo',
    help: 'O Pygame Zero chama esta função cerca de 60 vezes por segundo: é aqui que os atores andam e as regras do jogo acontecem. Com dt, você recebe quantos segundos passaram desde a última vez.',
    params: [['dt', 'segundos desde a última vez (dt)']],
  }),
  handlerCodec({
    name: 'on_key_down',
    title: '⌨️ quando apertar uma tecla',
    help: 'Chamada uma vez quando uma tecla é apertada. Com key, você sabe qual foi (compare com keys.SPACE, keys.UP…); com unicode, a letra digitada.',
    params: [
      ['key', 'qual tecla (key)'],
      ['mod', 'teclas modificadoras (mod)'],
      ['unicode', 'letra digitada (unicode)'],
    ],
    initial: ['key'],
  }),
  handlerCodec({
    name: 'on_key_up',
    title: '⌨️ quando soltar uma tecla',
    help: 'Chamada quando uma tecla é solta. Com key, você sabe qual foi.',
    params: [
      ['key', 'qual tecla (key)'],
      ['mod', 'teclas modificadoras (mod)'],
    ],
    initial: ['key'],
    level: 2,
  }),
  handlerCodec({
    name: 'on_mouse_down',
    title: '🖱️ quando clicar',
    help: 'Chamada quando um botão do mouse é apertado (ou a tela é tocada). pos é o ponto (x, y) do clique; button diz qual botão.',
    params: [
      ['pos', 'posição (pos)'],
      ['button', 'botão (button)'],
    ],
    initial: ['pos'],
  }),
  handlerCodec({
    name: 'on_mouse_up',
    title: '🖱️ quando soltar o clique',
    help: 'Chamada quando o botão do mouse é solto. pos é o ponto (x, y); button diz qual botão.',
    params: [
      ['pos', 'posição (pos)'],
      ['button', 'botão (button)'],
    ],
    initial: ['pos'],
    level: 2,
  }),
  handlerCodec({
    name: 'on_mouse_move',
    title: '🖱️ quando mexer o mouse',
    help: 'Chamada quando o mouse se move. pos é a nova posição; rel é quanto ele andou (dx, dy); buttons diz quais botões estão apertados.',
    params: [
      ['pos', 'posição (pos)'],
      ['rel', 'quanto andou (rel)'],
      ['buttons', 'botões apertados (buttons)'],
    ],
    initial: ['pos'],
    level: 2,
  }),
  handlerCodec({
    name: 'on_music_end',
    title: '🎵 quando a música acabar',
    help: 'Chamada quando uma música tocada com music.play_once termina.',
    params: [],
    level: 3,
  }),
]

// 🖥️ Janela ---------------------------------------------------------------------------------

function windowConstant(
  constant: 'WIDTH' | 'HEIGHT' | 'TITLE',
  title: string,
  value: () => PythonNode,
  help: string,
): PythonBlockCodec {
  return {
    id: `sz_py_pgzero_${constant.toLowerCase()}`,
    owner: OWNER,
    title,
    category: 'Janela',
    level: 1,
    role: 'statement',
    api: `${constant} = …`,
    help,
    starter: constant !== 'TITLE',
    match: { kinds: ['Assign'] },
    binding: { root: constant, handler: PROVIDER },
    defaultNode: () =>
      node('Assign', { targets: [name(constant, 'Store')], value: value(), type_comment: null }),
    decode(value) {
      const { targets, type_comment } = value.fields
      if (
        value.kind !== 'Assign' ||
        !exact(value, ['targets', 'value', 'type_comment']) ||
        type_comment !== null ||
        !nodes(targets) ||
        targets.length !== 1 ||
        targets[0]!.kind !== 'Name' ||
        targets[0]!.fields.id !== constant ||
        !isNode(value.fields.value)
      )
        return
      return {
        fields: [],
        inputs: [{ name: 'value', label: '', role: 'value', nodes: [value.fields.value] }],
      }
    },
    encode(shape) {
      return node('Assign', {
        targets: [name(constant, 'Store')],
        value: one(shape, 'value'),
        type_comment: null,
      })
    },
  }
}

// Choice attributes: keyboard.space, keys.UP, mouse.LEFT, heroi.x ----------------------------

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('')
const KEYBOARD_KEYS: readonly (readonly [string, string])[] = [
  ['←', 'left'],
  ['→', 'right'],
  ['↑', 'up'],
  ['↓', 'down'],
  ['espaço', 'space'],
  ['enter', 'return'],
  ['esc', 'escape'],
  ['shift esquerdo', 'lshift'],
  ['shift direito', 'rshift'],
  ['ctrl esquerdo', 'lctrl'],
  ['tab', 'tab'],
  ['apagar', 'backspace'],
  ...LETTERS.map((letter) => [letter.toUpperCase(), letter] as const),
  ...Array.from({ length: 10 }, (_, digit) => [String(digit), `k_${digit}`] as const),
]
const KEY_CONSTANTS: readonly (readonly [string, string])[] = KEYBOARD_KEYS.map(
  ([label, value]) => [label, value.toUpperCase()] as const,
)
const MOUSE_BUTTONS: readonly (readonly [string, string])[] = [
  ['esquerdo', 'LEFT'],
  ['do meio', 'MIDDLE'],
  ['direito', 'RIGHT'],
  ['rodinha para cima', 'WHEEL_UP'],
  ['rodinha para baixo', 'WHEEL_DOWN'],
]
export const PGZERO_ACTOR_PROPERTIES: readonly (readonly [string, string])[] = [
  ['x', 'x'],
  ['y', 'y'],
  ['posição (pos)', 'pos'],
  ['ângulo', 'angle'],
  ['imagem', 'image'],
  ['esquerda', 'left'],
  ['direita', 'right'],
  ['topo', 'top'],
  ['base', 'bottom'],
  ['centro', 'center'],
  ['centro x', 'centerx'],
  ['centro y', 'centery'],
  ['canto superior esquerdo', 'topleft'],
  ['meio de cima', 'midtop'],
  ['meio de baixo', 'midbottom'],
  ['largura', 'width'],
  ['altura', 'height'],
  ['âncora', 'anchor'],
]

/** `root.CHOICE` for a provided root, with the choice as a dropdown. */
function choiceAttribute(options: {
  id: string
  root: string
  title: string
  category: string
  level: 1 | 2 | 3
  help: string
  api: string
  choices: readonly (readonly [string, string])[]
  initial: string
  contexts?: readonly string[]
}): PythonBlockCodec {
  const values = new Set(options.choices.map(([, value]) => value))
  return {
    id: options.id,
    owner: OWNER,
    title: options.title,
    category: options.category,
    level: options.level,
    role: 'value',
    api: options.api,
    help: options.help,
    match: { kinds: ['Attribute'], names: [...values] },
    binding: { root: options.root, builtin: PROVIDER },
    defaultNode: () => attribute(name(options.root), options.initial),
    decode(value) {
      const { value: object, attr, ctx } = value.fields
      if (
        value.kind !== 'Attribute' ||
        !exact(value, ['value', 'attr', 'ctx']) ||
        !isName(object, options.root) ||
        typeof attr !== 'string' ||
        !values.has(attr) ||
        !isNode(ctx) ||
        ctx.kind !== 'Load'
      )
        return
      return {
        fields: [{ name: 'CHOICE', label: '', value: attr, options: options.choices }],
        inputs: [],
      }
    },
    encode(shape) {
      const choice = field(shape, 'CHOICE')
      if (!values.has(choice)) throw new Error('Escolha uma opção da lista.')
      return attribute(name(options.root), choice)
    },
  }
}

/** `keyboard[keys.SPACE]` */
const keyboardIndexCodec: PythonBlockCodec = {
  id: 'sz_py_pgzero_keyboard_index',
  owner: OWNER,
  title: 'a tecla está apertada:',
  category: 'Teclado e mouse',
  level: 2,
  role: 'value',
  api: 'keyboard[keys.X]',
  help: 'Verdadeiro enquanto a tecla escolhida estiver apertada (o mesmo que keyboard.x, escrito com keys).',
  match: { kinds: ['Subscript'] },
  binding: { root: 'keyboard', builtin: PROVIDER },
  defaultNode: () =>
    node('Subscript', {
      value: name('keyboard'),
      slice: attribute(name('keys'), 'SPACE'),
      ctx: node('Load'),
    }),
  decode(value) {
    const { slice, ctx } = value.fields
    if (
      value.kind !== 'Subscript' ||
      !exact(value, ['value', 'slice', 'ctx']) ||
      !isName(value.fields.value, 'keyboard') ||
      !isNode(ctx) ||
      ctx.kind !== 'Load' ||
      !isNode(slice) ||
      slice.kind !== 'Attribute' ||
      !isName(slice.fields.value, 'keys') ||
      typeof slice.fields.attr !== 'string' ||
      !KEY_CONSTANTS.some(([, key]) => key === slice.fields.attr)
    )
      return
    return {
      fields: [{ name: 'KEY', label: '', value: slice.fields.attr, options: KEY_CONSTANTS }],
      inputs: [],
    }
  },
  encode(shape) {
    const key = field(shape, 'KEY')
    if (!KEY_CONSTANTS.some(([, value]) => value === key)) throw new Error('Escolha uma tecla.')
    return node('Subscript', {
      value: name('keyboard'),
      slice: attribute(name('keys'), key),
      ctx: node('Load'),
    })
  },
}

/** `heroi.x` (read, or as the place to store in "guardar"). */
const actorPropertyCodec: PythonBlockCodec = {
  id: 'sz_py_pgzero_actor_property',
  owner: OWNER,
  title: 'do ator',
  category: 'Atores',
  level: 1,
  role: 'value',
  api: 'ator.x / ator.pos / ator.angle…',
  help: 'Uma propriedade do ator: posição (x, y, pos), bordas (left, right, top, bottom), ângulo, imagem ou tamanho. Use em "guardar" para mudar: guardar 100 em heroi.x.',
  match: {
    kinds: ['Attribute'],
    names: PGZERO_ACTOR_PROPERTIES.map(([, value]) => value),
  },
  bindingFor(value) {
    const object = value.fields.value
    return isName(object)
      ? { root: object.fields.id as string, builtin: PROVIDER, instance: 'Actor' }
      : undefined
  },
  defaultNode: () => attribute(name('heroi'), 'x'),
  decode(value) {
    const { value: object, attr, ctx } = value.fields
    if (
      value.kind !== 'Attribute' ||
      !exact(value, ['value', 'attr', 'ctx']) ||
      !isNode(object) ||
      typeof attr !== 'string' ||
      !PGZERO_ACTOR_PROPERTIES.some(([, key]) => key === attr) ||
      !isNode(ctx) ||
      !['Load', 'Store', 'Del'].includes(ctx.kind)
    )
      return
    return {
      fields: [{ name: 'PROPERTY', label: '', value: attr, options: PGZERO_ACTOR_PROPERTIES }],
      inputs: [{ name: 'actor', label: '', role: 'value', nodes: [object] }],
      extra: { context: ctx.kind },
    }
  },
  encode(shape) {
    const property = field(shape, 'PROPERTY')
    if (!PGZERO_ACTOR_PROPERTIES.some(([, value]) => value === property))
      throw new Error('Escolha uma propriedade do ator.')
    const context = String(shape.extra?.context ?? 'Load')
    if (!['Load', 'Store', 'Del'].includes(context)) throw new Error('Destino Python inválido.')
    return node('Attribute', { value: one(shape, 'actor'), attr: property, ctx: node(context) })
  },
}

// sounds.pulo.play(), images.mapa.get_at((x, y)) ----------------------------------------------

function resourceCall(options: {
  id: string
  root: 'sounds' | 'images'
  method: string
  title: string
  category: string
  level: 1 | 2 | 3
  role: 'statement' | 'value'
  help: string
  initial: string
  params?: readonly PythonApiParam[]
}): PythonBlockCodec {
  const params = options.params ?? []
  const statement = options.role === 'statement'
  const build = (resource: string, args: PythonNode[]) => {
    const value = call(attribute(attribute(name(options.root), resource), options.method), args)
    return statement ? node('Expr', { value }) : value
  }
  return {
    id: options.id,
    owner: OWNER,
    title: options.title,
    category: options.category,
    level: options.level,
    role: options.role,
    api: `${options.root}.nome.${options.method}(${params.map((param) => param.name).join(', ')})`,
    help: options.help,
    match: { kinds: [statement ? 'Expr' : 'Call'], names: [options.method] },
    binding: { root: options.root, builtin: PROVIDER },
    defaultNode: () =>
      build(
        options.initial,
        params.map((param) => param.default()),
      ),
    decode(value) {
      const target = statement ? value.fields.value : value
      if (statement && (value.kind !== 'Expr' || !exact(value, ['value']))) return
      if (!isNode(target) || target.kind !== 'Call' || !exact(target, ['func', 'args', 'keywords']))
        return
      const { func, args, keywords } = target.fields
      if (
        !isNode(func) ||
        func.kind !== 'Attribute' ||
        func.fields.attr !== options.method ||
        !isNode(func.fields.value) ||
        func.fields.value.kind !== 'Attribute' ||
        !isName(func.fields.value.fields.value, options.root) ||
        typeof func.fields.value.fields.attr !== 'string' ||
        !nodes(args) ||
        args.length !== params.length ||
        args.some((arg) => arg.kind === 'Starred') ||
        !nodes(keywords) ||
        keywords.length
      )
        return
      return {
        fields: [{ name: 'NAME', label: '', value: func.fields.value.fields.attr }],
        inputs: args.map(
          (arg, index): PythonBlockInput => ({
            name: params[index]!.name,
            label: params[index]!.label,
            role: 'value',
            nodes: [arg],
          }),
        ),
      }
    },
    encode(shape) {
      const resource = field(shape, 'NAME').trim()
      if (!IDENTIFIER.test(resource))
        throw new Error(`Escreva o nome do arquivo em ${options.root}/ sem a extensão.`)
      return build(
        resource,
        params.map((param) => one(shape, param.name)),
      )
    },
  }
}

// The catalog, in palette order --------------------------------------------------------------

const color = (value: string) => t(value)
const TEXT_PARAMS: PythonApiParam[] = [
  required('text', '', t('Pontos: 0')),
  { ...optional('pos', 'na posição', pair(10, 10)), initial: false },
  { ...optional('topleft', 'canto de cima à esquerda', pair(10, 10), 'kw'), initial: true },
  optional('center', 'com o centro em', pair(400, 300), 'kw'),
  optional('midtop', 'com o meio de cima em', pair(400, 20), 'kw'),
  optional('topright', 'canto de cima à direita', pair(790, 10), 'kw'),
  optional('midbottom', 'com o meio de baixo em', pair(400, 590), 'kw'),
  optional('bottomleft', 'canto de baixo à esquerda', pair(10, 590), 'kw'),
  optional('bottomright', 'canto de baixo à direita', pair(790, 590), 'kw'),
  { ...optional('fontsize', 'tamanho', n(40), 'kw'), initial: true },
  { ...optional('color', 'cor', color('white'), 'kw'), initial: true },
  optional('fontname', 'fonte (pasta fonts/)', t('minha_fonte'), 'kw'),
  optional(
    'owidth',
    'contorno',
    () =>
      node('Constant', { value: { literal: 'float', value: '0x1.8000000000000p+0' }, kind: null }),
    'kw',
  ),
  optional('ocolor', 'cor do contorno', color('black'), 'kw'),
  optional('shadow', 'sombra (dx, dy)', pair(1, 1), 'kw'),
  optional('scolor', 'cor da sombra', color('black'), 'kw'),
  optional('gcolor', 'cor do degradê', color('yellow'), 'kw'),
  optional('background', 'fundo', color('black'), 'kw'),
  optional(
    'alpha',
    'opacidade',
    () =>
      node('Constant', { value: { literal: 'float', value: '0x1.0000000000000p-1' }, kind: null }),
    'kw',
  ),
  optional('angle', 'ângulo', n(15), 'kw'),
  optional('width', 'largura máxima', n(300), 'kw'),
  optional(
    'lineheight',
    'altura da linha',
    () =>
      node('Constant', { value: { literal: 'float', value: '0x1.8000000000000p+0' }, kind: null }),
    'kw',
  ),
  optional('align', 'alinhar', t('center'), 'kw'),
]

export const PYTHON_PGZERO_CODECS: readonly PythonBlockCodec[] = [
  ...HANDLERS,
  // 🧍 Atores
  api({
    id: 'sz_py_pgzero_actor',
    title: 'novo ator com a imagem',
    category: 'Atores',
    level: 1,
    role: 'value',
    starter: true,
    callee: builtinCall(['Actor']),
    api: "Actor('imagem', pos, anchor=…)",
    help: 'Cria um ator: um personagem com uma imagem da pasta images/ (escreva o nome sem .png). Guarde numa variável, como heroi.',
    params: [
      required('image', '', t('alien')),
      { ...optional('pos', 'na posição', pair(100, 100), 'pos'), initial: true },
      optional('anchor', 'âncora', () =>
        node('Tuple', { elts: [text('center'), text('bottom')], ctx: node('Load') }),
      ),
      optional('center', 'com o centro em', pair(100, 100), 'kw'),
      optional('topleft', 'com o canto de cima à esquerda em', pair(0, 0), 'kw'),
      optional('midbottom', 'com o meio de baixo em', pair(100, 100), 'kw'),
      optional('midtop', 'com o meio de cima em', pair(100, 0), 'kw'),
      optional('bottomleft', 'com o canto de baixo à esquerda em', pair(0, 100), 'kw'),
    ],
    dependencies: ['sz_py_assign', 'sz_py_pgzero_actor_draw'],
  }),
  api({
    id: 'sz_py_pgzero_actor_draw',
    title: 'desenhar o ator',
    category: 'Atores',
    level: 1,
    role: 'statement',
    starter: true,
    callee: actorMethod(['draw'], false),
    api: 'ator.draw()',
    help: 'Desenha o ator na tela, na posição e no ângulo atuais. Use dentro de "quando desenhar a tela".',
    params: [],
  }),
  actorPropertyCodec,
  api({
    id: 'sz_py_pgzero_distance_to',
    title: 'distância do ator até',
    category: 'Atores',
    level: 2,
    role: 'value',
    callee: actorMethod(['distance_to']),
    api: 'ator.distance_to(alvo)',
    help: 'Quantos pixels há entre o ator e outro ator (ou um ponto (x, y)).',
    params: [required('target', '', () => name('alvo'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_angle_to',
    title: 'ângulo do ator até',
    category: 'Atores',
    level: 2,
    role: 'value',
    callee: actorMethod(['angle_to']),
    api: 'ator.angle_to(alvo)',
    help: 'O ângulo (em graus) para o ator apontar para outro ator ou ponto. 0 é para a direita, 90 é para cima.',
    params: [required('target', '', () => name('alvo'), 'pos')],
  }),
  // 🎨 Desenhar
  api({
    id: 'sz_py_pgzero_screen_clear',
    title: 'limpar a tela',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    starter: true,
    callee: screenCall(['clear']),
    api: 'screen.clear()',
    help: 'Pinta a tela inteira de preto. Comece "quando desenhar a tela" com ele.',
    params: [],
  }),
  api({
    id: 'sz_py_pgzero_screen_fill',
    title: 'pintar a tela de',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    starter: true,
    callee: screenCall(['fill']),
    api: 'screen.fill(cor)',
    help: 'Pinta a tela inteira com uma cor: um nome em inglês ("sky blue"), "#ff8800" ou (vermelho, verde, azul).',
    params: [required('color', '', color('sky blue'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_screen_blit',
    title: 'desenhar a imagem',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    callee: screenCall(['blit']),
    api: "screen.blit('imagem', (x, y))",
    help: 'Desenha uma imagem da pasta images/ com o canto de cima à esquerda no ponto escolhido. Ótimo para o fundo: (0, 0).',
    params: [required('image', '', t('fundo'), 'pos'), required('pos', 'em', pair(0, 0), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_draw_text',
    title: 'escrever',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    starter: true,
    callee: screenCall(['draw', 'text']),
    api: 'screen.draw.text(texto, topleft=…, fontsize=…, color=…)',
    help: 'Escreve um texto na tela. Escolha onde (canto, centro…), o tamanho e a cor; pelo "+" você acha contorno, sombra, degradê e mais.',
    params: TEXT_PARAMS,
  }),
  api({
    id: 'sz_py_pgzero_draw_textbox',
    title: 'escrever dentro da caixa',
    category: 'Desenhar',
    level: 2,
    role: 'statement',
    callee: screenCall(['draw', 'textbox']),
    api: 'screen.draw.textbox(texto, Rect(…))',
    help: 'Escreve o texto do maior tamanho que couber dentro do retângulo, quebrando as linhas. Bom para perguntas e respostas.',
    params: [
      required('text', '', t('Qual é a resposta?')),
      required(
        'rect',
        'na caixa',
        () => call(name('Rect'), [integer('50'), integer('50'), integer('300'), integer('100')]),
        'pos',
      ),
      optional('color', 'cor', color('white'), 'kw'),
      optional('align', 'alinhar', t('center'), 'kw'),
      optional('fontname', 'fonte (pasta fonts/)', t('minha_fonte'), 'kw'),
      optional('owidth', 'contorno', n(1), 'kw'),
      optional('ocolor', 'cor do contorno', color('black'), 'kw'),
    ],
    dependencies: ['sz_py_pgzero_rect'],
  }),
  api({
    id: 'sz_py_pgzero_draw_line',
    title: 'desenhar linha de',
    category: 'Desenhar',
    level: 2,
    role: 'statement',
    callee: screenCall(['draw', 'line']),
    api: 'screen.draw.line(início, fim, cor)',
    help: 'Uma linha fina entre dois pontos (x, y).',
    params: [
      required('start', '', pair(0, 0), 'pos'),
      required('end', 'até', pair(100, 100), 'pos'),
      required('color', 'cor', color('white'), 'pos'),
    ],
  }),
  api({
    id: 'sz_py_pgzero_draw_filled_rect',
    title: 'desenhar retângulo cheio',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    callee: screenCall(['draw', 'filled_rect']),
    api: 'screen.draw.filled_rect(Rect(…), cor)',
    help: 'Um retângulo pintado por dentro. Rect(x, y, largura, altura).',
    params: [
      required(
        'rect',
        '',
        () => call(name('Rect'), [integer('10'), integer('10'), integer('100'), integer('50')]),
        'pos',
      ),
      required('color', 'cor', color('red'), 'pos'),
    ],
    dependencies: ['sz_py_pgzero_rect'],
  }),
  api({
    id: 'sz_py_pgzero_draw_rect',
    title: 'desenhar contorno de retângulo',
    category: 'Desenhar',
    level: 2,
    role: 'statement',
    callee: screenCall(['draw', 'rect']),
    api: 'screen.draw.rect(Rect(…), cor)',
    help: 'Só a borda de um retângulo. Rect(x, y, largura, altura).',
    params: [
      required(
        'rect',
        '',
        () => call(name('Rect'), [integer('10'), integer('10'), integer('100'), integer('50')]),
        'pos',
      ),
      required('color', 'cor', color('white'), 'pos'),
    ],
    dependencies: ['sz_py_pgzero_rect'],
  }),
  api({
    id: 'sz_py_pgzero_draw_filled_circle',
    title: 'desenhar círculo cheio em',
    category: 'Desenhar',
    level: 1,
    role: 'statement',
    callee: screenCall(['draw', 'filled_circle']),
    api: 'screen.draw.filled_circle((x, y), raio, cor)',
    help: 'Um círculo pintado por dentro, com o centro no ponto (x, y).',
    params: [
      required('pos', '', pair(100, 100), 'pos'),
      required('radius', 'raio', n(20), 'pos'),
      required('color', 'cor', color('yellow'), 'pos'),
    ],
  }),
  api({
    id: 'sz_py_pgzero_draw_circle',
    title: 'desenhar contorno de círculo em',
    category: 'Desenhar',
    level: 2,
    role: 'statement',
    callee: screenCall(['draw', 'circle']),
    api: 'screen.draw.circle((x, y), raio, cor)',
    help: 'Só a borda de um círculo, com o centro no ponto (x, y).',
    params: [
      required('pos', '', pair(100, 100), 'pos'),
      required('radius', 'raio', n(20), 'pos'),
      required('color', 'cor', color('white'), 'pos'),
    ],
  }),
  // ⌨️ Teclado e mouse
  choiceAttribute({
    id: 'sz_py_pgzero_keyboard',
    root: 'keyboard',
    title: 'a tecla está apertada:',
    category: 'Teclado e mouse',
    level: 1,
    help: 'Verdadeiro enquanto a tecla estiver apertada. Use em "se", dentro de "quando atualizar o jogo", para mover um ator.',
    api: 'keyboard.space / keyboard.left…',
    choices: KEYBOARD_KEYS,
    initial: 'right',
  }),
  keyboardIndexCodec,
  choiceAttribute({
    id: 'sz_py_pgzero_keys',
    root: 'keys',
    title: 'a tecla',
    category: 'Teclado e mouse',
    level: 1,
    help: 'Uma tecla, para comparar com key em "quando apertar uma tecla": key = keys.SPACE.',
    api: 'keys.SPACE / keys.UP…',
    choices: KEY_CONSTANTS,
    initial: 'SPACE',
  }),
  choiceAttribute({
    id: 'sz_py_pgzero_mouse',
    root: 'mouse',
    title: 'o botão',
    category: 'Teclado e mouse',
    level: 2,
    help: 'Um botão do mouse, para comparar com button em "quando clicar": button = mouse.LEFT.',
    api: 'mouse.LEFT / mouse.RIGHT…',
    choices: MOUSE_BUTTONS,
    initial: 'LEFT',
  }),
  // 💥 Colisões
  api({
    id: 'sz_py_pgzero_colliderect',
    title: 'está encostando em',
    category: 'Colisões',
    level: 1,
    role: 'value',
    starter: true,
    callee: actorMethod(['colliderect']),
    api: 'ator.colliderect(outro)',
    help: 'Verdadeiro quando o retângulo do ator encosta no de outro ator (ou de um Rect).',
    params: [required('rect', '', () => name('moeda'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_collidepoint',
    title: 'está sobre o ponto',
    category: 'Colisões',
    level: 1,
    role: 'value',
    callee: actorMethod(['collidepoint']),
    api: 'ator.collidepoint(pos)',
    help: 'Verdadeiro quando o ponto (x, y) está dentro do ator. Ótimo com pos de "quando clicar".',
    params: [],
    variadic: { label: 'ponto', minimum: 1, defaults: () => [name('pos')] },
  }),
  api({
    id: 'sz_py_pgzero_collidelist',
    title: 'encosta em qual da lista',
    category: 'Colisões',
    level: 2,
    role: 'value',
    callee: actorMethod(['collidelist']),
    api: 'ator.collidelist(lista)',
    help: 'A posição do primeiro item da lista em que o ator encosta, ou -1 se não encosta em nenhum.',
    params: [required('rects', '', () => name('paredes'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_rect',
    title: 'retângulo',
    category: 'Colisões',
    level: 1,
    role: 'value',
    callee: builtinCall(['Rect']),
    api: 'Rect(x, y, largura, altura)',
    help: 'Um retângulo: canto de cima à esquerda (x, y), largura e altura. Serve para desenhar e para colisões.',
    params: [],
    variadic: {
      label: 'medida',
      minimum: 1,
      defaults: () => [integer('0'), integer('0'), integer('100'), integer('50')],
    },
  }),
  // 🖥️ Janela
  windowConstant(
    'WIDTH',
    'largura da janela =',
    n(800),
    'A largura da tela do jogo, em pixels. Escreva no começo do programa.',
  ),
  windowConstant(
    'HEIGHT',
    'altura da janela =',
    n(600),
    'A altura da tela do jogo, em pixels. Escreva no começo do programa.',
  ),
  windowConstant('TITLE', 'título da janela =', t('Meu jogo'), 'O nome do jogo.'),
  api({
    id: 'sz_py_pgzero_go',
    title: 'começar o jogo',
    category: 'Janela',
    level: 2,
    role: 'statement',
    callee: { kind: 'module', module: 'pgzrun', names: ['go'] },
    api: 'pgzrun.go()',
    help: 'No fim do programa, com "usar o módulo pgzrun" no começo: assim o jogo também roda direto no Python do computador.',
    params: [],
    dependencies: ['sz_py_import_one'],
  }),
  api({
    id: 'sz_py_pgzero_exit',
    title: 'terminar o jogo',
    category: 'Janela',
    level: 2,
    role: 'statement',
    callee: builtinCall(['exit']),
    api: 'exit()',
    help: 'Fecha o jogo.',
    params: [],
  }),
  // ⏰ Relógio
  ...(
    [
      [
        'schedule',
        'chamar uma vez depois de',
        'Chama a função uma vez, depois do tempo em segundos.',
        1,
      ],
      [
        'schedule_interval',
        'chamar sempre a cada',
        'Chama a função de novo e de novo, a cada tantos segundos.',
        1,
      ],
      [
        'schedule_unique',
        'chamar uma vez (sem repetir) depois de',
        'Como "chamar uma vez", mas se a função já estava agendada, o tempo recomeça.',
        2,
      ],
    ] as const
  ).map(([method, title, help, level]) =>
    api({
      id: `sz_py_pgzero_clock_${method}`,
      title,
      category: 'Relógio',
      level,
      role: 'statement',
      callee: builtinCall(['clock', method]),
      api: `clock.${method}(função, segundos)`,
      help: `${help} Use o nome da função, sem parênteses.`,
      params: [
        required('callback', 'a função', () => name('mudar'), 'pos'),
        required('delay', 'segundos', n(1), 'pos'),
      ],
      dependencies: ['sz_py_def'],
    }),
  ),
  api({
    id: 'sz_py_pgzero_clock_unschedule',
    title: 'cancelar o agendamento de',
    category: 'Relógio',
    level: 2,
    role: 'statement',
    callee: builtinCall(['clock', 'unschedule']),
    api: 'clock.unschedule(função)',
    help: 'Tira a função da agenda do relógio.',
    params: [required('callback', '', () => name('mudar'), 'pos')],
  }),
  // 🎞️ Animação
  ...(['statement', 'value'] as const).map((role) =>
    api({
      id: role === 'statement' ? 'sz_py_pgzero_animate' : 'sz_py_pgzero_animate_value',
      title: 'animar',
      category: 'Animação',
      level: 2,
      role,
      ...(role === 'value' ? { hidden: true } : {}),
      callee: builtinCall(['animate']),
      api: "animate(ator, tween='linear', duration=1, on_finished=…, pos=…)",
      help: 'Move o ator suavemente até o destino durante a duração (em segundos). tween escolhe o jeito: linear, accelerate, decelerate, bounce_end, elastic_end…',
      params: [
        required('object', '', () => name('heroi'), 'pos'),
        { ...optional('pos', 'até a posição', pair(400, 300), 'kw'), initial: true },
        optional('x', 'até x', n(400), 'kw'),
        optional('y', 'até y', n(300), 'kw'),
        optional('angle', 'até o ângulo', n(360), 'kw'),
        optional('topleft', 'até o canto de cima à esquerda', pair(0, 0), 'kw'),
        optional('center', 'até o centro', pair(400, 300), 'kw'),
        optional('tween', 'jeito', t('accelerate'), 'kw'),
        { ...optional('duration', 'em segundos', n(1), 'kw'), initial: true },
        optional('on_finished', 'ao terminar, chamar', () => name('chegou'), 'kw'),
      ],
    }),
  ),
  // `animacao = animate(...)` keeps the animation: it can be stopped before it ends.
  api({
    id: 'sz_py_pgzero_animation_stop',
    title: 'parar a animação',
    category: 'Animação',
    level: 3,
    role: 'statement',
    callee: {
      kind: 'method',
      names: ['stop'],
      receiver: {
        label: 'animação',
        default: () => name('animacao'),
        instance: { builtin: PROVIDER, name: 'Animation' },
      },
    },
    api: 'animacao.stop()',
    help: 'Para a animação onde ela estiver. Guarde a animação numa variável (animacao = animate(...)) para poder pará-la.',
    dependencies: ['sz_py_assign', 'sz_py_pgzero_animate'],
    params: [],
  }),
  // 🔊 Sons e música
  resourceCall({
    id: 'sz_py_pgzero_sound_play',
    root: 'sounds',
    method: 'play',
    title: '🔊 tocar o som',
    category: 'Sons e música',
    level: 1,
    role: 'statement',
    help: 'Toca um som da pasta sounds/ (escreva o nome do arquivo sem .wav).',
    initial: 'pulo',
  }),
  resourceCall({
    id: 'sz_py_pgzero_sound_stop',
    root: 'sounds',
    method: 'stop',
    title: '🔇 parar o som',
    category: 'Sons e música',
    level: 2,
    role: 'statement',
    help: 'Para o som, se ele estiver tocando.',
    initial: 'pulo',
  }),
  api({
    id: 'sz_py_pgzero_music_play',
    title: '🎵 tocar a música',
    category: 'Sons e música',
    level: 1,
    role: 'statement',
    callee: builtinCall(['music', 'play']),
    api: "music.play('nome')",
    help: 'Toca uma música da pasta music/ (MP3 ou OGG) sem parar.',
    params: [required('name', '', t('tema'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_music_play_once',
    title: '🎵 tocar a música uma vez',
    category: 'Sons e música',
    level: 2,
    role: 'statement',
    callee: builtinCall(['music', 'play_once']),
    api: "music.play_once('nome')",
    help: 'Toca uma música da pasta music/ uma vez só.',
    params: [required('name', '', t('vitoria'), 'pos')],
  }),
  api({
    id: 'sz_py_pgzero_music_stop',
    title: '🎵 parar a música',
    category: 'Sons e música',
    level: 1,
    role: 'statement',
    callee: builtinCall(['music', 'stop']),
    api: 'music.stop()',
    help: 'Para a música.',
    params: [],
  }),
  api({
    id: 'sz_py_pgzero_music_volume',
    title: '🎵 volume da música',
    category: 'Sons e música',
    level: 2,
    role: 'statement',
    callee: builtinCall(['music', 'set_volume']),
    api: 'music.set_volume(0.5)',
    help: 'Volume da música, de 0 (mudo) a 1 (máximo).',
    params: [
      required(
        'volume',
        '',
        () =>
          node('Constant', {
            value: { literal: 'float', value: '0x1.0000000000000p-1' },
            kind: null,
          }),
        'pos',
      ),
    ],
  }),
  // 🖼️ Imagens
  resourceCall({
    id: 'sz_py_pgzero_image_get_at',
    root: 'images',
    method: 'get_at',
    title: 'cor do ponto da imagem',
    category: 'Imagens',
    level: 3,
    role: 'value',
    help: 'A cor (vermelho, verde, azul, opacidade) do ponto (x, y) de uma imagem. Use com imagens-mapa: pinte as paredes de uma cor e pergunte a cor do lugar.',
    initial: 'mapa',
    params: [required('pos', 'no ponto', pair(10, 10), 'pos')],
  }),
  resourceCall({
    id: 'sz_py_pgzero_image_width',
    root: 'images',
    method: 'get_width',
    title: 'largura da imagem',
    category: 'Imagens',
    level: 2,
    role: 'value',
    help: 'Quantos pixels de largura a imagem tem.',
    initial: 'fundo',
  }),
  resourceCall({
    id: 'sz_py_pgzero_image_height',
    root: 'images',
    method: 'get_height',
    title: 'altura da imagem',
    category: 'Imagens',
    level: 2,
    role: 'value',
    help: 'Quantos pixels de altura a imagem tem.',
    initial: 'fundo',
  }),
]
