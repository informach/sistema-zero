import { type PythonApiParam, pythonApiCallCodec } from '../../blocks/apiCallCodec'
import type { PythonBlockCodec } from '../../blocks/contract'
import { attribute, integer, name, node, text } from '../../blocks/nodes'
import type { PythonNode } from '../../language/types'

/** A first game must be drawable and playable before classes, groups and maps are taught. */
const FIRST_CONCEPTS = new Set([
  'tick',
  'quit',
  'fill',
  'blit',
  'pinta_image',
  'pinta_frame',
  'draw_rect',
  'draw_circle',
  'rect',
  'colliderect',
  'get_rect',
  'font',
  'render',
  'sound',
  'play',
])
const CONCEPT_DEPENDENCIES: Readonly<Record<string, readonly string[]>> = {
  init: ['sz_py_forever'],
  keys: ['sz_py_attribute'],
  rect: ['sz_py_attribute'],
}

const value = (item: PythonNode) => () => item
const n = (item: number) =>
  value(
    item < 0
      ? node('UnaryOp', { op: node('USub'), operand: integer(String(-item)) })
      : integer(String(item)),
  )
const t = (item: string) => value(text(item))
const constant = (item: boolean | null) => value(node('Constant', { value: item, kind: null }))
const pair = (x: number, y: number) =>
  value(node('Tuple', { elts: [integer(String(x)), integer(String(y))], ctx: node('Load') }))
const pygameName = (member: string) => value(attribute(name('pygame'), member))
const param = (name: string, label: string, initial: () => PythonNode): PythonApiParam => ({
  name,
  label,
  default: initial,
})
const optional = (name: string, label: string, initial: () => PythonNode): PythonApiParam => ({
  ...param(name, label, initial),
  optional: true,
})
const keyword = (name: string, label: string, initial: () => PythonNode): PythonApiParam => ({
  ...optional(name, label, initial),
  form: 'kw',
})

/** `pygame.x.y(...)` or `pinta.x(...)`: one block per concept of the library. */
const path = (
  id: string,
  title: string,
  category: string,
  role: 'statement' | 'value',
  parts: string[],
  params: PythonApiParam[] = [],
  options: { level?: 1 | 2 | 3; starter?: boolean } = {},
): PythonBlockCodec =>
  pythonApiCallCodec({
    id: `sz_py_pygame_${id}`,
    owner: 'python-pygame',
    title,
    category,
    role,
    level: options.level ?? 1,
    help: `${parts.join('.')}: ${title}.`,
    api: `${parts.join('.')}(${params.map((item) => item.name).join(', ')})`,
    callee: { kind: 'path', path: parts, module: parts[0] },
    params,
    starter: options.starter ?? FIRST_CONCEPTS.has(id),
    dependencies: CONCEPT_DEPENDENCIES[id],
  })
/**
 * `objeto.metodo(...)` on any receiver. Only for names that belong to pygame-ce or to the pinta
 * module (blit, colliderect, animacao…): a generic name (copy, update) would claim calls on
 * lists and dictionaries too, so those keep the ordinary call blocks.
 */
const method = (
  id: string,
  title: string,
  category: string,
  role: 'statement' | 'value',
  receiver: string,
  functionName: string,
  params: PythonApiParam[] = [],
  level: 1 | 2 | 3 = 2,
): PythonBlockCodec =>
  pythonApiCallCodec({
    id: `sz_py_pygame_${id}`,
    owner: 'python-pygame',
    title,
    category,
    role,
    level: FIRST_CONCEPTS.has(id) ? 1 : level,
    starter: FIRST_CONCEPTS.has(id),
    help: `${receiver}.${functionName}: ${title}.`,
    api: `${receiver}.${functionName}(${params.map((item) => item.name).join(', ')})`,
    callee: {
      kind: 'method',
      names: [functionName],
      receiver: { label: receiver, default: () => name(receiver), any: true },
    },
    params,
  })

const WINDOW = 'Janela e laço'
const EVENTS = 'Eventos e tempo'
const INPUT = 'Teclado e mouse'
const PINTA = 'Sprites, animações e mapas'
const SURFACES = 'Superfícies e imagens'
const TRANSFORM = 'Transformar'
const DRAW = 'Desenho'
const RECTS = 'Retângulos'
const VECTORS = 'Vetores'
const GROUPS = 'Grupos e colisões'
const MASKS = 'Máscaras'
const TEXT = 'Texto'
const SOUND = 'Som e música'

