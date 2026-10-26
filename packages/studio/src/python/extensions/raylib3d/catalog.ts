import type { PythonBlockCodec } from '../../blocks/contract'
import { attribute, call, integer, isNode, name, nodes, text } from '../../blocks/nodes'
import {
  ctor,
  d,
  exact,
  field,
  id,
  isLoadName,
  n,
  one,
  p,
  RAYLIB_MODULE,
  RAYLIB_RESOLVER_OPTIONS,
  raylibCodecKit,
  raylibCommonCodecs,
  s,
} from '../raylib/commonCatalog'

const OWNER = 'python-raylib-3d'
const CAMERA = 'Câmera 3D'
const SHAPES = 'Formas 3D'
const MODELS = 'Modelos'
const ANIMATION = 'Animações'
const HITS = 'Colisões 3D'
const VECTORS = 'Vetores 3D'
const MOUSE = 'Mouse travado'
const SHADERS = 'Shaders'

/** A number shadow: an int when it is whole, a float otherwise (0.5 is not an int literal). */
const num = (value: number) => (Number.isInteger(value) ? n(value) : d(value))
const v3 = (x: number, y: number, z: number) => ctor('Vector3', num(x), num(y), num(z))
/** `ffi.NULL`: "no file" / "the default shader" in a raylib call, as on the desktop. */
const NULL = () => attribute(name('ffi'), 'NULL')

const CAMERA_MODES: readonly (readonly [string, string])[] = [
  ['primeira pessoa (andar e olhar)', 'CAMERA_FIRST_PERSON'],
  ['terceira pessoa', 'CAMERA_THIRD_PERSON'],
  ['girar em volta (orbital)', 'CAMERA_ORBITAL'],
  ['livre (voar)', 'CAMERA_FREE'],
  ['do meu jeito (custom)', 'CAMERA_CUSTOM'],
]
const PROJECTIONS: readonly (readonly [string, string])[] = [
  ['perspectiva (o longe fica menor)', 'CAMERA_PERSPECTIVE'],
  ['ortográfica (sem distância)', 'CAMERA_ORTHOGRAPHIC'],
]
const MATERIAL_MAPS: readonly (readonly [string, string])[] = [
  ['cor (albedo)', 'MATERIAL_MAP_ALBEDO'],
  ['brilho (metalness)', 'MATERIAL_MAP_METALNESS'],
  ['relevo (normal)', 'MATERIAL_MAP_NORMAL'],
]
const UNIFORMS: readonly (readonly [string, string])[] = [
  ['um número (float)', 'SHADER_UNIFORM_FLOAT'],
  ['vetor de 2 (vec2)', 'SHADER_UNIFORM_VEC2'],
  ['vetor de 3 (vec3)', 'SHADER_UNIFORM_VEC3'],
  ['vetor de 4 (vec4)', 'SHADER_UNIFORM_VEC4'],
  ['um inteiro (int)', 'SHADER_UNIFORM_INT'],
]
/** What `ffi.new` makes in a raylib game: a counter for load_model_animations, a shader value. */
const FFI_TYPES: readonly (readonly [string, string])[] = [
  ['um contador inteiro (int *)', 'int *'],
  ['um número (float *)', 'float *'],
  ['um vetor de 2 (struct Vector2 *)', 'struct Vector2 *'],
  ['um vetor de 3 (struct Vector3 *)', 'struct Vector3 *'],
]

/**
 * 🧊 Raylib 3D: everything a 3D game needs on its own — the window, the loop, the HUD (text,
 * shapes, images), keyboard, mouse and sound from the common factory, plus the 3D blocks.
 */
export const PYTHON_RAYLIB_3D_CODECS: readonly PythonBlockCodec[] = [
  ...raylibCommonCodecs(OWNER),
  ...raylib3DCodecs(),
]
export { RAYLIB_RESOLVER_OPTIONS }

