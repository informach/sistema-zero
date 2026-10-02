import type { SceneTwoDApi } from './contract'

export type SceneTarget = 'g2d' | 'gk'
/** The three things a child names here. Each has its own list of names in use. */
export type SceneNameKind = 'layer' | 'track' | 'object'
export const SCENE_NAME_KINDS = [
  'layer',
  'track',
  'object',
] as const satisfies readonly SceneNameKind[]
export interface SceneArgument {
  name: string
  value: string | number | boolean
  field?: 'image' | 'select'
  options?: readonly (readonly [string, string])[]
  /** This block gives the name its existence: the child types it here, once. */
  declares?: SceneNameKind
  /**
   * This block uses a name created elsewhere: its socket is born with a list of the
   * names in use. It stays a socket, so a name built in a loop still fits.
   */
  picks?: SceneNameKind
}
export interface SceneMethod {
  method: keyof SceneTwoDApi
  block: string
  message: string
  args: readonly SceneArgument[]
  value?: boolean
  family: 'layers' | 'track'
  tooltip: string
}
const n = (name: string, value: number): SceneArgument => ({ name, value })
const s = (name: string, value: string): SceneArgument => ({ name, value })
const newLayer: SceneArgument = { ...s('NAME', 'montanhas'), declares: 'layer' }
const newTrack: SceneArgument = { ...s('TRACK', 'pista'), declares: 'track' }
const newObject: SceneArgument = { ...s('OBJECT', 'bandeira'), declares: 'object' }
const layer: SceneArgument = { ...s('NAME', 'montanhas'), picks: 'layer' }
const track: SceneArgument = { ...s('TRACK', 'pista'), picks: 'track' }
const object: SceneArgument = { ...s('OBJECT', 'bandeira'), picks: 'object' }
const image: SceneArgument = { name: 'IMAGE', value: '', field: 'image' }
// The option carries its own preposition: one shared label would read "no frente".
const passOf = (back: string, front: string): SceneArgument => ({
  name: 'PASS',
  value: 'back',
  field: 'select',
  options: [
    [back, 'back'],
    [front, 'front'],
  ],
})

