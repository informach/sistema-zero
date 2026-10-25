import { type PythonApiParam, pythonApiCallCodec, required } from '../../blocks/apiCallCodec'
import type { PythonBlockCodec, PythonBlockInput, PythonBlockShape } from '../../blocks/contract'
import { pythonFloatToHex } from '../../blocks/float'
import { attribute, call, integer, isNode, name, node, nodes, pass, text } from '../../blocks/nodes'
import type { PythonResolverOptions } from '../../blocks/scope'
import type { PythonNode } from '../../language/types'
import { PYRAY_EXPORTS } from './pyrayExports.generated'

/**
 * The blocks both Raylib extensions offer: window and game loop, shapes, images, text, keyboard
 * and mouse, 2D collisions, vectors, 2D camera, sound, colours and advanced drawing. Raylib 2D
 * and Raylib 3D are independent for the learner, so each one gets its own copy of these blocks
 * (own owner and ids), made by this one factory.
 *
 * Every block is plain pyray: the Bridge shows `draw_circle(400, 225, 50, RED)`, the same code
 * that runs with `pip install raylib` on the desktop.
 */
export type RaylibOwner = 'python-raylib-2d' | 'python-raylib-3d'
const MODULE = 'pyray'

export const RAYLIB_MODULE = MODULE
export const RAYLIB_RESOLVER_OPTIONS: PythonResolverOptions = {
  starExports: new Map([[MODULE, PYRAY_EXPORTS]]),
}

// Default values -----------------------------------------------------------------------------
export const n = (value: number) => () =>
  value < 0
    ? node('UnaryOp', { op: node('USub'), operand: integer(String(-value)) })
    : integer(String(value))
export const d = (value: number) => () =>
  node('Constant', { value: { literal: 'float', value: pythonFloatToHex(value) }, kind: null })
export const s = (value: string) => () => text(value)
export const id = (value: string) => () => name(value)
export const ctor =
  (type: string, ...values: (() => PythonNode)[]) =>
  () =>
    call(
      name(type),
      values.map((value) => value()),
    )
const v2 = (x: number, y: number) => ctor('Vector2', n(x), n(y))
const rect = (x: number, y: number, w: number, h: number) =>
  ctor('Rectangle', n(x), n(y), n(w), n(h))
export const p = (paramName: string, label: string, value: () => PythonNode): PythonApiParam =>
  required(paramName, label, value, 'pos')

interface Call {
  fn: string
  title: string
  category: string
  level: 1 | 2 | 3
  role: 'statement' | 'value'
  help: string
  params?: readonly PythonApiParam[]
  starter?: boolean
  dependencies?: readonly string[]
}

export const exact = (value: PythonNode, keys: readonly string[]) =>
  Object.keys(value.fields).length === keys.length &&
  keys.every((key) => Object.hasOwn(value.fields, key))
export const isLoadName = (value: unknown, expected?: string): value is PythonNode =>
  isNode(value as PythonNode) &&
  (value as PythonNode).kind === 'Name' &&
  typeof (value as PythonNode).fields.id === 'string' &&
  (expected === undefined || (value as PythonNode).fields.id === expected) &&
  isNode((value as PythonNode).fields.ctx) &&
  ((value as PythonNode).fields.ctx as PythonNode).kind === 'Load'
export const field = (shape: PythonBlockShape, key: string) =>
  shape.fields.find((item) => item.name === key)?.value ?? ''
export const one = (shape: PythonBlockShape, key: string) => {
  const found = shape.inputs.find((item) => item.name === key)
  if (found?.nodes.length !== 1) throw new Error('Preencha todas as entradas do bloco.')
  return found.nodes[0]!
}
const statementInput = (key: string, body: PythonNode[]): PythonBlockInput => ({
  name: key,
  label: '',
  role: 'statement',
  nodes: body.length === 1 && body[0]!.kind === 'Pass' ? [] : body,
})

// Choices ----------------------------------------------------------------------------------
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const RAYLIB_KEYS: readonly (readonly [string, string])[] = [
  ['→', 'KEY_RIGHT'],
  ['←', 'KEY_LEFT'],
  ['↑', 'KEY_UP'],
  ['↓', 'KEY_DOWN'],
  ['espaço', 'KEY_SPACE'],
  ['enter', 'KEY_ENTER'],
  ['esc', 'KEY_ESCAPE'],
  ['shift esquerdo', 'KEY_LEFT_SHIFT'],
  ['ctrl esquerdo', 'KEY_LEFT_CONTROL'],
  ['tab', 'KEY_TAB'],
  ['apagar', 'KEY_BACKSPACE'],
  ...LETTERS.map((letter) => [letter, `KEY_${letter}`] as const),
  ...['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].map(
    (digit, index) => [String(index), `KEY_${digit}`] as const,
  ),
  ['nenhuma (KEY_NULL)', 'KEY_NULL'],
]
export const RAYLIB_COLORS: readonly (readonly [string, string])[] = [
  ['branco', 'WHITE'],
  ['preto', 'BLACK'],
  ['vermelho', 'RED'],
  ['verde', 'GREEN'],
  ['azul', 'BLUE'],
  ['amarelo', 'YELLOW'],
  ['laranja', 'ORANGE'],
  ['rosa', 'PINK'],
  ['roxo', 'PURPLE'],
  ['violeta', 'VIOLET'],
  ['marrom', 'BROWN'],
  ['cinza', 'GRAY'],
  ['cinza claro', 'LIGHTGRAY'],
  ['cinza escuro', 'DARKGRAY'],
  ['azul céu', 'SKYBLUE'],
  ['azul escuro', 'DARKBLUE'],
  ['verde limão', 'LIME'],
  ['verde escuro', 'DARKGREEN'],
  ['dourado', 'GOLD'],
  ['vinho', 'MAROON'],
  ['bege', 'BEIGE'],
  ['roxo escuro', 'DARKPURPLE'],
  ['marrom escuro', 'DARKBROWN'],
  ['magenta', 'MAGENTA'],
  ['branco do raylib', 'RAYWHITE'],
  ['transparente', 'BLANK'],
]
const MOUSE_BUTTONS: readonly (readonly [string, string])[] = [
  ['esquerdo', 'MOUSE_BUTTON_LEFT'],
  ['direito', 'MOUSE_BUTTON_RIGHT'],
  ['do meio', 'MOUSE_BUTTON_MIDDLE'],
]
/** Fields of the raylib structs a game reads and changes (pos.x, rec.width, camera.zoom…). */
export const RAYLIB_STRUCT_FIELDS: readonly (readonly [string, string])[] = [
  ['x', 'x'],
  ['y', 'y'],
  ['z', 'z'],
  ['largura (width)', 'width'],
  ['altura (height)', 'height'],
  ['vermelho (r)', 'r'],
  ['verde (g)', 'g'],
  ['azul (b)', 'b'],
  ['opacidade (a)', 'a'],
  ['alvo (target)', 'target'],
  ['deslocamento (offset)', 'offset'],
  ['giro (rotation)', 'rotation'],
  ['zoom', 'zoom'],
  ['posição (position)', 'position'],
  ['para cima (up)', 'up'],
  ['abertura (fovy)', 'fovy'],
  ['projeção (projection)', 'projection'],
  ['textura (texture)', 'texture'],
  ['tamanho base (baseSize)', 'baseSize'],
  ['repetir (looping)', 'looping'],
  ['mínimo (min)', 'min'],
  ['máximo (max)', 'max'],
  ['acertou (hit)', 'hit'],
  ['distância (distance)', 'distance'],
  ['ponto (point)', 'point'],
  ['normal', 'normal'],
  ['transformação (transform)', 'transform'],
  ['direção (direction)', 'direction'],
  ['materiais (materials)', 'materials'],
  ['malhas (meshes)', 'meshes'],
  ['shader', 'shader'],
  ['mapas (maps)', 'maps'],
  ['quadros da animação (keyframeCount)', 'keyframeCount'],
  ['ossos (boneCount)', 'boneCount'],
  ['quantas malhas (meshCount)', 'meshCount'],
]
const BLEND_MODES: readonly (readonly [string, string])[] = [
  ['transparência normal', 'BLEND_ALPHA'],
  ['somar luz', 'BLEND_ADDITIVE'],
  ['multiplicar', 'BLEND_MULTIPLIED'],
]