function raylib3DCodecs(): PythonBlockCodec[] {
  const { blockId, api, choice } = raylibCodecKit(OWNER)
  const color = (initial = 'RED') => p('color', 'cor', id(initial))
  const tint = () => p('tint', 'tom', id('WHITE'))

  /** `ffi.new('int *', 0)`: the cffi box raylib fills (animCount) or reads (a shader value). */
  const ffiNew: PythonBlockCodec = {
    id: blockId('ffi_new'),
    owner: OWNER,
    title: 'caixinha do ffi com',
    category: ANIMATION,
    level: 2,
    role: 'value',
    api: "ffi.new('int *', 0)",
    help: 'Uma caixinha que o raylib lê ou preenche, como no computador: o contador de load_model_animations (int *) ou o valor de um shader (struct Vector2 *, float *). Leia o que tem dentro com [0].',
    match: { kinds: ['Call'] },
    bindingFor() {
      return { root: 'ffi', module: RAYLIB_MODULE, member: 'ffi' }
    },
    defaultNode: () => call(attribute(name('ffi'), 'new'), [text('int *'), integer('0')]),
    decode(value) {
      const { func, args, keywords } = value.fields
      if (
        value.kind !== 'Call' ||
        !exact(value, ['func', 'args', 'keywords']) ||
        !isNode(func) ||
        func.kind !== 'Attribute' ||
        func.fields.attr !== 'new' ||
        !isLoadName(func.fields.value, 'ffi') ||
        !nodes(args) ||
        args.length !== 2 ||
        !nodes(keywords) ||
        keywords.length
      )
        return
      const kind = args[0]!
      const chosen = kind.fields.value
      if (
        kind.kind !== 'Constant' ||
        kind.fields.kind !== null ||
        typeof chosen !== 'string' ||
        !FFI_TYPES.some(([, item]) => item === chosen)
      )
        return
      return {
        fields: [{ name: 'TYPE', label: '', value: chosen, options: FFI_TYPES }],
        inputs: [{ name: 'init', label: 'começando em', role: 'value', nodes: [args[1]!] }],
      }
    },
    encode(shape) {
      const chosen = field(shape, 'TYPE')
      if (!FFI_TYPES.some(([, item]) => item === chosen))
        throw new Error('Escolha um tipo da lista.')
      return call(attribute(name('ffi'), 'new'), [text(chosen), one(shape, 'init')])
    },
  }

  return [
    // 🎥 Câmera 3D
    api({
      fn: 'Camera3D',
      title: '🎥 câmera 3D na posição',
      category: CAMERA,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Os olhos do jogo 3D: onde a câmera está, para onde olha (alvo), qual lado é para cima, a abertura em graus (45 é como um olho) e a projeção.',
      params: [
        p('position', '', v3(10, 10, 10)),
        p('target', 'olhando para', v3(0, 0, 0)),
        p('up', 'para cima', v3(0, 1, 0)),
        p('fovy', 'abertura', n(45)),
        p('projection', 'projeção', id('CAMERA_PERSPECTIVE')),
      ],
      dependencies: ['begin_mode_3d'],
    }),
    choice({
      key: 'projection',
      title: 'projeção',
      category: CAMERA,
      level: 2,
      help: 'Perspectiva: o que está longe fica menor, como no olho. Ortográfica: tudo do mesmo tamanho, bom para jogos vistos de cima.',
      choices: PROJECTIONS,
      initial: 'CAMERA_PERSPECTIVE',
    }),
    api({
      fn: 'begin_mode_3d',
      title: '🎥 começar o 3D com a câmera',
      category: CAMERA,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Tudo o que desenhar depois dele é 3D, visto pela câmera, até "terminar o 3D". Fica entre "começar a desenhar" e "terminar de desenhar".',
      params: [p('camera', '', id('camera'))],
      dependencies: ['end_mode_3d'],
    }),
    api({
      fn: 'end_mode_3d',
      title: 'terminar o 3D',
      category: CAMERA,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Volta a desenhar em 2D, por cima do 3D: é onde vão o placar e os textos.',
    }),
    api({
      fn: 'update_camera',
      title: 'mexer a câmera sozinha do jeito',
      category: CAMERA,
      level: 2,
      role: 'statement',
      help: 'A câmera anda com o teclado e o mouse, do jeito escolhido: primeira pessoa (W A S D e o mouse), girar em volta, livre… Use uma vez por quadro.',
      params: [p('camera', '', id('camera')), p('mode', 'do jeito', id('CAMERA_FIRST_PERSON'))],
    }),
    choice({
      key: 'camera_mode',
      title: 'jeito da câmera',
      category: CAMERA,
      level: 2,
      help: 'Como a câmera anda sozinha em "mexer a câmera sozinha".',
      choices: CAMERA_MODES,
      initial: 'CAMERA_FIRST_PERSON',
    }),
    api({
      fn: 'update_camera_pro',
      title: 'mexer a câmera andando',
      category: CAMERA,
      level: 3,
      role: 'statement',
      help: 'Anda com a câmera do seu jeito: movimento (para a frente, para o lado, para cima), giro (para os lados, para cima, inclinar, em graus) e zoom.',
      params: [
        p('camera', '', id('camera')),
        p('movement', 'andando', v3(0, 0, 0)),
        p('rotation', 'girando', v3(0, 0, 0)),
        p('zoom', 'zoom', n(0)),
      ],
    }),
    api({
      fn: 'get_world_to_screen',
      title: 'ponto da tela do ponto 3D',
      category: CAMERA,
      level: 2,
      role: 'value',
      help: 'Onde um ponto do mundo 3D aparece na tela (um Vector2): bom para escrever o nome em cima de alguém.',
      params: [p('position', '', id('pos')), p('camera', 'com a câmera', id('camera'))],
    }),
    api({
      fn: 'get_screen_to_world_ray',
      title: 'raio da tela no ponto',
      category: CAMERA,
      level: 2,
      role: 'value',
      help: 'Um raio que sai da câmera passando por um ponto da tela, como o mouse ou o meio da tela: para mirar e clicar em coisas 3D.',
      params: [p('position', '', id('mouse')), p('camera', 'com a câmera', id('camera'))],
    }),
    // 📦 Formas 3D
    api({
      fn: 'draw_cube',
      title: '📦 cubo em',
      category: SHAPES,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Um cubo com o centro na posição, com largura, altura e comprimento.',
      params: [
        p('position', '', v3(0, 0, 0)),
        p('width', 'largura', n(2)),
        p('height', 'altura', n(2)),
        p('length', 'comprimento', n(2)),
        color(),
      ],
    }),
    api({
      fn: 'draw_cube_v',
      title: 'cubo em',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Um cubo com o tamanho num Vector3 (largura, altura, comprimento).',
      params: [p('position', '', v3(0, 0, 0)), p('size', 'tamanho', v3(2, 2, 2)), color()],
    }),
    api({
      fn: 'draw_cube_wires',
      title: 'contorno de cubo em',
      category: SHAPES,
      level: 1,
      role: 'statement',
      help: 'Só as arestas de um cubo: bom para ver a caixa de colisão.',
      params: [
        p('position', '', v3(0, 0, 0)),
        p('width', 'largura', n(2)),
        p('height', 'altura', n(2)),
        p('length', 'comprimento', n(2)),
        color('MAROON'),
      ],
    }),
    api({
      fn: 'draw_sphere',
      title: '⚪ bola em',
      category: SHAPES,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Uma bola com o centro na posição e o raio.',
      params: [p('centerPos', '', v3(0, 1, 0)), p('radius', 'raio', n(1)), color('BLUE')],
    }),
    api({
      fn: 'draw_sphere_wires',
      title: 'contorno de bola em',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Só as linhas de uma bola, com anéis e fatias.',
      params: [
        p('centerPos', '', v3(0, 1, 0)),
        p('radius', 'raio', n(1)),
        p('rings', 'anéis', n(8)),
        p('slices', 'fatias', n(8)),
        color('DARKBLUE'),
      ],
    }),
    api({
      fn: 'draw_cylinder',
      title: 'cilindro em',
      category: SHAPES,
      level: 1,
      role: 'statement',
      help: 'Um cilindro de pé: raio de cima, raio de baixo (raio de cima 0 faz um cone), altura e quantos lados.',
      params: [
        p('position', '', v3(0, 0, 0)),
        p('radiusTop', 'raio de cima', n(1)),
        p('radiusBottom', 'raio de baixo', n(1)),
        p('height', 'altura', n(2)),
        p('slices', 'lados', n(16)),
        color('PURPLE'),
      ],
    }),
    api({
      fn: 'draw_cylinder_ex',
      title: 'cilindro de',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Um cilindro entre dois pontos, em qualquer direção: bom para canos, troncos e raios.',
      params: [
        p('startPos', '', v3(0, 0, 0)),
        p('endPos', 'até', v3(0, 2, 0)),
        p('startRadius', 'raio no começo', d(0.5)),
        p('endRadius', 'raio no fim', d(0.5)),
        p('sides', 'lados', n(16)),
        color('ORANGE'),
      ],
    }),
    api({
      fn: 'draw_capsule',
      title: 'cápsula de',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Um cilindro de pontas redondas entre dois pontos: bom para personagens simples.',
      params: [
        p('startPos', '', v3(0, 0.5, 0)),
        p('endPos', 'até', v3(0, 1.5, 0)),
        p('radius', 'raio', d(0.5)),
        p('rings', 'anéis', n(8)),
        p('slices', 'fatias', n(8)),
        color('VIOLET'),
      ],
    }),
    api({
      fn: 'draw_plane',
      title: 'chão em',
      category: SHAPES,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Um chão reto e deitado, com o centro na posição e o tamanho num Vector2 (largura e comprimento).',
      params: [
        p('centerPos', '', v3(0, 0, 0)),
        p('size', 'tamanho', ctor('Vector2', n(10), n(10))),
        color('LIGHTGRAY'),
      ],
    }),
    api({
      fn: 'draw_grid',
      title: '# grade com',
      category: SHAPES,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Uma grade no chão, centralizada, com quantas linhas e o espaço entre elas: ajuda a ver onde as coisas estão.',
      params: [p('slices', '', n(10)), p('spacing', 'espaço', n(1))],
    }),
    api({
      fn: 'draw_line_3d',
      title: 'linha 3D de',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Uma linha fina entre dois pontos 3D.',
      params: [p('startPos', '', v3(0, 0, 0)), p('endPos', 'até', v3(2, 2, 2)), color('BLACK')],
    }),
    api({
      fn: 'draw_triangle_3d',
      title: 'triângulo 3D com os pontos',
      category: SHAPES,
      level: 3,
      role: 'statement',
      help: 'Um triângulo com três pontos 3D, em sentido anti-horário visto de frente (do outro lado ele some).',
      params: [
        p('v1', '', v3(0, 0, 0)),
        p('v2', 'e', v3(1, 0, 0)),
        p('v3', 'e', v3(0, 1, 0)),
        color('GREEN'),
      ],
    }),
    api({
      fn: 'draw_bounding_box',
      title: 'desenhar a caixa',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'As arestas de uma caixa (BoundingBox): bom para ver a caixa de colisão de um modelo.',
      params: [p('box', '', id('caixa')), color('LIME')],
    }),
    api({
      fn: 'draw_ray',
      title: 'desenhar o raio',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Mostra um raio (Ray) como uma linha comprida: bom para ver para onde se está mirando.',
      params: [p('ray', '', id('raio')), color()],
    }),
    api({
      fn: 'draw_billboard',
      title: 'figura virada para a câmera',
      category: SHAPES,
      level: 2,
      role: 'statement',
      help: 'Desenha uma imagem no mundo 3D sempre de frente para a câmera, como os inimigos dos jogos antigos de labirinto.',
      params: [
        p('camera', '', id('camera')),
        p('texture', 'imagem', id('figura')),
        p('position', 'em', v3(0, 1, 0)),
        p('scale', 'tamanho', n(2)),
        tint(),
      ],
    }),
    api({
      fn: 'draw_billboard_rec',
      title: 'pedaço da figura virado para a câmera',
      category: SHAPES,
      level: 3,
      role: 'statement',
      help: 'Como a figura virada para a câmera, mas só um pedaço da imagem (um quadro de uma folha do Pinta).',
      params: [
        p('camera', '', id('camera')),
        p('texture', 'imagem', id('folha')),
        p('source', 'pedaço', ctor('Rectangle', n(0), n(0), n(32), n(32))),
        p('position', 'em', v3(0, 1, 0)),
        p('size', 'tamanho', ctor('Vector2', n(2), n(2))),
        tint(),
      ],
    }),
    // 🗿 Modelos
    api({
      fn: 'load_model',
      title: '🗿 carregar o modelo',
      category: MODELS,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Abre um modelo 3D .glb (do Molda, pela janela "Materiais do jogo"): load_model("models/nave.glb"). Guarde numa variável e desenhe com "desenhar o modelo".',
      params: [p('fileName', '', s('models/nave.glb'))],
      dependencies: ['draw_model'],
    }),
    api({
      fn: 'draw_model',
      title: 'desenhar o modelo',
      category: MODELS,
      level: 1,
      role: 'statement',
      starter: true,
      help: 'Desenha o modelo com o centro na posição e o tamanho (1 é o tamanho do arquivo).',
      params: [
        p('model', '', id('modelo')),
        p('position', 'em', v3(0, 0, 0)),
        p('scale', 'tamanho', n(1)),
        tint(),
      ],
    }),
    api({
      fn: 'draw_model_ex',
      title: 'desenhar o modelo girado',
      category: MODELS,
      level: 2,
      role: 'statement',
      help: 'Desenha o modelo girado em volta de um eixo (Vector3(0, 1, 0) gira de lado), com o ângulo em graus e o tamanho em cada direção.',
      params: [
        p('model', '', id('modelo')),
        p('position', 'em', v3(0, 0, 0)),
        p('rotationAxis', 'eixo', v3(0, 1, 0)),
        p('rotationAngle', 'ângulo', n(0)),
        p('scale', 'tamanho', v3(1, 1, 1)),
        tint(),
      ],
    }),
    api({
      fn: 'draw_model_wires',
      title: 'desenhar as linhas do modelo',
      category: MODELS,
      level: 2,
      role: 'statement',
      help: 'Só os triângulos do modelo, em linhas: mostra como ele é feito por dentro.',
      params: [
        p('model', '', id('modelo')),
        p('position', 'em', v3(0, 0, 0)),
        p('scale', 'tamanho', n(1)),
        p('tint', 'tom', id('BLACK')),
      ],
    }),
    api({
      fn: 'gen_mesh_cube',
      title: 'malha de cubo com largura',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'Uma malha de cubo pronta. Vire modelo com "modelo da malha" para pôr textura e desenhar.',
      params: [p('width', '', n(1)), p('height', 'altura', n(1)), p('length', 'comprimento', n(1))],
      dependencies: ['load_model_from_mesh'],
    }),
    api({
      fn: 'gen_mesh_sphere',
      title: 'malha de bola com raio',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'Uma malha de bola pronta, com anéis e fatias (mais anéis, mais redonda).',
      params: [p('radius', '', n(1)), p('rings', 'anéis', n(16)), p('slices', 'fatias', n(16))],
      dependencies: ['load_model_from_mesh'],
    }),
    api({
      fn: 'gen_mesh_plane',
      title: 'malha de chão com largura',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'Uma malha de chão deitado, dividida em pedaços (resX e resZ).',
      params: [
        p('width', '', n(10)),
        p('length', 'comprimento', n(10)),
        p('resX', 'pedaços na largura', n(1)),
        p('resZ', 'pedaços no comprimento', n(1)),
      ],
      dependencies: ['load_model_from_mesh'],
    }),
    api({
      fn: 'gen_mesh_cylinder',
      title: 'malha de cilindro com raio',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'Uma malha de cilindro pronta.',
      params: [p('radius', '', n(1)), p('height', 'altura', n(2)), p('slices', 'lados', n(16))],
      dependencies: ['load_model_from_mesh'],
    }),
    api({
      fn: 'load_model_from_mesh',
      title: 'modelo da malha',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'Transforma uma malha num modelo, que dá para desenhar e vestir com uma textura.',
      params: [p('mesh', '', id('malha'))],
      dependencies: ['draw_model'],
    }),
    api({
      fn: 'set_material_texture',
      title: 'vestir o material',
      category: MODELS,
      level: 2,
      role: 'statement',
      help: 'Põe uma imagem num material do modelo: set_material_texture(modelo.materials[0], MATERIAL_MAP_ALBEDO, textura).',
      params: [
        p('material', '', id('material')),
        p('mapType', 'no mapa', id('MATERIAL_MAP_ALBEDO')),
        p('texture', 'com a imagem', id('textura')),
      ],
    }),
    choice({
      key: 'material_map',
      title: 'mapa do material',
      category: MODELS,
      level: 3,
      help: 'Qual parte do material recebe a imagem: a cor (albedo) é a de sempre.',
      choices: MATERIAL_MAPS,
      initial: 'MATERIAL_MAP_ALBEDO',
    }),
    api({
      fn: 'get_model_bounding_box',
      title: 'caixa do modelo',
      category: MODELS,
      level: 2,
      role: 'value',
      help: 'A caixa (BoundingBox) que envolve o modelo, no lugar em que o arquivo o deixou. Some a posição a min e max para colidir.',
      params: [p('model', '', id('modelo'))],
    }),
    api({
      fn: 'matrix_rotate_y',
      title: 'giro de lado em radianos',
      category: MODELS,
      level: 3,
      role: 'value',
      help: 'Uma matriz que gira em volta do eixo de cima (Y). Guarde em modelo.transform para o modelo nascer virado.',
      params: [p('angle', '', d(1.57))],
    }),
    api({
      fn: 'matrix_rotate_xyz',
      title: 'giro nos três eixos em radianos',
      category: MODELS,
      level: 3,
      role: 'value',
      help: 'Uma matriz que gira em X, Y e Z de uma vez (um Vector3 de ângulos em radianos).',
      params: [p('angle', '', v3(0, 0, 0))],
    }),
    api({
      fn: 'matrix_translate',
      title: 'matriz que move x',
      category: MODELS,
      level: 3,
      role: 'value',
      help: 'Uma matriz que move o modelo (ou a malha de draw_mesh).',
      params: [p('x', '', n(0)), p('y', 'y', n(0)), p('z', 'z', n(0))],
    }),
    api({
      fn: 'matrix_multiply',
      title: 'juntar as matrizes',
      category: MODELS,
      level: 3,
      role: 'value',
      help: 'Uma matriz que faz a primeira e depois a segunda (girar e depois mover).',
      params: [p('left', '', id('girar')), p('right', 'e depois', id('mover'))],
    }),
    // 🏃 Animações
    api({
      fn: 'load_model_animations',
      title: '🏃 carregar os movimentos do arquivo',
      category: ANIMATION,
      level: 2,
      role: 'value',
      help: 'Os movimentos de um modelo com esqueleto (do Molda): use movimentos = load_model_animations("models/heroi.glb", quantos), com quantos = ffi.new("int *", 0). Depois quantos[0] diz quantos movimentos vieram.',
      params: [
        p('fileName', '', s('models/heroi.glb')),
        p('animCount', 'contando em', id('quantos')),
      ],
      dependencies: ['update_model_animation', 'ffi_new'],
    }),
    ffiNew,
    api({
      fn: 'update_model_animation',
      title: 'pôr o modelo na pose do movimento',
      category: ANIMATION,
      level: 2,
      role: 'statement',
      help: 'Põe o modelo na pose de um quadro do movimento (movimentos[0], movimentos[1]…). Some 1 ao quadro a cada volta e volte a 0 em movimento.keyframeCount.',
      params: [
        p('model', '', id('modelo')),
        p('anim', 'no movimento', id('movimento')),
        p('frame', 'quadro', id('quadro')),
      ],
    }),
    api({
      fn: 'is_model_animation_valid',
      title: 'o movimento serve no modelo',
      category: ANIMATION,
      level: 3,
      role: 'value',
      help: 'Verdadeiro quando o movimento tem os mesmos ossos do modelo.',
      params: [p('model', '', id('modelo')), p('anim', 'e', id('movimento'))],
    }),
    // 💥 Colisões 3D
    api({
      fn: 'BoundingBox',
      title: 'caixa de',
      category: HITS,
      level: 1,
      role: 'value',
      help: 'Uma caixa pelos cantos mínimo e máximo (dois Vector3): o jeito de colidir em 3D.',
      params: [p('min', '', v3(-1, 0, -1)), p('max', 'até', v3(1, 2, 1))],
    }),
    api({
      fn: 'check_collision_boxes',
      title: 'as caixas se encostam',
      category: HITS,
      level: 1,
      role: 'value',
      help: 'Verdadeiro quando duas caixas (BoundingBox) se encostam.',
      params: [p('box1', '', id('jogador')), p('box2', 'e', id('parede'))],
    }),
    api({
      fn: 'check_collision_spheres',
      title: 'as bolas se encostam: centro',
      category: HITS,
      level: 2,
      role: 'value',
      help: 'Verdadeiro quando duas bolas (centro e raio) se encostam.',
      params: [
        p('center1', '', id('pos1')),
        p('radius1', 'raio', n(1)),
        p('center2', 'e o centro', id('pos2')),
        p('radius2', 'raio', n(1)),
      ],
    }),
    api({
      fn: 'check_collision_box_sphere',
      title: 'a caixa encosta na bola',
      category: HITS,
      level: 2,
      role: 'value',
      help: 'Verdadeiro quando uma caixa encosta numa bola (centro e raio).',
      params: [
        p('box', '', id('caixa')),
        p('center', 'de centro', id('pos')),
        p('radius', 'raio', n(1)),
      ],
    }),
    api({
      fn: 'Ray',
      title: 'raio saindo de',
      category: HITS,
      level: 2,
      role: 'value',
      help: 'Um raio: um ponto de saída e uma direção (Vector3). Use para mirar e ver no que ele bate.',
      params: [p('position', '', v3(0, 1, 0)), p('direction', 'na direção', v3(0, 0, -1))],
    }),
    api({
      fn: 'get_ray_collision_box',
      title: 'o raio bate na caixa',
      category: HITS,
      level: 2,
      role: 'value',
      help: 'O que acontece com um raio e uma caixa: .hit diz se bateu, .distance a distância, .point onde e .normal para que lado a face olha.',
      params: [p('ray', '', id('raio')), p('box', 'na caixa', id('caixa'))],
    }),
    api({
      fn: 'get_ray_collision_sphere',
      title: 'o raio bate na bola',
      category: HITS,
      level: 2,
      role: 'value',
      help: 'O que acontece com um raio e uma bola (centro e raio): .hit, .distance, .point e .normal.',
      params: [
        p('ray', '', id('raio')),
        p('center', 'de centro', id('pos')),
        p('radius', 'raio', n(1)),
      ],
    }),
    api({
      fn: 'get_ray_collision_mesh',
      title: 'o raio bate na malha',
      category: HITS,
      level: 3,
      role: 'value',
      help: 'O raio contra os triângulos de uma malha (modelo.meshes[0]) na posição de uma matriz.',
      params: [
        p('ray', '', id('raio')),
        p('mesh', 'na malha', id('malha')),
        p('transform', 'com a matriz', id('matriz')),
      ],
    }),
    // 🧭 Vetores 3D
    api({
      fn: 'Vector3',
      title: 'vetor 3D x',
      category: VECTORS,
      level: 1,
      role: 'value',
      starter: true,
      help: 'Um ponto ou uma direção 3D: x para os lados, y para cima e z para a frente e para trás.',
      params: [p('x', '', n(0)), p('y', 'y', n(0)), p('z', 'z', n(0))],
    }),
    api({
      fn: 'vector3_add',
      title: 'somar os vetores 3D',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'Um vetor novo com x, y e z somados: posição + velocidade.',
      params: [p('v1', '', id('pos')), p('v2', 'e', id('velocidade'))],
    }),
    api({
      fn: 'vector3_subtract',
      title: 'subtrair os vetores 3D',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'O primeiro menos o segundo: alvo - posição dá a direção até o alvo.',
      params: [p('v1', '', id('alvo')), p('v2', 'menos', id('pos'))],
    }),
    api({
      fn: 'vector3_scale',
      title: 'multiplicar o vetor 3D',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'O vetor com x, y e z multiplicados por um número: direção × velocidade × tempo.',
      params: [p('v', '', id('direcao')), p('scalar', 'por', d(0.5))],
    }),
    api({
      fn: 'vector3_normalize',
      title: 'direção do vetor 3D',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'O mesmo vetor com tamanho 1: só a direção. Assim andar na diagonal não fica mais rápido.',
      params: [p('v', '', id('direcao'))],
    }),
    api({
      fn: 'vector3_length',
      title: 'tamanho do vetor 3D',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'O comprimento do vetor.',
      params: [p('v', '', id('direcao'))],
    }),
    api({
      fn: 'vector3_distance',
      title: 'distância entre',
      category: VECTORS,
      level: 2,
      role: 'value',
      help: 'A distância entre dois pontos 3D.',
      params: [p('v1', '', id('pos')), p('v2', 'e', id('alvo'))],
    }),
    api({
      fn: 'vector3_lerp',
      title: 'caminho entre',
      category: VECTORS,
      level: 3,
      role: 'value',
      help: 'Um ponto no caminho entre dois pontos: 0 é o primeiro, 1 o segundo, 0.5 o meio. Bom para a câmera seguir devagar.',
      params: [
        p('v1', '', id('camera_pos')),
        p('v2', 'e', id('alvo')),
        p('amount', 'quanto', d(0.1)),
      ],
    }),
    api({
      fn: 'vector3_rotate_by_axis_angle',
      title: 'girar o vetor 3D',
      category: VECTORS,
      level: 3,
      role: 'value',
      help: 'Gira um vetor em volta de um eixo, com o ângulo em radianos: bom para virar a direção em que se anda.',
      params: [
        p('v', '', id('direcao')),
        p('axis', 'em volta de', v3(0, 1, 0)),
        p('angle', 'ângulo', d(0.1)),
      ],
    }),
    // 🖱️ Mouse travado
    api({
      fn: 'disable_cursor',
      title: '🖱️ travar o mouse no jogo',
      category: MOUSE,
      level: 2,
      role: 'statement',
      help: 'Esconde e prende o mouse na janela (depois de um clique nela): o mouse passa a girar o olhar, como nos jogos em primeira pessoa. No navegador, Esc solta o mouse. Lembre que Esc também fecha o jogo do raylib, a não ser que você use set_exit_key(KEY_NULL).',
    }),
    api({
      fn: 'enable_cursor',
      title: 'soltar o mouse',
      category: MOUSE,
      level: 2,
      role: 'statement',
      help: 'Mostra o mouse de novo e o deixa sair da janela (bom no menu e na tela de fim).',
    }),
    api({
      fn: 'is_cursor_hidden',
      title: 'o mouse está escondido',
      category: MOUSE,
      level: 3,
      role: 'value',
      help: 'Verdadeiro quando o mouse está travado e escondido.',
    }),
    // ✨ Shaders
    api({
      fn: 'load_shader_from_memory',
      title: '✨ shader com o vertex',
      category: SHADERS,
      level: 3,
      role: 'value',
      help: 'Um shader escrito no próprio programa (GLSL #version 330, como no computador). Sem vertex próprio, use ffi.NULL no primeiro. Ponha no modelo com modelo.materials[0].shader = shader.',
      params: [p('vsCode', '', NULL), p('fsCode', 'e o fragment', id('CLARAO'))],
    }),
    api({
      fn: 'load_shader',
      title: 'shader dos arquivos',
      category: SHADERS,
      level: 3,
      role: 'value',
      help: 'Um shader lido de arquivos .vs e .fs do projeto (ffi.NULL no lugar de um deles usa o padrão do raylib).',
      params: [p('vsFileName', '', NULL), p('fsFileName', 'e', s('flash.fs'))],
    }),
    api({
      fn: 'get_shader_location',
      title: 'onde fica no shader o valor',
      category: SHADERS,
      level: 3,
      role: 'value',
      help: 'O número de um uniform do shader (pelo nome), para mudar com "mudar o valor do shader". Dá -1 quando o shader não usa esse nome.',
      params: [p('shader', '', id('shader')), p('uniformName', 'chamado', s('flash'))],
    }),
    api({
      fn: 'set_shader_value',
      title: 'mudar o valor do shader',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'Muda um uniform do shader. O valor vem de uma caixinha do ffi (ffi.new("struct Vector2 *", [1, 0])) ou de um Vector, e o tipo diz quantos números ler.',
      params: [
        p('shader', '', id('shader')),
        p('locIndex', 'no lugar', id('lugar')),
        p('value', 'para', id('valor')),
        p('uniformType', 'do tipo', id('SHADER_UNIFORM_VEC2')),
      ],
    }),
    choice({
      key: 'uniform_type',
      title: 'tipo do valor do shader',
      category: SHADERS,
      level: 3,
      help: 'Quantos números o shader lê de uma vez.',
      choices: UNIFORMS,
      initial: 'SHADER_UNIFORM_VEC2',
    }),
    api({
      fn: 'begin_shader_mode',
      title: 'desenhar com o shader',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'O que desenhar depois (imagens, formas e textos 2D) passa pelo shader, até "parar o shader".',
      params: [p('shader', '', id('shader'))],
      dependencies: ['end_shader_mode'],
    }),
    api({
      fn: 'end_shader_mode',
      title: 'parar o shader',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'Volta a desenhar com o shader normal.',
    }),
    api({
      fn: 'rl_disable_backface_culling',
      title: 'mostrar os dois lados das faces',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'Desenha também o lado de dentro das faces (o raylib esconde o lado de trás): bom para ver o céu de dentro de uma bola.',
    }),
    api({
      fn: 'rl_enable_backface_culling',
      title: 'esconder o lado de trás das faces',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'Volta ao normal do raylib: o lado de trás das faces não aparece.',
    }),
    api({
      fn: 'rl_disable_depth_mask',
      title: 'desenhar sem guardar a profundidade',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'O que desenhar depois não esconde o que vier atrás dele (bom para o céu, que fica sempre no fundo).',
    }),
    api({
      fn: 'rl_enable_depth_mask',
      title: 'voltar a guardar a profundidade',
      category: SHADERS,
      level: 3,
      role: 'statement',
      help: 'Volta ao normal: o que está na frente esconde o que está atrás.',
    }),
  ]
}