/** One vocabulary drives blocks, bridge, schema and palette defaults for both engines. */
export const SCENE_METHODS: readonly SceneMethod[] = [
  {
    method: 'createSceneLayer',
    block: 'create_scene_layer',
    family: 'layers',
    message: 'Criar camada %1 imagem %2 %3',
    args: [newLayer, image, passOf('no fundo', 'na frente')],
    tooltip:
      'Cria uma camada independente. Áreas transparentes deixam aparecer as camadas abaixo. O nome identifica a camada; a mesma imagem pode ser usada várias vezes. Use em ⚙️ Ao iniciar: dentro do laço, a camada voltaria ao começo a cada quadro.',
  },
  {
    method: 'transformSceneLayer',
    block: 'transform_scene_layer',
    family: 'layers',
    message: 'Camada %1 em x %2 y %3 escala %4 opacidade %5',
    args: [layer, n('X', 0), n('Y', 0), n('SCALE', 1), n('OPACITY', 1)],
    tooltip:
      'Posição do canto superior esquerdo. Escala 1 usa o tamanho original. Opacidade de 0 (invisível) a 1 (sólida); preserva a transparência da imagem.',
  },
  {
    method: 'motionSceneLayer',
    block: 'motion_scene_layer',
    family: 'layers',
    message: 'Camada %1 acompanha %2 fator x %3 y %4 e %5',
    args: [
      layer,
      {
        name: 'SPACE',
        value: 'screen',
        field: 'select',
        options: [
          ['a tela', 'screen'],
          ['o mundo', 'world'],
          ['a câmera em paralaxe', 'parallax'],
        ],
      },
      n('FX', 0.3),
      n('FY', 0.3),
      {
        name: 'REPEAT',
        value: 'none',
        field: 'select',
        options: [
          ['não se repete', 'none'],
          ['se repete para os lados', 'x'],
          ['se repete para cima e para baixo', 'y'],
          ['se repete para todos os lados', 'both'],
        ],
      },
    ],
    tooltip:
      'Tela fica parada; mundo acompanha a câmera; paralaxe anda uma fração dela (fator 0.3 = 30%). Repetir para os lados emenda cópias da imagem numa faixa sem fim, sem empilhar.',
  },
  {
    method: 'orderSceneLayer',
    block: 'order_scene_layer',
    family: 'layers',
    message: 'Ordem da camada %1 = %2',
    args: [layer, n('ORDER', 0)],
    tooltip: 'Números maiores aparecem por cima. Empates mantêm a ordem de criação.',
  },
  {
    method: 'showSceneLayer',
    block: 'show_scene_layer',
    family: 'layers',
    message: 'Camada %1 visível %2',
    args: [layer, { name: 'VISIBLE', value: true }],
    tooltip: 'Mostra ou esconde sem remover a camada.',
  },
  {
    method: 'removeSceneLayer',
    block: 'remove_scene_layer',
    family: 'layers',
    message: 'Remover camada %1',
    args: [layer],
    tooltip: 'Remove apenas a camada com esse nome.',
  },
  {
    method: 'drawSceneLayers',
    block: 'draw_scene_layers',
    family: 'layers',
    message: 'Desenhar camadas %1',
    args: [passOf('do fundo', 'da frente')],
    tooltip:
      'Use a cada quadro: fundo antes dos objetos, frente depois. O fundo limpa o quadro anterior e conserva o cenário fixo como base. Até 64 camadas.',
  },
  {
    method: 'createTrack',
    block: 'create_track',
    family: 'track',
    message: 'Criar pista %1 horizonte %2 % foco %3 altura %4 recuo %5',
    args: [newTrack, n('HORIZON', 28), n('FOCAL', 300), n('HEIGHT', 160), n('FOLLOW', 120)],
    tooltip:
      'Perspectiva 2D: X é lateral e Z é distância pela pista. Objetos próximos crescem. Horizonte em % da tela; foco, altura da câmera e recuo em unidades do mundo. Criar novamente reinicia a pista: use em ⚙️ Ao iniciar ou em uma função de recomeço, nunca no laço.',
  },
  {
    method: 'viewTrack',
    block: 'view_track',
    family: 'track',
    message: 'Pista %1 mostrar de %2 até %3 de distância',
    args: [track, n('NEAR', 20), n('FAR', 4000)],
    tooltip:
      'Limita as distâncias visíveis a partir da câmera. Perto deve ser maior que zero; longe deve ser maior que perto.',
  },
  {
    method: 'cameraTrack',
    block: 'camera_track',
    family: 'track',
    message: 'Câmera da pista %1 lateral x %2 distância z %3',
    args: [track, n('X', 0), n('Z', 0)],
    tooltip:
      'Reposiciona a câmera e o progresso sem disparar encontros pelo caminho. Use Avançar para mover durante a partida. Manter a mesma distância (só o x muda) preserva o passo do último Avançar.',
  },
  {
    method: 'advanceTrack',
    block: 'advance_track',
    family: 'track',
    message: 'Avançar na pista %1 distância %2',
    args: [track, n('DISTANCE', 5)],
    tooltip:
      'Avança em Z e registra o intervalo percorrido neste passo. Consulte encontros logo depois. Jogo 2D: velocidade/60. Avançado: velocidade × dt.',
  },
  {
    method: 'placeTrackObject',
    block: 'place_track_object',
    family: 'track',
    message: 'Na pista %1 objeto %2 imagem %3 lateral x %4 distância z %5 largura %6 altura %7',
    args: [track, newObject, image, n('X', 0), n('Z', 600), n('WIDTH', 40), n('HEIGHT', 80)],
    tooltip:
      'Cria ou substitui um objeto com tamanho no mundo; o pé fica no chão e o centro em X. O nome pode ser um texto ou um número, como o contador de um laço. Até 2048 objetos por pista. Não altera sprites do jogo.',
  },
  {
    method: 'moveTrackObject',
    block: 'move_track_object',
    family: 'track',
    message: 'Na pista %1 mover objeto %2 para x %3 z %4',
    args: [track, object, n('X', 0), n('Z', 600)],
    tooltip:
      'Reposiciona o objeto no mundo, preservando imagem e tamanho. Os encontros acompanham o avanço da câmera, não o movimento do objeto.',
  },
  {
    method: 'removeTrackObject',
    block: 'remove_track_object',
    family: 'track',
    message: 'Na pista %1 remover objeto %2',
    args: [track, object],
    tooltip: 'Remove um objeto coletado ou que ficou para trás.',
  },
  {
    method: 'drawTrack',
    block: 'draw_track',
    family: 'track',
    message: 'Desenhar objetos da pista %1',
    args: [track],
    tooltip:
      'Desenha do mais distante ao mais próximo em coordenadas da tela. Use entre camadas de fundo e de frente; não limpa o fundo.',
  },
  {
    method: 'trackValue',
    block: 'track_value',
    family: 'track',
    value: true,
    message: 'Pista %1 valor %2',
    args: [
      track,
      {
        name: 'PROPERTY',
        value: 'distance',
        field: 'select',
        options: [
          ['distância percorrida', 'distance'],
          ['distância anterior', 'previous'],
          ['câmera lateral x', 'x'],
        ],
      },
    ],
    tooltip: 'Lê o progresso atual, o anterior ou a câmera lateral.',
  },
  {
    method: 'projectTrack',
    block: 'project_track',
    family: 'track',
    value: true,
    message: 'Na pista %1 projetar x %2 z %3 obter %4',
    args: [
      track,
      n('X', 0),
      n('Z', 600),
      {
        name: 'PROPERTY',
        value: 'x',
        field: 'select',
        options: [
          ['x na tela', 'x'],
          ['pé y na tela', 'y'],
          ['escala', 'scale'],
          ['visível (1 ou 0)', 'visible'],
        ],
      },
    ],
    tooltip:
      'Converte mundo X/Z para tela. Escala = foco/distância. Fora do alcance retorna 0; verifique visível antes de usar as coordenadas.',
  },
  {
    method: 'trackPassed',
    block: 'track_passed',
    family: 'track',
    value: true,
    message: 'Na pista %1 passou pelo objeto %2 neste passo?',
    args: [track, object],
    tooltip:
      'Testa se o último Avançar cruzou a distância do objeto, inclusive em um salto grande. Remova objetos já tratados ou avance novamente.',
  },
  {
    method: 'trackTouching',
    block: 'track_touching',
    family: 'track',
    value: true,
    message: 'Na pista %1 encontrou objeto %2 com jogador x %3 largura %4?',
    args: [track, object, n('X', 0), n('WIDTH', 30)],
    tooltip:
      'Cruza a distância do objeto neste passo E sobrepõe as larguras no mundo. Use logo depois de Avançar. Não é colisão entre retângulos da tela.',
  },
]