/** The pieces both catalogs build their blocks with: the ids, a pyray call and a constant list. */
export function raylibCodecKit(owner: RaylibOwner) {
  const prefix = owner === 'python-raylib-2d' ? 'sz_py_rl2d_' : 'sz_py_rl3d_'
  const blockId = (key: string) => `${prefix}${key}`
  const api = (spec: Call): PythonBlockCodec =>
    pythonApiCallCodec({
      id: blockId(spec.fn),
      owner,
      title: spec.title,
      category: spec.category,
      level: spec.level,
      role: spec.role,
      help: spec.help,
      api: `${spec.fn}(${(spec.params ?? []).map((param) => param.name).join(', ')})`,
      callee: { kind: 'module', module: MODULE, names: [spec.fn] },
      params: spec.params ?? [],
      ...(spec.starter ? { starter: true } : {}),
      ...(spec.dependencies ? { dependencies: spec.dependencies.map(blockId) } : {}),
    })

  /** A pyray constant chosen from a list (RED, KEY_SPACE…), read as its value. */
  const choice = (options: {
    key: string
    title: string
    category: string
    level: 1 | 2 | 3
    help: string
    choices: readonly (readonly [string, string])[]
    initial: string
    starter?: boolean
  }): PythonBlockCodec => {
    const values = new Set(options.choices.map(([, value]) => value))
    return {
      id: blockId(options.key),
      owner,
      title: options.title,
      category: options.category,
      level: options.level,
      role: 'value',
      api: `${[...values].slice(0, 3).join(', ')}…`,
      help: options.help,
      ...(options.starter ? { starter: true } : {}),
      match: { kinds: ['Name'], names: [...values] },
      bindingFor(value) {
        const root = value.fields.id
        return typeof root === 'string' ? { root, module: MODULE, member: root } : undefined
      },
      defaultNode: () => name(options.initial),
      decode(value) {
        if (
          value.kind !== 'Name' ||
          !exact(value, ['id', 'ctx']) ||
          !isLoadName(value) ||
          !values.has(value.fields.id as string)
        )
          return
        return {
          fields: [
            {
              name: 'CHOICE',
              label: '',
              value: value.fields.id as string,
              options: options.choices,
            },
          ],
          inputs: [],
        }
      },
      encode(shape) {
        const chosen = field(shape, 'CHOICE')
        if (!values.has(chosen)) throw new Error('Escolha uma opção da lista.')
        return name(chosen)
      },
    }
  }

  return { blockId, api, choice }
}