/** Visual projections preserve the exact Python AST; ordinary Python blocks provide the rest. */
export const PYTHON_PYGAME_CODECS: readonly PythonBlockCodec[] = Object.freeze([
  // Janela e laço ---------------------------------------------------------------------------
  path('init', 'iniciar o pygame', WINDOW, 'statement', ['pygame', 'init'], [], { starter: true }),
  path(
    'set_mode',
    'criar a janela',
    WINDOW,
    'value',
    ['pygame', 'display', 'set_mode'],
    [param('size', 'tamanho', pair(1280, 720))],
    { starter: true },
  ),
  path(
    'set_caption',
    'título da janela',
    WINDOW,
    'statement',
    ['pygame', 'display', 'set_caption'],
    [param('title', 'título', t('Meu jogo'))],
  ),
  path('get_surface', 'a tela do jogo', WINDOW, 'value', ['pygame', 'display', 'get_surface']),
  path('flip', 'mostrar o quadro', WINDOW, 'statement', ['pygame', 'display', 'flip'], [], {
    starter: true,
  }),
  path('update', 'atualizar a tela', WINDOW, 'statement', ['pygame', 'display', 'update']),
  path('clock', 'novo relógio', WINDOW, 'value', ['pygame', 'time', 'Clock'], [], {
    starter: true,
  }),
  method(
    'tick',
    'esperar o próximo quadro',
    WINDOW,
    'value',
    'clock',
    'tick',
    [optional('framerate', 'quadros por segundo', n(60))],
    1,
  ),
  method('get_fps', 'quadros por segundo agora', WINDOW, 'value', 'clock', 'get_fps'),
  path('quit', 'encerrar o pygame', WINDOW, 'statement', ['pygame', 'quit']),

  // Eventos e tempo -------------------------------------------------------------------------
  path('events', 'eventos que chegaram', EVENTS, 'value', ['pygame', 'event', 'get'], [], {
    starter: true,
  }),
  path('custom_event', 'novo tipo de evento', EVENTS, 'value', ['pygame', 'event', 'custom_type']),
  path(
    'timer',
    'repetir um evento',
    EVENTS,
    'statement',
    ['pygame', 'time', 'set_timer'],
    [
      param('event', 'evento', pygameName('USEREVENT')),
      param('millis', 'a cada (ms)', n(1000)),
      optional('loops', 'vezes', n(0)),
    ],
  ),
  path(
    'post',
    'mandar um evento',
    EVENTS,
    'statement',
    ['pygame', 'event', 'post'],
    [param('event', 'evento', value(name('evento')))],
    { level: 2 },
  ),
  path('ticks', 'milissegundos desde o início', EVENTS, 'value', ['pygame', 'time', 'get_ticks']),

  // Teclado e mouse -------------------------------------------------------------------------
  path('keys', 'teclas seguradas', INPUT, 'value', ['pygame', 'key', 'get_pressed'], [], {
    starter: true,
  }),
  path('keys_just', 'teclas que acabaram de ser apertadas', INPUT, 'value', [
    'pygame',
    'key',
    'get_just_pressed',
  ]),
  path('keys_released', 'teclas que acabaram de ser soltas', INPUT, 'value', [
    'pygame',
    'key',
    'get_just_released',
  ]),
  path('mouse_pos', 'posição do mouse', INPUT, 'value', ['pygame', 'mouse', 'get_pos']),
  path(
    'mouse_pressed',
    'botões do mouse apertados',
    INPUT,
    'value',
    ['pygame', 'mouse', 'get_pressed'],
    [optional('num_buttons', 'quantos botões', n(3))],
  ),
  path(
    'mouse_visible',
    'mostrar o cursor',
    INPUT,
    'statement',
    ['pygame', 'mouse', 'set_visible'],
    [param('value', 'mostrar', constant(false))],
    { level: 2 },
  ),

  // Sprites, animações e mapas (desenhos do Pinta) ------------------------------------------
  path(
    'pinta_sprite',
    'abrir o sprite',
    PINTA,
    'value',
    ['pinta', 'carregar_sprite'],
    [param('nome', 'desenho', t('heroi'))],
    { starter: true },
  ),
  method(
    'pinta_animation',
    'quadros da animação',
    PINTA,
    'value',
    'sprite',
    'animacao',
    [param('nome', 'animação', t('correr')), optional('virar_x', 'espelhar', constant(true))],
    1,
  ),
  method('pinta_frame', 'um quadro da animação', PINTA, 'value', 'sprite', 'quadro', [
    param('nome', 'animação', t('parado')),
    optional('indice', 'quadro', n(0)),
  ]),
  method('pinta_fps', 'velocidade da animação', PINTA, 'value', 'sprite', 'fps', [
    param('nome', 'animação', t('correr')),
  ]),
  path(
    'pinta_image',
    'abrir a imagem',
    PINTA,
    'value',
    ['pinta', 'carregar_imagem'],
    [param('nome', 'desenho', t('fundo'))],
  ),
  path(
    'pinta_tiles',
    'abrir as peças',
    PINTA,
    'value',
    ['pinta', 'carregar_pecas'],
    [param('nome', 'desenho', t('terreno'))],
    { level: 2 },
  ),
  path(
    'pinta_map',
    'abrir o mapa',
    PINTA,
    'value',
    ['pinta', 'carregar_mapa'],
    [param('nome', 'desenho', t('fase-1'))],
  ),
  method('pinta_layer', 'camada do mapa', PINTA, 'value', 'mapa', 'camada', [
    param('nome', 'camada', t('Terreno')),
  ]),
  method('pinta_layer_tiles', 'peças da camada', PINTA, 'value', 'camada', 'tiles'),
  method('pinta_solids', 'peças sólidas da camada', PINTA, 'value', 'camada', 'solidos'),
  method('pinta_platforms', 'plataformas da camada', PINTA, 'value', 'camada', 'plataformas'),
  method('pinta_objects', 'objetos do mapa', PINTA, 'value', 'mapa', 'objetos', [
    optional('tipo', 'do tipo', t('inimigo')),
  ]),
  method('pinta_draw', 'desenhar a camada', PINTA, 'statement', 'camada', 'desenhar', [
    param('superficie', 'em', value(name('tela'))),
    optional('deslocamento', 'deslocamento', pair(0, 0)),
  ]),

  // Superfícies e imagens -------------------------------------------------------------------
  path(
    'surface',
    'nova superfície',
    SURFACES,
    'value',
    ['pygame', 'Surface'],
    [
      param('size', 'tamanho', pair(64, 64)),
      optional('flags', 'com transparência', pygameName('SRCALPHA')),
    ],
  ),
  path(
    'image_load',
    'abrir um arquivo de imagem',
    SURFACES,
    'value',
    ['pygame', 'image', 'load'],
    [param('file', 'arquivo', t('assets/fundo.png'))],
    { level: 2 },
  ),
  method('convert_alpha', 'preparar para a tela', SURFACES, 'value', 'imagem', 'convert_alpha'),
  method(
    'blit',
    'desenhar a imagem',
    SURFACES,
    'statement',
    'tela',
    'blit',
    [
      param('source', 'imagem', value(name('imagem'))),
      param('dest', 'posição', pair(0, 0)),
      optional('area', 'só o pedaço', value(name('area'))),
      keyword('special_flags', 'misturar', pygameName('BLEND_RGBA_MULT')),
    ],
    1,
  ),
  method(
    'fill',
    'pintar com uma cor',
    SURFACES,
    'statement',
    'tela',
    'fill',
    [param('color', 'cor', t('#10182b'))],
    1,
  ),
  method('set_colorkey', 'cor transparente', SURFACES, 'statement', 'imagem', 'set_colorkey', [
    param('color', 'cor', t('green')),
  ]),
  method('set_alpha', 'transparência', SURFACES, 'statement', 'imagem', 'set_alpha', [
    param('value', 'de 0 a 255', n(128)),
  ]),
  method('subsurface', 'pedaço da imagem', SURFACES, 'value', 'imagem', 'subsurface', [
    param('rect', 'retângulo', value(name('area'))),
  ]),
  method('get_rect', 'retângulo da imagem', SURFACES, 'value', 'imagem', 'get_rect', [
    keyword('center', 'centro em', pair(640, 360)),
  ]),
  method(
    'get_frect',
    'retângulo decimal da imagem',
    SURFACES,
    'value',
    'imagem',
    'get_frect',
    [keyword('center', 'centro em', pair(640, 360))],
    1,
  ),

  // Transformar -----------------------------------------------------------------------------
  path(
    'flip_image',
    'espelhar',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'flip'],
    [
      param('surface', 'imagem', value(name('imagem'))),
      param('flip_x', 'na horizontal', constant(true)),
      param('flip_y', 'na vertical', constant(false)),
    ],
  ),
  path(
    'scale',
    'mudar o tamanho',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'scale'],
    [param('surface', 'imagem', value(name('imagem'))), param('size', 'para', pair(64, 64))],
  ),
  path(
    'scale_by',
    'aumentar ou diminuir',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'scale_by'],
    [param('surface', 'imagem', value(name('imagem'))), param('factor', 'vezes', n(2))],
  ),
  path(
    'rotate',
    'girar',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'rotate'],
    [param('surface', 'imagem', value(name('imagem'))), param('angle', 'graus', n(90))],
  ),
  path(
    'rotozoom',
    'girar e mudar o tamanho',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'rotozoom'],
    [
      param('surface', 'imagem', value(name('imagem'))),
      param('angle', 'graus', n(45)),
      param('scale', 'tamanho', n(1)),
    ],
  ),
  path(
    'scale2x',
    'dobrar o tamanho',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'scale2x'],
    [param('surface', 'imagem', value(name('imagem')))],
    { level: 2 },
  ),
  path(
    'grayscale',
    'em tons de cinza',
    TRANSFORM,
    'value',
    ['pygame', 'transform', 'grayscale'],
    [param('surface', 'imagem', value(name('imagem')))],
    { level: 2 },
  ),

  // Desenho ---------------------------------------------------------------------------------
  path(
    'draw_rect',
    'desenhar retângulo',
    DRAW,
    'statement',
    ['pygame', 'draw', 'rect'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#65d6ce')),
      param('rect', 'retângulo', value(name('retangulo'))),
      optional('width', 'contorno', n(0)),
      optional('border_radius', 'cantos redondos', n(8)),
    ],
  ),
  path(
    'draw_circle',
    'desenhar círculo',
    DRAW,
    'statement',
    ['pygame', 'draw', 'circle'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#ffcf6b')),
      param('center', 'centro', pair(640, 360)),
      param('radius', 'raio', n(20)),
      optional('width', 'contorno', n(0)),
    ],
  ),
  path(
    'draw_line',
    'desenhar linha',
    DRAW,
    'statement',
    ['pygame', 'draw', 'line'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#ffffff')),
      param('start_pos', 'de', pair(0, 0)),
      param('end_pos', 'até', pair(100, 100)),
      optional('width', 'espessura', n(1)),
    ],
  ),
  path(
    'draw_lines',
    'desenhar linha com vários pontos',
    DRAW,
    'statement',
    ['pygame', 'draw', 'lines'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#ffffff')),
      param('closed', 'fechada', constant(false)),
      param('points', 'pontos', value(name('pontos'))),
      optional('width', 'espessura', n(1)),
    ],
    { level: 2 },
  ),
  path(
    'draw_polygon',
    'desenhar polígono',
    DRAW,
    'statement',
    ['pygame', 'draw', 'polygon'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#ff7a59')),
      param('points', 'pontos', value(name('pontos'))),
      optional('width', 'contorno', n(0)),
    ],
    { level: 2 },
  ),
  path(
    'draw_ellipse',
    'desenhar elipse',
    DRAW,
    'statement',
    ['pygame', 'draw', 'ellipse'],
    [
      param('surface', 'em', value(name('tela'))),
      param('color', 'cor', t('#a78bfa')),
      param('rect', 'retângulo', value(name('retangulo'))),
      optional('width', 'contorno', n(0)),
    ],
    { level: 2 },
  ),

  // Retângulos ------------------------------------------------------------------------------
  path(
    'rect',
    'novo retângulo',
    RECTS,
    'value',
    ['pygame', 'Rect'],
    [
      param('left', 'x', n(0)),
      param('top', 'y', n(0)),
      param('width', 'largura', n(40)),
      param('height', 'altura', n(40)),
    ],
  ),
  path(
    'frect',
    'novo retângulo decimal',
    RECTS,
    'value',
    ['pygame', 'FRect'],
    [
      param('left', 'x', n(0)),
      param('top', 'y', n(0)),
      param('width', 'largura', n(40)),
      param('height', 'altura', n(40)),
    ],
  ),
  method(
    'colliderect',
    'encosta no retângulo?',
    RECTS,
    'value',
    'rect',
    'colliderect',
    [param('other', 'outro', value(name('outro')))],
    1,
  ),
  method(
    'collidepoint',
    'contém o ponto?',
    RECTS,
    'value',
    'rect',
    'collidepoint',
    [param('point', 'ponto', pair(0, 0))],
    1,
  ),
  method('collidelist', 'qual da lista encosta', RECTS, 'value', 'rect', 'collidelist', [
    param('rects', 'lista', value(name('retangulos'))),
  ]),
  method('inflate', 'retângulo maior ou menor', RECTS, 'value', 'rect', 'inflate', [
    param('x', 'mais largura', n(10)),
    param('y', 'mais altura', n(10)),
  ]),
  method('clamp_ip', 'manter dentro de', RECTS, 'statement', 'rect', 'clamp_ip', [
    param('rect', 'retângulo', value(name('limite'))),
  ]),
  method(
    'clipline',
    'pedaço da linha dentro',
    RECTS,
    'value',
    'rect',
    'clipline',
    [param('start', 'de', pair(0, 0)), param('end', 'até', pair(100, 100))],
    3,
  ),

  // Vetores ---------------------------------------------------------------------------------
  path(
    'vector2',
    'novo vetor',
    VECTORS,
    'value',
    ['pygame', 'Vector2'],
    [optional('x', 'x', n(0)), optional('y', 'y', n(0))],
  ),
  method('normalize', 'direção com tamanho 1', VECTORS, 'value', 'direcao', 'normalize', [], 1),
  method('distance_to', 'distância até', VECTORS, 'value', 'posicao', 'distance_to', [
    param('other', 'ponto', value(name('alvo'))),
  ]),
  method('magnitude', 'tamanho do vetor', VECTORS, 'value', 'direcao', 'magnitude'),

  // Grupos e colisões -----------------------------------------------------------------------
  path('group', 'novo grupo de sprites', GROUPS, 'value', ['pygame', 'sprite', 'Group'], [], {
    starter: true,
  }),
  method('kill', 'tirar dos grupos', GROUPS, 'statement', 'sprite', 'kill', [], 1),
  path(
    'spritecollide',
    'sprites do grupo que encostam',
    GROUPS,
    'value',
    ['pygame', 'sprite', 'spritecollide'],
    [
      param('sprite', 'sprite', value(name('jogador'))),
      param('group', 'grupo', value(name('inimigos'))),
      param('dokill', 'tirar do grupo', constant(false)),
      optional(
        'collided',
        'como comparar',
        value(attribute(attribute(name('pygame'), 'sprite'), 'collide_mask')),
      ),
    ],
  ),
  path(
    'groupcollide',
    'colisões entre dois grupos',
    GROUPS,
    'value',
    ['pygame', 'sprite', 'groupcollide'],
    [
      param('groupa', 'grupo A', value(name('tiros'))),
      param('groupb', 'grupo B', value(name('inimigos'))),
      param('dokilla', 'tirar de A', constant(true)),
      param('dokillb', 'tirar de B', constant(true)),
    ],
    { level: 2 },
  ),

  // Máscaras --------------------------------------------------------------------------------
  path(
    'mask',
    'máscara da imagem',
    MASKS,
    'value',
    ['pygame', 'mask', 'from_surface'],
    [param('surface', 'imagem', value(name('imagem')))],
    { level: 2 },
  ),
  method('mask_surface', 'silhueta da máscara', MASKS, 'value', 'mascara', 'to_surface', [], 3),

  // Texto -----------------------------------------------------------------------------------
  path(
    'pinta_font',
    'fonte da plataforma',
    TEXT,
    'value',
    ['pinta', 'fonte'],
    [param('nome', 'fonte', t('bungee')), param('tamanho', 'tamanho', n(40))],
  ),
  path(
    'font',
    'nova fonte',
    TEXT,
    'value',
    ['pygame', 'font', 'Font'],
    [param('name', 'arquivo', constant(null)), param('size', 'tamanho', n(32))],
  ),
  method(
    'render',
    'escrever',
    TEXT,
    'value',
    'fonte',
    'render',
    [
      param('text', 'texto', t('Pontos: 0')),
      param('antialias', 'suave', constant(true)),
      param('color', 'cor', t('white')),
    ],
    1,
  ),

  // Som e música ----------------------------------------------------------------------------
  path(
    'sound',
    'abrir um som',
    SOUND,
    'value',
    ['pygame', 'mixer', 'Sound'],
    [param('file', 'arquivo', t('assets/pulo.wav'))],
  ),
  // The fixed music paths come before the `play`/`set_volume` of any object.
  path(
    'music_load',
    'escolher a música',
    SOUND,
    'statement',
    ['pygame', 'mixer', 'music', 'load'],
    [param('filename', 'arquivo', t('assets/musica.ogg'))],
    { level: 2 },
  ),
  path(
    'music_play',
    'tocar a música',
    SOUND,
    'statement',
    ['pygame', 'mixer', 'music', 'play'],
    [optional('loops', 'repetir', n(-1))],
    { level: 2 },
  ),
  path(
    'music_stop',
    'parar a música',
    SOUND,
    'statement',
    ['pygame', 'mixer', 'music', 'stop'],
    [],
    {
      level: 2,
    },
  ),
  method(
    'play',
    'tocar',
    SOUND,
    'statement',
    'som',
    'play',
    [optional('loops', 'repetir', n(-1))],
    1,
  ),
  method('set_volume', 'volume', SOUND, 'statement', 'som', 'set_volume', [
    param('value', 'de 0 a 1', n(1)),
  ]),
])