export const sceneMethod = (method: string) =>
  SCENE_METHODS.find((entry) => entry.method === method)
export const sceneBlockType = (target: SceneTarget, entry: SceneMethod) =>
  `sz_${target}_${entry.block}`
/** The hidden value block that sits in a name socket and lists the names in use. */
export const sceneNameBlockType = (target: SceneTarget, kind: SceneNameKind) =>
  `sz_${target}_scene_${kind}_name`
const SCENE_NAME_BLOCK_TYPES: ReadonlySet<string> = new Set(
  (['g2d', 'gk'] as const).flatMap((target) =>
    SCENE_NAME_KINDS.map((kind) => sceneNameBlockType(target, kind)),
  ),
)
/** True for the list block of either engine; for the program it is plain text. */
export const isSceneNameBlock = (type: string): boolean => SCENE_NAME_BLOCK_TYPES.has(type)

/**
 * A saved project with every list block read as the text it holds. Checks that look
 * at blocks (a lesson asking for "this layer, by this name") know text literals and
 * nothing about these blocks. Returns the same reference when there is none to swap,
 * and walks with a stack: a long chain of blocks must not ride the call stack.
 */
export function sceneNamesAsText<T>(state: T): T {
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null
  const isName = (value: unknown): value is Record<string, unknown> =>
    isRecord(value) && typeof value.type === 'string' && isSceneNameBlock(value.type)
  let found = false
  const scan: unknown[] = [state]
  while (scan.length > 0 && !found) {
    const node = scan.pop()
    if (!isRecord(node)) continue
    if (isName(node)) found = true
    else for (const child of Object.values(node)) scan.push(child)
  }
  if (!found) return state
  const copy = structuredClone(state)
  const stack: unknown[] = [copy]
  while (stack.length > 0) {
    const node = stack.pop()
    if (!isRecord(node)) continue
    for (const [key, child] of Object.entries(node)) {
      if (isName(child)) {
        const fields = isRecord(child.fields) ? child.fields : {}
        const { type: _type, fields: _fields, ...rest } = child
        ;(node as Record<string, unknown>)[key] = {
          ...rest,
          type: 'sz_val_text',
          fields: { TEXT: fields.NAME ?? '' },
        }
      } else stack.push(child)
    }
  }
  return copy
}
/** The literal a value socket is born with, in the palette and back from the bridge. */
export function sceneLiteralShadow(arg: SceneArgument): {
  type: string
  fields: Record<string, string | number>
} {
  return typeof arg.value === 'number'
    ? { type: 'sz_val_number', fields: { NUM: arg.value } }
    : typeof arg.value === 'boolean'
      ? { type: 'sz_val_bool', fields: { VALUE: arg.value ? 'true' : 'false' } }
      : { type: 'sz_val_text', fields: { TEXT: arg.value } }
}
export const SCENE_NAME_DEFAULTS: Readonly<Record<SceneNameKind, string>> = {
  layer: 'montanhas',
  track: 'pista',
  object: 'bandeira',
}
/** The engine a scene block belongs to, read from its type. */
export const sceneTargetOf = (type: string): SceneTarget | undefined =>
  type.startsWith('sz_g2d_') ? 'g2d' : type.startsWith('sz_gk_') ? 'gk' : undefined
/**
 * Where a name of this kind is born: block type → name socket. Each engine keeps its
 * own scene, so a list asks for one engine; without it, both are returned.
 */
export function sceneNameDeclarations(
  kind: SceneNameKind,
  only?: SceneTarget,
): Record<string, string> {
  const found: Record<string, string> = {}
  for (const target of only ? [only] : (['g2d', 'gk'] as const)) {
    for (const entry of SCENE_METHODS) {
      const socket = entry.args.find((arg) => arg.declares === kind)
      if (socket) found[sceneBlockType(target, entry)] = socket.name
    }
  }
  return found
}
export const sceneTypes = (target: SceneTarget, family: SceneMethod['family']) =>
  SCENE_METHODS.filter((entry) => entry.family === family).map((entry) =>
    sceneBlockType(target, entry),
  )