export function raylibCommonCodecs(owner: RaylibOwner): PythonBlockCodec[] {
  const { blockId, api, choice } = raylibCodecKit(owner)

  /** `while not window_should_close():` — the game loop every raylib game is built around. */
  const windowLoop: PythonBlockCodec = {
    id: blockId('window_loop'),
    owner,
    title: '🔁 enquanto a janela estiver aberta',
    category: 'Janela e laço',
    level: 1,
    role: 'statement',
    starter: true,
    api: 'while not window_should_close():',
    help: 'O laço do jogo: repete a cada quadro até a janela fechar. Dentro dele, mexa no jogo e depois desenhe entre "começar a desenhar" e "terminar de desenhar".',
    match: { kinds: ['While'] },
    binding: { root: 'window_should_close', module: MODULE, member: 'window_should_close' },
    dependencies: [blockId('begin_drawing'), blockId('end_drawing')],
    defaultNode: () =>
      node('While', {
        test: node('UnaryOp', { op: node('Not'), operand: call(name('window_should_close')) }),
        body: [pass()],
        orelse: [],
      }),
    decode(value) {
      const { test, body, orelse } = value.fields
      if (
        value.kind !== 'While' ||
        !exact(value, ['test', 'body', 'orelse']) ||
        !isNode(test) ||
        test.kind !== 'UnaryOp' ||
        !isNode(test.fields.op) ||
        test.fields.op.kind !== 'Not' ||
        !isNode(test.fields.operand) ||
        test.fields.operand.kind !== 'Call' ||
        !isLoadName(test.fields.operand.fields.func, 'window_should_close') ||
        !nodes(test.fields.operand.fields.args) ||
        test.fields.operand.fields.args.length ||
        !nodes(test.fields.operand.fields.keywords) ||
        test.fields.operand.fields.keywords.length ||
        !nodes(body) ||
        !nodes(orelse) ||
        orelse.length
      )
        return
      return { fields: [], inputs: [statementInput('body', body)] }
    },
    encode(shape) {
      const body = shape.inputs.find((item) => item.name === 'body')
      if (!body) throw new Error('O bloco perdeu o seu corpo.')
      return node('While', {
        test: node('UnaryOp', { op: node('Not'), operand: call(name('window_should_close')) }),
        body: body.nodes.length ? body.nodes : [pass()],
        orelse: [],
      })
    },
  }

  /** `pos.x`, `camera.zoom`, `nave.width`: a field of a raylib struct, to read or to change. */
  const structField: PythonBlockCodec = {
    id: blockId('field'),
    owner,
    title: 'campo',
    category: 'Vetores e retângulos',
    level: 1,
    role: 'value',
    starter: true,
    api: 'valor.x / valor.width / camera.zoom…',
    help: 'Um campo de um vetor, retângulo, cor, câmera ou textura: x, y, width, height, zoom… Use em "guardar" para mudar, como guardar 100 em pos.x.',
    match: { kinds: ['Attribute'], names: RAYLIB_STRUCT_FIELDS.map(([, value]) => value) },
    defaultNode: () => attribute(name('pos'), 'x'),
    decode(value) {
      const { value: object, attr, ctx } = value.fields
      if (
        value.kind !== 'Attribute' ||
        !exact(value, ['value', 'attr', 'ctx']) ||
        !isNode(object) ||
        typeof attr !== 'string' ||
        !RAYLIB_STRUCT_FIELDS.some(([, item]) => item === attr) ||
        !isNode(ctx) ||
        !['Load', 'Store', 'Del'].includes(ctx.kind)
      )
        return
      return {
        fields: [{ name: 'FIELD', label: '', value: attr, options: RAYLIB_STRUCT_FIELDS }],
        inputs: [{ name: 'object', label: 'de', role: 'value', nodes: [object] }],
        extra: { context: ctx.kind },
      }
    },
    encode(shape) {
      const chosen = field(shape, 'FIELD')
      if (!RAYLIB_STRUCT_FIELDS.some(([, item]) => item === chosen))
        throw new Error('Escolha um campo da lista.')
      const context = String(shape.extra?.context ?? 'Load')
      if (!['Load', 'Store', 'Del'].includes(context)) throw new Error('Destino Python inválido.')
      return node('Attribute', { value: one(shape, 'object'), attr: chosen, ctx: node(context) })
    },
  }

  const W = 'Janela e laço'
  const F = 'Formas'
  const I = 'Imagens e texturas'
  const T = 'Texto'
  const K = 'Teclado e mouse'
  const C = 'Colisões'
  const V = 'Vetores e retângulos'
  const CAM = 'Câmera 2D'
  const S = 'Sons e música'
  const COR = 'Cores e sorteio'
  const A = 'Avançado'
  const color = (initial = 'RED') => p('color', 'cor', id(initial))
  const tint = () => p('tint', 'tom', id('WHITE'))

  return [
    // 🪟 Janela e laço
    api({
      fn: 'init_window',
      title: '🪟 abrir a janela com largura',
      category: W,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Abre a janela do jogo com a largura e a altura em pixels e um título. Comece o programa com ela.',
      params: [
        p('width', '', n(800)),
        p('height', 'altura', n(450)),
        p('title', 'título', s('Meu jogo')),
      ],
    }),
    windowLoop,
    api({
      fn: 'begin_drawing',
      title: '🎨 começar a desenhar',
      category: W,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Começa o desenho do quadro. Tudo o que desenhar vem depois dele e antes de "terminar de desenhar".',
    }),
    api({
      fn: 'end_drawing',
      title: '✅ terminar de desenhar',
      category: W,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Mostra o quadro desenhado na tela e espera o próximo. Termine cada volta do laço com ele.',
    }),
    api({
      fn: 'clear_background',
      title: 'pintar o fundo de',
      category: W,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Pinta a tela inteira com uma cor. Use logo depois de "começar a desenhar", senão o desenho do quadro anterior fica na tela.',
      params: [p('color', '', id('RAYWHITE'))],
    }),
    api({
      fn: 'get_frame_time',
      title: 'tempo do último quadro (segundos)',
      category: W,
      level: 1,
      role: 'value',
      help: 'Quantos segundos o último quadro levou (cerca de 0.016 a 60 quadros por segundo). Multiplique a velocidade por ele para o jogo andar igual em qualquer computador.',
    }),
    api({
      fn: 'get_time',
      title: 'segundos desde que a janela abriu',
      category: W,
      level: 1,
      role: 'value',
      help: 'Quantos segundos se passaram desde init_window. Bom para cronômetros e placares de tempo.',
    }),
    api({
      fn: 'set_target_fps',
      title: 'quadros por segundo:',
      category: W,
      level: 1,
      role: 'statement',
      help: 'Quantos quadros por segundo o jogo tenta desenhar (60 é o comum). Use antes do laço.',
      params: [p('fps', '', n(60))],
    }),
    api({
      fn: 'draw_fps',
      title: 'mostrar os quadros por segundo em x',
      category: W,
      level: 2,
      role: 'statement',
      help: 'Escreve na tela quantos quadros por segundo o jogo está desenhando.',
      params: [p('posX', '', n(10)), p('posY', 'y', n(10))],
    }),
    api({
      fn: 'get_screen_width',
      title: 'largura da janela',
      category: W,
      level: 2,
      role: 'value',
      help: 'A largura da janela em pixels.',
    }),
    api({
      fn: 'get_screen_height',
      title: 'altura da janela',
      category: W,
      level: 2,
      role: 'value',
      help: 'A altura da janela em pixels.',
    }),
    api({
      fn: 'window_should_close',
      title: 'a janela vai fechar?',
      category: W,
      level: 2,
      role: 'value',
      help: 'Verdadeiro quando o jogo vai acabar (a tecla de saída ou o botão Parar).',
    }),
    api({
      fn: 'close_window',
      title: 'fechar a janela',
      category: W,
      level: 1,
      role: 'statement',
      help: 'Fecha a janela. Coloque depois do laço do jogo.',
    }),
    api({
      fn: 'set_exit_key',
      title: 'tecla que fecha o jogo:',
      category: W,
      level: 3,
      role: 'statement',
      help: 'Qual tecla termina o jogo (no raylib é ESC). Escolha "nenhuma" para usar o ESC no seu jogo.',
      params: [p('key', '', id('KEY_NULL'))],
    }),
    api({
      fn: 'get_fps',
      title: 'quadros por segundo agora',
      category: W,
      level: 3,
      role: 'value',
      help: 'Quantos quadros por segundo o jogo está desenhando agora.',
    }),
    api({
      fn: 'set_window_title',
      title: 'mudar o título da janela para',
      category: W,
      level: 3,
      role: 'statement',
      help: 'Troca o título da janela.',
      params: [p('title', '', s('Fase 2'))],
    }),
    // 🎨 Formas
    api({
      fn: 'draw_rectangle',
      title: 'desenhar retângulo em x',
      category: F,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Um retângulo cheio: x e y são o canto de cima à esquerda; depois a largura, a altura e a cor.',
      params: [
        p('posX', '', n(100)),
        p('posY', 'y', n(100)),
        p('width', 'largura', n(80)),
        p('height', 'altura', n(50)),
        color(),
      ],
    }),
    api({
      fn: 'draw_rectangle_rec',
      title: 'desenhar o retângulo',
      category: F,
      level: 1,
      role: 'statement',
      help: 'Desenha um Rectangle (x, y, largura e altura juntos).',
      params: [p('rec', '', id('jogador')), color('BLUE')],
    }),
    api({
      fn: 'draw_rectangle_v',
      title: 'desenhar retângulo na posição',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um retângulo com a posição e o tamanho em vetores.',
      params: [p('position', '', v2(100, 100)), p('size', 'tamanho', v2(80, 50)), color()],
    }),
    api({
      fn: 'draw_rectangle_pro',
      title: 'desenhar retângulo girado',
      category: F,
      level: 3,
      role: 'statement',
      help: 'Um retângulo girado em volta de um ponto de origem, com o ângulo em graus.',
      params: [
        p('rec', '', rect(200, 150, 80, 40)),
        p('origin', 'origem', v2(40, 20)),
        p('rotation', 'ângulo', n(45)),
        color(),
      ],
    }),
    api({
      fn: 'draw_rectangle_lines',
      title: 'desenhar contorno de retângulo em x',
      category: F,
      level: 1,
      role: 'statement',
      help: 'Só a borda de um retângulo, com 1 pixel de espessura.',
      params: [
        p('posX', '', n(100)),
        p('posY', 'y', n(100)),
        p('width', 'largura', n(80)),
        p('height', 'altura', n(50)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_rectangle_lines_ex',
      title: 'desenhar contorno do retângulo',
      category: F,
      level: 2,
      role: 'statement',
      help: 'A borda de um Rectangle com a espessura que quiser.',
      params: [
        p('rec', '', rect(100, 100, 80, 50)),
        p('lineThick', 'espessura', n(4)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_rectangle_rounded',
      title: 'desenhar retângulo arredondado',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um retângulo com os cantos arredondados: o arredondamento vai de 0 (reto) a 1 (redondo).',
      params: [
        p('rec', '', rect(100, 100, 120, 50)),
        p('roundness', 'arredondamento', d(0.5)),
        p('segments', 'segmentos', n(8)),
        color('SKYBLUE'),
      ],
    }),
    api({
      fn: 'draw_rectangle_rounded_lines_ex',
      title: 'desenhar contorno arredondado',
      category: F,
      level: 3,
      role: 'statement',
      help: 'A borda de um retângulo arredondado, com a espessura que quiser.',
      params: [
        p('rec', '', rect(100, 100, 120, 50)),
        p('roundness', 'arredondamento', d(0.5)),
        p('segments', 'segmentos', n(8)),
        p('lineThick', 'espessura', n(3)),
        color('DARKBLUE'),
      ],
    }),
    api({
      fn: 'draw_rectangle_gradient_v',
      title: 'desenhar retângulo degradê vertical em x',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um retângulo que muda de cor de cima para baixo. Bom para céus.',
      params: [
        p('posX', '', n(0)),
        p('posY', 'y', n(0)),
        p('width', 'largura', n(800)),
        p('height', 'altura', n(450)),
        p('top', 'cor de cima', id('SKYBLUE')),
        p('bottom', 'cor de baixo', id('WHITE')),
      ],
    }),
    api({
      fn: 'draw_rectangle_gradient_h',
      title: 'desenhar retângulo degradê horizontal em x',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um retângulo que muda de cor da esquerda para a direita.',
      params: [
        p('posX', '', n(0)),
        p('posY', 'y', n(0)),
        p('width', 'largura', n(200)),
        p('height', 'altura', n(50)),
        p('left', 'cor da esquerda', id('RED')),
        p('right', 'cor da direita', id('YELLOW')),
      ],
    }),
    api({
      fn: 'draw_circle',
      title: 'desenhar círculo com centro em x',
      category: F,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Um círculo cheio: o centro (x, y), o raio e a cor. O centro precisa ser número inteiro.',
      params: [
        p('centerX', '', n(400)),
        p('centerY', 'y', n(225)),
        p('radius', 'raio', n(40)),
        color(),
      ],
    }),
    api({
      fn: 'draw_circle_v',
      title: 'desenhar círculo com centro em',
      category: F,
      level: 1,
      role: 'statement',
      help: 'Um círculo com o centro num Vector2: aceita posições com vírgula.',
      params: [p('center', '', id('pos')), p('radius', 'raio', n(40)), color()],
    }),
    api({
      fn: 'draw_circle_lines',
      title: 'desenhar contorno de círculo em x',
      category: F,
      level: 1,
      role: 'statement',
      help: 'Só a borda de um círculo.',
      params: [
        p('centerX', '', n(400)),
        p('centerY', 'y', n(225)),
        p('radius', 'raio', n(40)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_circle_sector',
      title: 'desenhar fatia de círculo com centro em',
      category: F,
      level: 3,
      role: 'statement',
      help: 'Um pedaço de círculo, como uma fatia de pizza, entre dois ângulos em graus.',
      params: [
        p('center', '', v2(400, 225)),
        p('radius', 'raio', n(60)),
        p('startAngle', 'do ângulo', n(0)),
        p('endAngle', 'até', n(270)),
        p('segments', 'segmentos', n(30)),
        color('GOLD'),
      ],
    }),
    api({
      fn: 'draw_circle_gradient',
      title: 'desenhar círculo degradê com centro em',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um círculo que muda de cor do centro para a borda.',
      params: [
        p('center', '', v2(400, 225)),
        p('radius', 'raio', n(60)),
        p('inner', 'cor do centro', id('YELLOW')),
        p('outer', 'cor da borda', id('ORANGE')),
      ],
    }),
    api({
      fn: 'draw_ellipse',
      title: 'desenhar elipse com centro em x',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um círculo achatado: um raio na horizontal e outro na vertical.',
      params: [
        p('centerX', '', n(400)),
        p('centerY', 'y', n(225)),
        p('radiusH', 'raio na horizontal', n(80)),
        p('radiusV', 'raio na vertical', n(40)),
        color('LIME'),
      ],
    }),
    api({
      fn: 'draw_ring',
      title: 'desenhar anel com centro em',
      category: F,
      level: 3,
      role: 'statement',
      help: 'Um anel (uma rosquinha) entre dois raios, de um ângulo até outro.',
      params: [
        p('center', '', v2(400, 225)),
        p('innerRadius', 'raio de dentro', n(30)),
        p('outerRadius', 'raio de fora', n(50)),
        p('startAngle', 'do ângulo', n(0)),
        p('endAngle', 'até', n(360)),
        p('segments', 'segmentos', n(40)),
        color('PINK'),
      ],
    }),
    api({
      fn: 'draw_line',
      title: 'desenhar linha de x',
      category: F,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Uma linha fina de um ponto até outro.',
      params: [
        p('startPosX', '', n(0)),
        p('startPosY', 'y', n(0)),
        p('endPosX', 'até x', n(800)),
        p('endPosY', 'y', n(450)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_line_ex',
      title: 'desenhar linha grossa de',
      category: F,
      level: 1,
      role: 'statement',
      help: 'Uma linha de um ponto até outro, com a espessura que quiser.',
      params: [
        p('startPos', '', v2(100, 100)),
        p('endPos', 'até', v2(700, 350)),
        p('thick', 'espessura', n(5)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_line_v',
      title: 'desenhar linha fina de',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Uma linha fina entre dois Vector2.',
      params: [p('startPos', '', v2(100, 100)), p('endPos', 'até', v2(700, 350)), color('BLACK')],
    }),
    api({
      fn: 'draw_line_bezier',
      title: 'desenhar curva de',
      category: F,
      level: 3,
      role: 'statement',
      help: 'Uma linha em curva suave entre dois pontos.',
      params: [
        p('startPos', '', v2(100, 100)),
        p('endPos', 'até', v2(700, 350)),
        p('thick', 'espessura', n(3)),
        color('DARKGRAY'),
      ],
    }),
    api({
      fn: 'draw_triangle',
      title: 'desenhar triângulo com pontas',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um triângulo cheio. Dê as pontas no sentido anti-horário (ao contrário do relógio), senão o raylib não desenha.',
      params: [
        p('v1', '', v2(400, 100)),
        p('v2', '', v2(300, 300)),
        p('v3', '', v2(500, 300)),
        color('VIOLET'),
      ],
    }),
    api({
      fn: 'draw_triangle_lines',
      title: 'desenhar contorno de triângulo com pontas',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Só a borda de um triângulo.',
      params: [
        p('v1', '', v2(400, 100)),
        p('v2', '', v2(300, 300)),
        p('v3', '', v2(500, 300)),
        color('BLACK'),
      ],
    }),
    api({
      fn: 'draw_poly',
      title: 'desenhar polígono com centro em',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Um polígono regular: 3 lados é triângulo, 6 é hexágono. O giro é em graus.',
      params: [
        p('center', '', v2(400, 225)),
        p('sides', 'lados', n(6)),
        p('radius', 'raio', n(50)),
        p('rotation', 'giro', n(0)),
        color('DARKPURPLE'),
      ],
    }),
    api({
      fn: 'draw_poly_lines',
      title: 'desenhar o contorno do polígono com centro em',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Só a borda de um polígono regular: 3 lados é triângulo, 6 é hexágono. O giro é em graus.',
      params: [
        p('center', '', v2(400, 225)),
        p('sides', 'lados', n(6)),
        p('radius', 'raio', n(50)),
        p('rotation', 'giro', n(0)),
        color('DARKPURPLE'),
      ],
    }),
    api({
      fn: 'draw_pixel',
      title: 'desenhar um pixel em x',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Pinta um único pixel.',
      params: [p('posX', '', n(400)), p('posY', 'y', n(225)), color('BLACK')],
    }),
    api({
      fn: 'draw_pixel_v',
      title: 'desenhar um pixel no ponto',
      category: F,
      level: 2,
      role: 'statement',
      help: 'Pinta um único pixel num ponto (um Vector2).',
      params: [p('position', '', v2(400, 225)), color('BLACK')],
    }),
    // 🖼️ Imagens e texturas
    api({
      fn: 'load_texture',
      title: 'carregar a imagem',
      category: I,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Carrega uma imagem do projeto (PNG, JPG, BMP ou GIF) para desenhar. Guarde numa variável, antes do laço do jogo. O desenho que você trouxe do Pinta fica na pasta images/.',
      params: [p('fileName', '', s('images/nave.png'))],
      dependencies: ['draw_texture'],
    }),
    api({
      fn: 'draw_texture',
      title: 'desenhar a imagem',
      category: I,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Desenha uma imagem carregada, com o canto de cima à esquerda em (x, y). O tom WHITE mostra a imagem sem mudar a cor.',
      params: [
        p('texture', '', id('nave')),
        p('posX', 'em x', n(100)),
        p('posY', 'y', n(100)),
        tint(),
      ],
    }),
    api({
      fn: 'draw_texture_v',
      title: 'desenhar a imagem na posição',
      category: I,
      level: 1,
      role: 'statement',
      help: 'Desenha uma imagem com a posição num Vector2.',
      params: [p('texture', '', id('nave')), p('position', 'na posição', id('pos')), tint()],
    }),
    api({
      fn: 'draw_texture_ex',
      title: 'desenhar a imagem girada e no tamanho',
      category: I,
      level: 1,
      role: 'statement',
      help: 'Desenha uma imagem girada (em graus) e aumentada ou diminuída (escala 2 é o dobro).',
      params: [
        p('texture', '', id('nave')),
        p('position', 'na posição', id('pos')),
        p('rotation', 'giro', n(0)),
        p('scale', 'escala', n(2)),
        tint(),
      ],
    }),
    api({
      fn: 'draw_texture_rec',
      title: 'desenhar um pedaço da imagem',
      category: I,
      level: 2,
      role: 'statement',
      help: 'Desenha só um retângulo da imagem: é assim que se mostra um quadro de uma folha de animação.',
      params: [
        p('texture', '', id('folha')),
        p('source', 'pedaço', rect(0, 0, 32, 32)),
        p('position', 'na posição', id('pos')),
        tint(),
      ],
    }),
    api({
      fn: 'draw_texture_pro',
      title: 'desenhar a imagem (versão completa)',
      category: I,
      level: 3,
      role: 'statement',
      help: 'Desenha um pedaço da imagem num retângulo da tela, girado em volta da origem. Largura negativa no pedaço espelha a imagem.',
      params: [
        p('texture', '', id('nave')),
        p('source', 'pedaço', rect(0, 0, 32, 32)),
        p('dest', 'no retângulo', rect(400, 225, 64, 64)),
        p('origin', 'origem', v2(32, 32)),
        p('rotation', 'giro', n(0)),
        tint(),
      ],
    }),
    api({
      fn: 'unload_texture',
      title: 'descarregar a imagem',
      category: I,
      level: 3,
      role: 'statement',
      help: 'Libera uma imagem que o jogo não vai mais usar.',
      params: [p('texture', '', id('nave'))],
    }),
    api({
      fn: 'load_image',
      title: 'abrir a imagem para editar',
      category: I,
      level: 2,
      role: 'value',
      help: 'Abre uma imagem do projeto na memória, para mudar as cores antes de virar textura.',
      params: [p('fileName', '', s('images/nave.png'))],
      dependencies: ['load_texture_from_image'],
    }),
    api({
      fn: 'load_texture_from_image',
      title: 'textura da imagem editada',
      category: I,
      level: 2,
      role: 'value',
      help: 'Transforma uma imagem editada em textura, para desenhar.',
      params: [p('image', '', id('imagem'))],
    }),
    api({
      fn: 'image_color_grayscale',
      title: 'deixar a imagem em tons de cinza',
      category: I,
      level: 2,
      role: 'statement',
      help: 'Deixa a imagem em preto e branco. No raylib a transparência some: o fundo vira escuro.',
      params: [p('image', '', id('imagem'))],
    }),
    api({
      fn: 'image_color_invert',
      title: 'inverter as cores da imagem',
      category: I,
      level: 2,
      role: 'statement',
      help: 'Troca cada cor pela oposta, como um negativo de foto.',
      params: [p('image', '', id('imagem'))],
    }),
    api({
      fn: 'image_color_tint',
      title: 'tingir a imagem de',
      category: I,
      level: 2,
      role: 'statement',
      help: 'Mistura uma cor em todos os pixels da imagem.',
      params: [p('image', '', id('imagem')), color('SKYBLUE')],
    }),
    api({
      fn: 'image_flip_horizontal',
      title: 'espelhar a imagem',
      category: I,
      level: 2,
      role: 'statement',
      help: 'Vira a imagem da esquerda para a direita.',
      params: [p('image', '', id('imagem'))],
    }),
    api({
      fn: 'image_resize',
      title: 'mudar o tamanho da imagem',
      category: I,
      level: 3,
      role: 'statement',
      help: 'Muda a largura e a altura da imagem.',
      params: [
        p('image', '', id('imagem')),
        p('newWidth', 'largura', n(64)),
        p('newHeight', 'altura', n(64)),
      ],
    }),
    api({
      fn: 'gen_image_color',
      title: 'imagem de uma cor só com largura',
      category: I,
      level: 2,
      role: 'value',
      help: 'Cria uma imagem pintada de uma cor.',
      params: [p('width', '', n(32)), p('height', 'altura', n(32)), color('GOLD')],
    }),
    api({
      fn: 'gen_image_gradient_linear',
      title: 'imagem degradê com largura',
      category: I,
      level: 3,
      role: 'value',
      help: 'Cria uma imagem que muda de uma cor para outra, na direção dada em graus.',
      params: [
        p('width', '', n(64)),
        p('height', 'altura', n(64)),
        p('direction', 'direção', n(0)),
        p('start', 'de', id('RED')),
        p('end', 'até', id('YELLOW')),
      ],
    }),
    api({
      fn: 'unload_image',
      title: 'descarregar a imagem editada',
      category: I,
      level: 3,
      role: 'statement',
      help: 'Libera uma imagem editada que já virou textura.',
      params: [p('image', '', id('imagem'))],
    }),
    // 🔤 Texto
    api({
      fn: 'draw_text',
      title: 'escrever',
      category: T,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Escreve um texto com a fonte do raylib: o texto, a posição (x, y), o tamanho e a cor. Para mostrar um número, use um texto com valores, como f"Pontos: {pontos}".',
      params: [
        p('text', '', s('Olá, Raylib!')),
        p('posX', 'em x', n(10)),
        p('posY', 'y', n(10)),
        p('fontSize', 'tamanho', n(20)),
        color('DARKGRAY'),
      ],
    }),
    api({
      fn: 'measure_text',
      title: 'largura do texto',
      category: T,
      level: 2,
      role: 'value',
      help: 'Quantos pixels o texto ocupa na largura com a fonte do raylib. Bom para centralizar.',
      params: [p('text', '', s('Fim de jogo')), p('fontSize', 'no tamanho', n(40))],
    }),
    api({
      fn: 'load_font',
      title: 'carregar a fonte',
      category: T,
      level: 2,
      role: 'value',
      help: 'Carrega uma fonte .ttf ou .otf do projeto (pasta fonts/).',
      params: [p('fileName', '', s('fonts/letra.ttf'))],
    }),
    api({
      fn: 'load_font_ex',
      title: 'carregar a fonte no tamanho',
      category: T,
      level: 2,
      role: 'value',
      help: 'Carrega uma fonte no tamanho em que você vai usá-la (fica mais nítida). Com codepoints None e 0, ela traz só as letras sem acento, como no raylib.',
      params: [
        p('fileName', '', s('fonts/letra.ttf')),
        p('fontSize', 'tamanho', n(40)),
        p('codepoints', 'letras', () => node('Constant', { value: null, kind: null })),
        p('codepointCount', 'quantas', n(0)),
      ],
    }),
    api({
      fn: 'draw_text_ex',
      title: 'escrever com a fonte',
      category: T,
      level: 2,
      role: 'statement',
      help: 'Escreve com uma fonte carregada: a posição é um Vector2, e o espaçamento é o espaço entre as letras.',
      params: [
        p('font', '', id('fonte')),
        p('text', 'o texto', s('Pontos: 0')),
        p('position', 'na posição', v2(10, 10)),
        p('fontSize', 'tamanho', n(40)),
        p('spacing', 'espaçamento', n(1)),
        tint(),
      ],
    }),
    api({
      fn: 'measure_text_ex',
      title: 'tamanho do texto com a fonte',
      category: T,
      level: 2,
      role: 'value',
      help: 'Um Vector2 com a largura (x) e a altura (y) do texto com uma fonte carregada.',
      params: [
        p('font', '', id('fonte')),
        p('text', 'o texto', s('Pontos: 0')),
        p('fontSize', 'tamanho', n(40)),
        p('spacing', 'espaçamento', n(1)),
      ],
    }),
    api({
      fn: 'get_font_default',
      title: 'fonte do raylib',
      category: T,
      level: 3,
      role: 'value',
      help: 'A fonte padrão do raylib, para usar com "escrever com a fonte".',
    }),
    // ⌨️ Teclado e mouse
    api({
      fn: 'is_key_down',
      title: 'está segurando a tecla',
      category: K,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Verdadeiro em todo quadro enquanto a tecla estiver apertada. Bom para andar.',
      params: [p('key', '', id('KEY_RIGHT'))],
    }),
    api({
      fn: 'is_key_pressed',
      title: 'apertou a tecla agora',
      category: K,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Verdadeiro só no quadro em que a tecla foi apertada. Bom para pular e atirar.',
      params: [p('key', '', id('KEY_SPACE'))],
    }),
    api({
      fn: 'is_key_released',
      title: 'soltou a tecla agora',
      category: K,
      level: 2,
      role: 'value',
      help: 'Verdadeiro só no quadro em que a tecla foi solta.',
      params: [p('key', '', id('KEY_SPACE'))],
    }),
    choice({
      key: 'key',
      title: 'tecla',
      category: K,
      level: 1,
      starter: true,
      help: 'Uma tecla do teclado, como KEY_RIGHT (a seta para a direita) ou KEY_SPACE.',
      choices: RAYLIB_KEYS,
      initial: 'KEY_RIGHT',
    }),
    api({
      fn: 'get_key_pressed',
      title: 'código da tecla apertada',
      category: K,
      level: 3,
      role: 'value',
      help: 'O código da próxima tecla apertada neste quadro, ou 0 se nenhuma.',
    }),
    api({
      fn: 'get_char_pressed',
      title: 'letra digitada',
      category: K,
      level: 3,
      role: 'value',
      help: 'O código da próxima letra digitada neste quadro, ou 0. Use chr(...) para virar texto.',
    }),
    api({
      fn: 'get_mouse_position',
      title: 'posição do mouse',
      category: K,
      level: 1,
      role: 'value',
      help: 'Um Vector2 com a posição do mouse na janela (ou do dedo, na tela de toque).',
    }),
    api({
      fn: 'get_mouse_x',
      title: 'x do mouse',
      category: K,
      level: 1,
      role: 'value',
      help: 'A posição x do mouse na janela.',
    }),
    api({
      fn: 'get_mouse_y',
      title: 'y do mouse',
      category: K,
      level: 1,
      role: 'value',
      help: 'A posição y do mouse na janela.',
    }),
    api({
      fn: 'is_mouse_button_pressed',
      title: 'clicou com o botão',
      category: K,
      level: 1,
      role: 'value',
      help: 'Verdadeiro só no quadro em que o botão do mouse foi apertado (ou a tela foi tocada).',
      params: [p('button', '', id('MOUSE_BUTTON_LEFT'))],
    }),
    api({
      fn: 'is_mouse_button_down',
      title: 'está segurando o botão',
      category: K,
      level: 2,
      role: 'value',
      help: 'Verdadeiro enquanto o botão do mouse estiver apertado.',
      params: [p('button', '', id('MOUSE_BUTTON_LEFT'))],
    }),
    api({
      fn: 'is_mouse_button_released',
      title: 'soltou o botão',
      category: K,
      level: 2,
      role: 'value',
      help: 'Verdadeiro só no quadro em que o botão do mouse foi solto.',
      params: [p('button', '', id('MOUSE_BUTTON_LEFT'))],
    }),
    choice({
      key: 'mouse_button',
      title: 'botão do mouse',
      category: K,
      level: 1,
      help: 'Um botão do mouse: esquerdo, direito ou do meio.',
      choices: MOUSE_BUTTONS,
      initial: 'MOUSE_BUTTON_LEFT',
    }),
    api({
      fn: 'get_mouse_wheel_move',
      title: 'quanto a rodinha girou',
      category: K,
      level: 2,
      role: 'value',
      help: 'Positivo quando a rodinha do mouse gira para cima, negativo para baixo, 0 parada.',
    }),
    api({
      fn: 'get_mouse_delta',
      title: 'quanto o mouse andou',
      category: K,
      level: 3,
      role: 'value',
      help: 'Um Vector2 com quanto o mouse se mexeu desde o quadro anterior.',
    }),
    api({
      fn: 'hide_cursor',
      title: 'esconder a seta do mouse',
      category: K,
      level: 3,
      role: 'statement',
      help: 'Esconde a setinha do mouse em cima do jogo.',
    }),
    api({
      fn: 'show_cursor',
      title: 'mostrar a seta do mouse',
      category: K,
      level: 3,
      role: 'statement',
      help: 'Mostra de novo a setinha do mouse.',
    }),
    // 💥 Colisões
    api({
      fn: 'check_collision_recs',
      title: 'os retângulos se encostam',
      category: C,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Verdadeiro quando os dois retângulos se sobrepõem. Só encostar na borda não conta.',
      params: [p('rec1', '', id('jogador')), p('rec2', 'e', id('parede'))],
    }),
    api({
      fn: 'check_collision_circles',
      title: 'os círculos se encostam: centro',
      category: C,
      level: 1,
      role: 'value',
      help: 'Verdadeiro quando dois círculos se encostam (centro e raio de cada um).',
      params: [
        p('center1', '', id('pos')),
        p('radius1', 'raio', n(20)),
        p('center2', 'e o centro', id('alvo')),
        p('radius2', 'raio', n(20)),
      ],
    }),
    api({
      fn: 'check_collision_circle_rec',
      title: 'o círculo encosta no retângulo: centro',
      category: C,
      level: 2,
      role: 'value',
      help: 'Verdadeiro quando o círculo encosta no retângulo.',
      params: [
        p('center', '', id('pos')),
        p('radius', 'raio', n(20)),
        p('rec', 'retângulo', id('parede')),
      ],
    }),
    api({
      fn: 'check_collision_point_rec',
      title: 'o ponto está dentro do retângulo',
      category: C,
      level: 1,
      role: 'value',
      help: 'Verdadeiro quando o ponto está dentro do retângulo. Ótimo para botões: use a posição do mouse.',
      params: [p('point', '', id('pos')), p('rec', 'retângulo', id('botao'))],
    }),
    api({
      fn: 'check_collision_point_circle',
      title: 'o ponto está dentro do círculo',
      category: C,
      level: 2,
      role: 'value',
      help: 'Verdadeiro quando o ponto está dentro do círculo.',
      params: [
        p('point', '', id('pos')),
        p('center', 'centro', id('alvo')),
        p('radius', 'raio', n(30)),
      ],
    }),
    api({
      fn: 'get_collision_rec',
      title: 'pedaço em que os retângulos se cruzam',
      category: C,
      level: 2,
      role: 'value',
      help: 'O Rectangle da parte em que os dois retângulos se sobrepõem (largura 0 se não se encostam).',
      params: [p('rec1', '', id('jogador')), p('rec2', 'e', id('parede'))],
    }),
    // 📐 Vetores e retângulos
    api({
      fn: 'Vector2',
      title: 'vetor x',
      category: V,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Um ponto ou uma direção com x e y. Guarde numa variável, como pos.',
      params: [p('x', '', n(0)), p('y', 'y', n(0))],
    }),
    structField,
    api({
      fn: 'Rectangle',
      title: 'retângulo x',
      category: V,
      level: 1,
      role: 'value',
      help: 'Um retângulo: x e y do canto de cima à esquerda, largura e altura. Bom para colisões.',
      params: [
        p('x', '', n(0)),
        p('y', 'y', n(0)),
        p('width', 'largura', n(50)),
        p('height', 'altura', n(50)),
      ],
    }),
    api({
      fn: 'vector2_add',
      title: 'somar os vetores',
      category: V,
      level: 2,
      role: 'value',
      help: 'Um vetor novo com x e y somados.',
      params: [p('v1', '', id('pos')), p('v2', 'e', id('velocidade'))],
    }),
    api({
      fn: 'vector2_subtract',
      title: 'subtrair os vetores',
      category: V,
      level: 2,
      role: 'value',
      help: 'O primeiro vetor menos o segundo. Do jogador até o alvo é alvo menos jogador.',
      params: [p('v1', '', id('alvo')), p('v2', 'menos', id('pos'))],
    }),
    api({
      fn: 'vector2_scale',
      title: 'multiplicar o vetor',
      category: V,
      level: 2,
      role: 'value',
      help: 'Um vetor com x e y multiplicados pelo número.',
      params: [p('v', '', id('direcao')), p('scale', 'por', n(5))],
    }),
    api({
      fn: 'vector2_normalize',
      title: 'direção do vetor (tamanho 1)',
      category: V,
      level: 2,
      role: 'value',
      help: 'O vetor com tamanho 1: só a direção. Assim andar na diagonal não fica mais rápido.',
      params: [p('v', '', id('direcao'))],
    }),
    api({
      fn: 'vector2_length',
      title: 'tamanho do vetor',
      category: V,
      level: 2,
      role: 'value',
      help: 'O comprimento do vetor.',
      params: [p('v', '', id('direcao'))],
    }),
    api({
      fn: 'vector2_distance',
      title: 'distância entre',
      category: V,
      level: 2,
      role: 'value',
      help: 'Quantos pixels há entre dois pontos.',
      params: [p('v1', '', id('pos')), p('v2', 'e', id('alvo'))],
    }),
    api({
      fn: 'vector2_lerp',
      title: 'ponto no caminho de',
      category: V,
      level: 3,
      role: 'value',
      help: 'Um ponto entre dois: com 0 é o primeiro, com 1 é o segundo, com 0.5 é o meio.',
      params: [p('v1', '', id('pos')), p('v2', 'até', id('alvo')), p('amount', 'quanto', d(0.1))],
    }),
    api({
      fn: 'vector2_rotate',
      title: 'girar o vetor',
      category: V,
      level: 3,
      role: 'value',
      help: 'O vetor girado pelo ângulo em radianos.',
      params: [p('v', '', id('direcao')), p('angle', 'pelo ângulo', d(0.5))],
    }),
    api({
      fn: 'clamp',
      title: 'limitar o número',
      category: V,
      level: 2,
      role: 'value',
      help: 'O número, sem passar do mínimo nem do máximo. Bom para não sair da tela.',
      params: [p('value', '', id('x')), p('min', 'entre', n(0)), p('max', 'e', n(800))],
    }),
    // 🎥 Câmera 2D
    api({
      fn: 'Camera2D',
      title: 'câmera 2D com deslocamento',
      category: CAM,
      level: 2,
      role: 'value',
      help: 'Uma câmera que segue o jogo: o deslocamento é o ponto da tela que mostra o alvo (o meio da tela, para seguir o jogador), o giro em graus e o zoom (1 é normal).',
      params: [
        p('offset', '', v2(400, 225)),
        p('target', 'alvo', v2(0, 0)),
        p('rotation', 'giro', n(0)),
        p('zoom', 'zoom', n(1)),
      ],
      dependencies: ['begin_mode_2d'],
    }),
    api({
      fn: 'begin_mode_2d',
      title: '🎥 começar a câmera',
      category: CAM,
      level: 2,
      role: 'statement',
      help: 'Tudo o que desenhar depois dele passa pela câmera, até "terminar a câmera".',
      params: [p('camera', '', id('camera'))],
      dependencies: ['end_mode_2d'],
    }),
    api({
      fn: 'end_mode_2d',
      title: 'terminar a câmera',
      category: CAM,
      level: 2,
      role: 'statement',
      help: 'Volta a desenhar direto na tela (bom para o placar, que não anda com a câmera).',
    }),
    api({
      fn: 'get_screen_to_world_2d',
      title: 'ponto do mundo na posição da tela',
      category: CAM,
      level: 3,
      role: 'value',
      help: 'Converte um ponto da tela (como o mouse) para o ponto do mundo que a câmera mostra ali.',
      params: [p('position', '', id('mouse')), p('camera', 'com a câmera', id('camera'))],
    }),
    api({
      fn: 'get_world_to_screen_2d',
      title: 'ponto da tela do ponto do mundo',
      category: CAM,
      level: 3,
      role: 'value',
      help: 'Onde um ponto do mundo aparece na tela com a câmera.',
      params: [p('position', '', id('pos')), p('camera', 'com a câmera', id('camera'))],
    }),
    // 🔊 Sons e música
    api({
      fn: 'init_audio_device',
      title: '🔊 ligar o som',
      category: S,
      level: 1,
      role: 'statement',
      help: 'Liga o som do jogo. Sem ele nenhum som toca: use logo depois de abrir a janela.',
    }),
    api({
      fn: 'load_sound',
      title: 'carregar o som',
      category: S,
      level: 1,
      role: 'value',
      help: 'Carrega um efeito sonoro do projeto (WAV, OGG ou MP3), antes do laço.',
      params: [p('fileName', '', s('sounds/pulo.wav'))],
      dependencies: ['init_audio_device', 'play_sound'],
    }),
    api({
      fn: 'play_sound',
      title: 'tocar o som',
      category: S,
      level: 1,
      role: 'statement',
      help: 'Toca o som do começo.',
      params: [p('sound', '', id('pulo'))],
    }),
    api({
      fn: 'stop_sound',
      title: 'parar o som',
      category: S,
      level: 2,
      role: 'statement',
      help: 'Para o som se estiver tocando.',
      params: [p('sound', '', id('pulo'))],
    }),
    api({
      fn: 'is_sound_playing',
      title: 'o som está tocando',
      category: S,
      level: 2,
      role: 'value',
      help: 'Verdadeiro enquanto o som estiver tocando.',
      params: [p('sound', '', id('pulo'))],
    }),
    api({
      fn: 'set_sound_volume',
      title: 'volume do som',
      category: S,
      level: 2,
      role: 'statement',
      help: 'O volume de 0 (mudo) a 1 (normal).',
      params: [p('sound', '', id('pulo')), p('volume', 'em', d(0.5))],
    }),
    api({
      fn: 'load_music_stream',
      title: 'carregar a música',
      category: S,
      level: 1,
      role: 'value',
      help: 'Carrega uma música do projeto. Ela repete sozinha.',
      params: [p('fileName', '', s('music/tema.ogg'))],
      dependencies: ['init_audio_device', 'play_music_stream', 'update_music_stream'],
    }),
    api({
      fn: 'play_music_stream',
      title: 'tocar a música',
      category: S,
      level: 1,
      role: 'statement',
      help: 'Começa a música. Lembre de "manter a música tocando" a cada quadro.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'update_music_stream',
      title: 'manter a música tocando',
      category: S,
      level: 1,
      role: 'statement',
      help: 'No raylib a música só continua se este bloco rodar a cada quadro: ponha dentro do laço do jogo.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'stop_music_stream',
      title: 'parar a música',
      category: S,
      level: 2,
      role: 'statement',
      help: 'Para a música.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'pause_music_stream',
      title: 'pausar a música',
      category: S,
      level: 3,
      role: 'statement',
      help: 'Pausa a música onde ela está.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'resume_music_stream',
      title: 'continuar a música',
      category: S,
      level: 3,
      role: 'statement',
      help: 'Continua a música pausada.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'set_music_volume',
      title: 'volume da música',
      category: S,
      level: 2,
      role: 'statement',
      help: 'O volume da música, de 0 (mudo) a 1 (normal).',
      params: [p('music', '', id('musica')), p('volume', 'em', d(0.5))],
    }),
    api({
      fn: 'unload_sound',
      title: 'descarregar o som',
      category: S,
      level: 3,
      role: 'statement',
      help: 'Libera um som que o jogo não vai mais tocar. Coloque depois do laço do jogo.',
      params: [p('sound', '', id('pulo'))],
    }),
    api({
      fn: 'unload_music_stream',
      title: 'descarregar a música',
      category: S,
      level: 3,
      role: 'statement',
      help: 'Libera uma música que o jogo não vai mais tocar. Coloque depois do laço do jogo.',
      params: [p('music', '', id('musica'))],
    }),
    api({
      fn: 'close_audio_device',
      title: '🔇 desligar o som',
      category: S,
      level: 3,
      role: 'statement',
      help: 'Desliga o som do jogo. Coloque depois do laço do jogo, antes de fechar a janela.',
    }),
    // 🎲 Cores e sorteio
    choice({
      key: 'color',
      title: 'cor',
      category: COR,
      level: 1,
      starter: true,
      help: 'Uma cor pronta do raylib, como RED ou SKYBLUE.',
      choices: RAYLIB_COLORS,
      initial: 'RED',
    }),
    api({
      fn: 'Color',
      title: 'cor com vermelho',
      category: COR,
      level: 1,
      role: 'value',
      help: 'Uma cor misturada: vermelho, verde e azul de 0 a 255, e a opacidade (255 é sólida, 0 é invisível).',
      params: [
        p('r', '', n(255)),
        p('g', 'verde', n(128)),
        p('b', 'azul', n(0)),
        p('a', 'opacidade', n(255)),
      ],
    }),
    api({
      fn: 'fade',
      title: 'cor transparente',
      category: COR,
      level: 2,
      role: 'value',
      help: 'A cor com a opacidade de 0 (invisível) a 1 (sólida).',
      params: [p('color', '', id('RED')), p('alpha', 'opacidade', d(0.5))],
    }),
    api({
      fn: 'color_from_hsv',
      title: 'cor do arco-íris no ângulo',
      category: COR,
      level: 3,
      role: 'value',
      help: 'Uma cor pelo ângulo no arco-íris (0 vermelho, 120 verde, 240 azul), a saturação e o brilho de 0 a 1.',
      params: [p('hue', '', n(0)), p('saturation', 'saturação', n(1)), p('value', 'brilho', n(1))],
    }),
    api({
      fn: 'get_random_value',
      title: 'sortear um número de',
      category: COR,
      level: 1,
      role: 'value',
      help: 'Um número inteiro sorteado entre os dois (os dois podem sair).',
      params: [p('min', '', n(1)), p('max', 'até', n(6))],
    }),
    api({
      fn: 'set_random_seed',
      title: 'semente do sorteio',
      category: COR,
      level: 3,
      role: 'statement',
      help: 'Com a mesma semente, os sorteios saem sempre iguais (igual ao raylib do computador).',
      params: [p('seed', '', n(42))],
    }),
    // 🧪 Avançado
    api({
      fn: 'load_render_texture',
      title: 'tela extra com largura',
      category: A,
      level: 3,
      role: 'value',
      help: 'Uma textura onde se pode desenhar, como uma segunda tela. Desenhe nela entre "começar a desenhar na tela extra" e "terminar".',
      params: [p('width', '', n(200)), p('height', 'altura', n(200))],
      dependencies: ['begin_texture_mode', 'end_texture_mode'],
    }),
    api({
      fn: 'begin_texture_mode',
      title: 'começar a desenhar na tela extra',
      category: A,
      level: 3,
      role: 'statement',
      help: 'O que desenhar depois dele vai para a tela extra, não para a janela. Ao desenhar a tela extra, use altura negativa no pedaço: ela fica de cabeça para baixo, como no raylib.',
      params: [p('target', '', id('tela'))],
    }),
    api({
      fn: 'end_texture_mode',
      title: 'terminar a tela extra',
      category: A,
      level: 3,
      role: 'statement',
      help: 'Volta a desenhar na janela.',
    }),
    api({
      fn: 'begin_scissor_mode',
      title: 'desenhar só dentro de x',
      category: A,
      level: 3,
      role: 'statement',
      help: 'O que desenhar depois só aparece dentro do retângulo, até "parar de recortar".',
      params: [
        p('x', '', n(0)),
        p('y', 'y', n(0)),
        p('width', 'largura', n(200)),
        p('height', 'altura', n(200)),
      ],
      dependencies: ['end_scissor_mode'],
    }),
    api({
      fn: 'end_scissor_mode',
      title: 'parar de recortar',
      category: A,
      level: 3,
      role: 'statement',
      help: 'Volta a desenhar na janela inteira.',
    }),
    api({
      fn: 'begin_blend_mode',
      title: 'misturar as cores do jeito',
      category: A,
      level: 3,
      role: 'statement',
      help: 'Muda como as cores se misturam: "somar luz" deixa explosões e brilhos mais fortes.',
      params: [p('mode', '', id('BLEND_ADDITIVE'))],
      dependencies: ['end_blend_mode'],
    }),
    api({
      fn: 'end_blend_mode',
      title: 'voltar a misturar normal',
      category: A,
      level: 3,
      role: 'statement',
      help: 'Volta à mistura normal de cores.',
    }),
    choice({
      key: 'blend',
      title: 'mistura de cores',
      category: A,
      level: 3,
      help: 'Um jeito de misturar as cores.',
      choices: BLEND_MODES,
      initial: 'BLEND_ADDITIVE',
    }),
  ]
}
