export const REINO_ZERO_ULTRA_THEMES = [
  'campo',
  'caverna',
  'agua',
  'canion',
  'floresta',
  'gelo',
  'vulcao',
  'castelo',
] as const

export type ReinoZeroUltraTheme = (typeof REINO_ZERO_ULTRA_THEMES)[number]

export interface ReinoZeroUltraEntity {
  id: string
  kind:
    | 'coin'
    | 'gem'
    | 'walker'
    | 'flyer'
    | 'spiky'
    | 'shell'
    | 'plant'
    | 'thrower'
    | 'chaser'
    | 'aquatic'
    | 'powerup'
    | 'life'
    | 'checkpoint'
    | 'portal'
    | 'exit'
    | 'secretExit'
    | 'boss'
  x: number
  y: number
  variant?: string
  health?: number
  range?: number
  speed?: number
  targetX?: number
  targetY?: number
}

export interface ReinoZeroUltraPlatform {
  id: string
  x: number
  y: number
  w: number
  range: number
  speed: number
  axis: 'x' | 'y'
}

export interface ReinoZeroUltraTrigger {
  kind: 'hint' | 'checkpoint' | 'camera' | 'secret'
  x: number
  y: number
  w: number
  h: number
  value: string
}

export interface ReinoZeroUltraStage {
  schemaVersion: 1
  id: string
  world: number
  stage: number
  theme: ReinoZeroUltraTheme
  width: number
  height: number
  timeLimit: number
  seed: number
  spawn: { x: number; y: number }
  tiles: string[]
  entities: ReinoZeroUltraEntity[]
  platforms: ReinoZeroUltraPlatform[]
  triggers: ReinoZeroUltraTrigger[]
  nextStage?: string
  secretStage?: string
}

const TILE_CHARS = new Set(['.', '#', '=', 'B', '?', 'U', 'S', 'F', '^', '~', 'H'])
const MAX_WIDTH = 128
const MAX_HEIGHT = 32
const MAX_ENTITIES = 128
const MAX_PLATFORMS = 64
const MAX_TRIGGERS = 256
const ENTITY_KINDS = new Set<ReinoZeroUltraEntity['kind']>([
  'coin',
  'gem',
  'walker',
  'flyer',
  'spiky',
  'shell',
  'plant',
  'thrower',
  'chaser',
  'aquatic',
  'powerup',
  'life',
  'checkpoint',
  'portal',
  'exit',
  'secretExit',
  'boss',
])
const TRIGGER_KINDS = new Set<ReinoZeroUltraTrigger['kind']>([
  'hint',
  'checkpoint',
  'camera',
  'secret',
])

type TileRect = readonly [x: number, y: number, w: number, h: number, tile: string]
type TileRun = readonly [x: number, y: number, w: number, tile: string]
type Gap = readonly [x: number, w: number, hazard?: '^' | '~']

interface StageBlueprint {
  id: string
  theme: ReinoZeroUltraTheme
  width: number
  height: number
  timeLimit: number
  hint: string
  spawn: { x: number; y: number }
  groundDepth?: number
  gaps: readonly Gap[]
  runs: readonly TileRun[]
  fills?: readonly TileRect[]
  entities: readonly ReinoZeroUltraEntity[]
  platforms?: readonly ReinoZeroUltraPlatform[]
  triggers?: readonly ReinoZeroUltraTrigger[]
  secretStage?: string
}

function rasterizeStage(blueprint: StageBlueprint): string[] {
  const { width, height } = blueprint
  const cells = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'))
  const put = (row: number, column: number, tile: string): void => {
    const line = cells[row]
    if (line && column >= 0 && column < width) line[column] = tile
  }

  const groundDepth = blueprint.groundDepth ?? 1
  for (let depth = 0; depth < groundDepth; depth += 1)
    for (let column = 0; column < width; column += 1) put(height - 1 - depth, column, '#')
  for (const [x, w, hazard] of blueprint.gaps)
    for (let column = x; column < x + w; column += 1) {
      for (let depth = 0; depth < groundDepth; depth += 1) put(height - 1 - depth, column, '.')
      if (hazard) put(height - 1, column, hazard)
    }
  for (const [x, y, w, tile] of blueprint.runs)
    for (let column = x; column < x + w; column += 1) put(y, column, tile)
  for (const [x, y, w, h, tile] of blueprint.fills ?? [])
    for (let row = y; row < y + h; row += 1)
      for (let column = x; column < x + w; column += 1) put(row, column, tile)
  return cells.map((row) => row.join(''))
}

function compileStage(blueprint: StageBlueprint, index: number): ReinoZeroUltraStage {
  const [worldText, stageText] = blueprint.id.split('-')
  const world = Number(worldText)
  const stage = Number(stageText)
  const nextStage =
    index < 31 ? `${Math.floor((index + 1) / 4) + 1}-${((index + 1) % 4) + 1}` : undefined
  return {
    schemaVersion: 1,
    id: blueprint.id,
    world,
    stage,
    theme: blueprint.theme,
    width: blueprint.width,
    height: blueprint.height,
    timeLimit: blueprint.timeLimit,
    seed: 147480 + index * 997,
    spawn: blueprint.spawn,
    tiles: rasterizeStage(blueprint),
    entities: [...blueprint.entities],
    platforms: [...(blueprint.platforms ?? [])],
    triggers: [
      {
        kind: 'hint',
        x: 2,
        y: blueprint.height - 7,
        w: 8,
        h: 6,
        value: blueprint.hint,
      },
      ...(blueprint.triggers ?? []),
    ],
    ...(nextStage ? { nextStage } : {}),
    ...(blueprint.secretStage ? { secretStage: blueprint.secretStage } : {}),
  }
}

const AUTHORED_STAGES: readonly StageBlueprint[] = [
  {
    id: '1-1',
    theme: 'campo',
    width: 72,
    height: 16,
    timeLimit: 300,
    hint: 'Pradaria inicial: corra, salte e acerte os blocos por baixo.',
    spawn: { x: 3, y: 11 },
    gaps: [
      [24, 2],
      [48, 3],
    ],
    runs: [
      [9, 11, 4, '='],
      [17, 9, 3, '='],
      [31, 11, 5, '='],
      [41, 8, 4, '='],
      [57, 10, 5, '='],
      [12, 8, 1, '?'],
      [34, 8, 1, 'B'],
      [53, 14, 1, 'S'],
    ],
    entities: [
      { id: 'm1', kind: 'coin', x: 10, y: 9 },
      { id: 'm2', kind: 'coin', x: 18, y: 7 },
      { id: 'andarilho-a', kind: 'walker', x: 21, y: 12, range: 80 },
      { id: 'casco-a', kind: 'shell', x: 39, y: 12, health: 2 },
      { id: 'poder-1', kind: 'powerup', x: 34, y: 7, variant: 'forte' },
      { id: 'checkpoint', kind: 'checkpoint', x: 45, y: 12 },
      { id: 'saida', kind: 'exit', x: 68, y: 12, variant: 'bandeira' },
    ],
  },
  {
    id: '1-2',
    theme: 'campo',
    width: 78,
    height: 16,
    timeLimit: 290,
    hint: 'Ponte dos ventos: procure o portal violeta sob a ponte alta.',
    spawn: { x: 3, y: 11 },
    gaps: [
      [19, 4],
      [42, 4],
      [61, 3],
    ],
    runs: [
      [8, 12, 6, '='],
      [18, 9, 6, '='],
      [29, 7, 5, '='],
      [40, 10, 8, 'F'],
      [55, 8, 5, '='],
      [67, 11, 5, '='],
      [33, 14, 1, 'S'],
    ],
    entities: [
      { id: 'm1', kind: 'coin', x: 20, y: 7 },
      { id: 'voador-a', kind: 'flyer', x: 31, y: 6, range: 110 },
      { id: 'espinho-a', kind: 'spiky', x: 51, y: 12 },
      { id: 'segredo-1', kind: 'secretExit', x: 57, y: 6 },
      { id: 'checkpoint', kind: 'checkpoint', x: 48, y: 12 },
      { id: 'saida', kind: 'exit', x: 74, y: 12, variant: 'bandeira' },
    ],
    platforms: [{ id: 'ponte-movel', x: 22, y: 11, w: 3, range: 4, speed: 1.1, axis: 'x' }],
    secretStage: '1-4',
  },
  {
    id: '1-3',
    theme: 'campo',
    width: 84,
    height: 17,
    timeLimit: 280,
    hint: 'Ruínas do pomar: plataformas frágeis cedem depois do primeiro passo.',
    spawn: { x: 3, y: 12 },
    gaps: [
      [15, 3],
      [34, 5],
      [58, 5],
    ],
    runs: [
      [9, 12, 4, '='],
      [15, 10, 4, 'F'],
      [24, 8, 5, '='],
      [34, 11, 5, 'F'],
      [45, 8, 4, '='],
      [57, 10, 7, 'F'],
      [70, 7, 5, '='],
      [78, 15, 1, 'S'],
    ],
    entities: [
      { id: 'andarilho-a', kind: 'walker', x: 12, y: 13 },
      { id: 'casco-a', kind: 'shell', x: 29, y: 13, health: 2 },
      { id: 'voador-a', kind: 'flyer', x: 47, y: 6, range: 90 },
      { id: 'vida-a', kind: 'life', x: 72, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 52, y: 13 },
      { id: 'saida', kind: 'exit', x: 81, y: 13, variant: 'arco' },
    ],
    platforms: [{ id: 'elevador-pomar', x: 39, y: 12, w: 3, range: 4, speed: 1, axis: 'y' }],
  },
  {
    id: '1-4',
    theme: 'campo',
    width: 76,
    height: 16,
    timeLimit: 260,
    hint: 'Jardim do guardião: derrote o Colosso Broto para abrir o arco.',
    spawn: { x: 3, y: 11 },
    gaps: [
      [20, 3],
      [38, 3],
    ],
    runs: [
      [10, 10, 5, '='],
      [21, 12, 5, '='],
      [31, 8, 4, '='],
      [39, 11, 5, '='],
      [50, 11, 20, '='],
    ],
    entities: [
      { id: 'planta-a', kind: 'plant', x: 14, y: 12, range: 48 },
      { id: 'andarilho-a', kind: 'walker', x: 29, y: 12 },
      { id: 'checkpoint', kind: 'checkpoint', x: 47, y: 12 },
      {
        id: 'guardiao-1',
        kind: 'boss',
        x: 57,
        y: 9,
        health: 6,
        speed: 38,
        range: 170,
        variant: 'broto',
      },
      { id: 'gema-1', kind: 'gem', x: 65, y: 8 },
      { id: 'saida', kind: 'exit', x: 72, y: 12, variant: 'arco' },
    ],
  },
  {
    id: '2-1',
    theme: 'caverna',
    width: 76,
    height: 18,
    timeLimit: 300,
    hint: 'Galerias de cristal: use as escadas para alternar entre os túneis.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [27, 3],
      [55, 3],
    ],
    runs: [
      [8, 13, 7, '='],
      [18, 10, 8, '='],
      [31, 13, 8, '='],
      [42, 8, 7, '='],
      [60, 11, 8, '='],
      [22, 11, 1, 'H'],
      [22, 12, 1, 'H'],
      [22, 13, 1, 'H'],
      [45, 9, 1, 'H'],
      [45, 10, 1, 'H'],
      [45, 11, 1, 'H'],
      [36, 15, 1, '?'],
    ],
    entities: [
      { id: 'planta-a', kind: 'plant', x: 13, y: 13 },
      { id: 'espinho-a', kind: 'spiky', x: 35, y: 14 },
      { id: 'poder-2', kind: 'powerup', x: 36, y: 13, variant: 'fogo' },
      { id: 'checkpoint', kind: 'checkpoint', x: 50, y: 14 },
      { id: 'saida', kind: 'exit', x: 72, y: 14, variant: 'cristal' },
    ],
  },
  {
    id: '2-2',
    theme: 'caverna',
    width: 82,
    height: 18,
    timeLimit: 290,
    hint: 'Poços de eco: os arremessadores vigiam a rota alta e o atalho secreto.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [17, 4],
      [39, 4],
      [63, 4],
    ],
    runs: [
      [10, 11, 5, '='],
      [18, 8, 5, '='],
      [28, 12, 6, '='],
      [40, 9, 6, '='],
      [52, 12, 6, '='],
      [64, 8, 6, '='],
      [74, 12, 4, '='],
      [31, 13, 1, 'H'],
      [31, 14, 1, 'H'],
      [31, 15, 1, 'H'],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 22, y: 6, range: 240 },
      { id: 'planta-a', kind: 'plant', x: 33, y: 14 },
      { id: 'arremesso-b', kind: 'thrower', x: 55, y: 10, range: 260 },
      { id: 'segredo-2', kind: 'secretExit', x: 67, y: 6 },
      { id: 'checkpoint', kind: 'checkpoint', x: 48, y: 14 },
      { id: 'saida', kind: 'exit', x: 78, y: 14, variant: 'cristal' },
    ],
    secretStage: '2-4',
  },
  {
    id: '2-3',
    theme: 'caverna',
    width: 88,
    height: 19,
    timeLimit: 285,
    hint: 'Mina vertical: combine escadas e elevadores sem cair nos espinhos.',
    spawn: { x: 3, y: 14 },
    groundDepth: 2,
    gaps: [
      [23, 3, '^'],
      [48, 3, '^'],
      [72, 3, '^'],
    ],
    runs: [
      [9, 14, 5, '='],
      [17, 11, 5, '='],
      [25, 8, 5, '='],
      [35, 12, 6, '='],
      [46, 9, 6, '='],
      [58, 6, 5, '='],
      [70, 10, 7, '='],
      [80, 13, 5, '='],
      [19, 12, 1, 'H'],
      [19, 13, 1, 'H'],
      [38, 10, 1, 'H'],
      [38, 11, 1, 'H'],
      [61, 7, 1, 'H'],
      [61, 8, 1, 'H'],
      [61, 9, 1, 'H'],
    ],
    entities: [
      { id: 'espinho-a', kind: 'spiky', x: 31, y: 15 },
      { id: 'voador-a', kind: 'flyer', x: 49, y: 7, range: 75 },
      { id: 'vida-a', kind: 'life', x: 60, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 65, y: 15 },
      { id: 'saida', kind: 'exit', x: 84, y: 15, variant: 'elevador' },
    ],
    platforms: [
      { id: 'elevador-a', x: 23, y: 13, w: 3, range: 4, speed: 1.05, axis: 'y' },
      { id: 'elevador-b', x: 51, y: 12, w: 3, range: 5, speed: 0.9, axis: 'y' },
    ],
  },
  {
    id: '2-4',
    theme: 'caverna',
    width: 78,
    height: 18,
    timeLimit: 260,
    hint: 'Câmara prismática: o Guardião Eco alterna investidas e projéteis.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [18, 3, '^'],
      [36, 3, '^'],
    ],
    runs: [
      [9, 12, 6, '='],
      [19, 10, 5, '='],
      [29, 8, 4, '='],
      [37, 11, 5, '='],
      [49, 13, 23, '='],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 27, y: 6 },
      { id: 'checkpoint', kind: 'checkpoint', x: 46, y: 14 },
      {
        id: 'guardiao-2',
        kind: 'boss',
        x: 57,
        y: 10,
        health: 7,
        speed: 42,
        range: 180,
        variant: 'eco',
      },
      { id: 'gema-2', kind: 'gem', x: 67, y: 9 },
      { id: 'saida', kind: 'exit', x: 74, y: 14, variant: 'cristal' },
    ],
  },
  {
    id: '3-1',
    theme: 'agua',
    width: 80,
    height: 18,
    timeLimit: 310,
    hint: 'Costa azul: dentro da água, use pulo para dar braçadas.',
    spawn: { x: 3, y: 13 },
    gaps: [
      [18, 12, '~'],
      [47, 14, '~'],
    ],
    runs: [
      [9, 12, 6, '='],
      [20, 10, 4, '='],
      [27, 13, 5, '='],
      [38, 9, 6, '='],
      [49, 12, 5, '='],
      [58, 8, 5, '='],
      [68, 12, 7, '='],
      [34, 14, 1, '?'],
    ],
    fills: [
      [18, 13, 12, 4, '~'],
      [47, 12, 14, 5, '~'],
    ],
    entities: [
      { id: 'aquatico-a', kind: 'aquatic', x: 23, y: 13, range: 100 },
      { id: 'aquatico-b', kind: 'aquatic', x: 52, y: 13, range: 110 },
      { id: 'poder-3', kind: 'powerup', x: 34, y: 12, variant: 'forte' },
      { id: 'checkpoint', kind: 'checkpoint', x: 44, y: 13 },
      { id: 'saida', kind: 'exit', x: 76, y: 13, variant: 'farol' },
    ],
  },
  {
    id: '3-2',
    theme: 'agua',
    width: 86,
    height: 18,
    timeLimit: 300,
    hint: 'Recifes gêmeos: nade pelo túnel ou salte pelas ilhas frágeis.',
    spawn: { x: 3, y: 13 },
    gaps: [
      [15, 18, '~'],
      [49, 20, '~'],
    ],
    runs: [
      [16, 9, 4, 'F'],
      [23, 7, 4, 'F'],
      [30, 10, 4, 'F'],
      [40, 12, 6, '='],
      [50, 8, 4, 'F'],
      [58, 6, 4, 'F'],
      [66, 9, 4, 'F'],
      [75, 12, 6, '='],
    ],
    fills: [
      [15, 11, 18, 6, '~'],
      [49, 10, 20, 7, '~'],
    ],
    entities: [
      { id: 'aquatico-a', kind: 'aquatic', x: 21, y: 12 },
      { id: 'voador-a', kind: 'flyer', x: 42, y: 8 },
      { id: 'aquatico-b', kind: 'aquatic', x: 60, y: 11 },
      { id: 'segredo-3', kind: 'secretExit', x: 59, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 46, y: 13 },
      { id: 'saida', kind: 'exit', x: 82, y: 13, variant: 'farol' },
    ],
    secretStage: '3-4',
  },
  {
    id: '3-3',
    theme: 'agua',
    width: 90,
    height: 19,
    timeLimit: 295,
    hint: 'Templo submerso: portais conectam as câmaras superior e inferior.',
    spawn: { x: 3, y: 14 },
    gaps: [
      [20, 16, '~'],
      [58, 16, '~'],
    ],
    runs: [
      [9, 13, 6, '='],
      [22, 9, 5, '='],
      [31, 12, 5, '='],
      [43, 7, 6, '='],
      [59, 11, 5, '='],
      [69, 8, 5, '='],
      [80, 13, 6, '='],
    ],
    fills: [
      [20, 12, 16, 6, '~'],
      [58, 11, 16, 7, '~'],
    ],
    entities: [
      {
        id: 'portal-baixo',
        kind: 'portal',
        x: 27,
        y: 13,
        targetX: 45,
        targetY: 5,
        variant: 'azul',
      },
      { id: 'portal-alto', kind: 'portal', x: 47, y: 5, targetX: 62, targetY: 9, variant: 'azul' },
      { id: 'aquatico-a', kind: 'aquatic', x: 33, y: 13 },
      { id: 'aquatico-b', kind: 'aquatic', x: 67, y: 12 },
      { id: 'vida-a', kind: 'life', x: 71, y: 6 },
      { id: 'checkpoint', kind: 'checkpoint', x: 54, y: 14 },
      { id: 'saida', kind: 'exit', x: 86, y: 14, variant: 'templo' },
    ],
  },
  {
    id: '3-4',
    theme: 'agua',
    width: 80,
    height: 18,
    timeLimit: 270,
    hint: 'Baía do guardião: a Serpe Marinha cruza água e plataformas.',
    spawn: { x: 3, y: 13 },
    gaps: [
      [17, 12, '~'],
      [38, 10, '~'],
    ],
    runs: [
      [9, 12, 5, '='],
      [19, 9, 5, '='],
      [27, 12, 5, '='],
      [39, 10, 5, '='],
      [50, 13, 24, '='],
    ],
    fills: [
      [17, 12, 12, 5, '~'],
      [38, 12, 10, 5, '~'],
    ],
    entities: [
      { id: 'aquatico-a', kind: 'aquatic', x: 23, y: 12 },
      { id: 'checkpoint', kind: 'checkpoint', x: 47, y: 14 },
      {
        id: 'guardiao-3',
        kind: 'boss',
        x: 58,
        y: 10,
        health: 8,
        speed: 46,
        range: 190,
        variant: 'marinho',
      },
      { id: 'gema-3', kind: 'gem', x: 68, y: 9 },
      { id: 'saida', kind: 'exit', x: 76, y: 14, variant: 'farol' },
    ],
  },
  {
    id: '4-1',
    theme: 'canion',
    width: 82,
    height: 17,
    timeLimit: 295,
    hint: 'Encosta do cânion: acelere nas rampas e freie antes dos poços.',
    spawn: { x: 3, y: 12 },
    groundDepth: 2,
    gaps: [
      [21, 4],
      [49, 5],
    ],
    runs: [
      [9, 11, 6, '='],
      [20, 8, 6, '='],
      [31, 11, 7, '='],
      [43, 7, 5, '='],
      [50, 10, 6, '='],
      [63, 8, 6, '='],
      [74, 12, 4, '='],
      [39, 15, 1, 'S'],
    ],
    entities: [
      { id: 'casco-a', kind: 'shell', x: 17, y: 13, health: 2 },
      { id: 'espinho-a', kind: 'spiky', x: 39, y: 13 },
      { id: 'poder-4', kind: 'powerup', x: 44, y: 5, variant: 'fogo' },
      { id: 'checkpoint', kind: 'checkpoint', x: 58, y: 13 },
      { id: 'saida', kind: 'exit', x: 78, y: 13, variant: 'sino' },
    ],
  },
  {
    id: '4-2',
    theme: 'canion',
    width: 88,
    height: 18,
    timeLimit: 290,
    hint: 'Pontes de pedra: trampolins alcançam a rota secreta sobre os paredões.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [18, 5],
      [40, 6],
      [67, 5],
    ],
    runs: [
      [9, 12, 5, '='],
      [18, 9, 6, 'F'],
      [29, 7, 5, '='],
      [40, 10, 7, 'F'],
      [53, 6, 5, '='],
      [67, 9, 6, 'F'],
      [78, 12, 6, '='],
      [16, 15, 1, 'S'],
      [49, 15, 1, 'S'],
    ],
    entities: [
      { id: 'voador-a', kind: 'flyer', x: 31, y: 5 },
      { id: 'perseguidor-a', kind: 'chaser', x: 55, y: 4, speed: 52 },
      { id: 'segredo-4', kind: 'secretExit', x: 55, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 62, y: 14 },
      { id: 'saida', kind: 'exit', x: 84, y: 14, variant: 'sino' },
    ],
    secretStage: '4-4',
  },
  {
    id: '4-3',
    theme: 'canion',
    width: 92,
    height: 18,
    timeLimit: 285,
    hint: 'Paredões azuis: elevadores verticais exigem saltos no tempo certo.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [16, 5],
      [35, 6],
      [57, 6],
      [77, 5],
    ],
    runs: [
      [9, 11, 5, '='],
      [18, 8, 4, '='],
      [31, 11, 4, '='],
      [39, 7, 5, '='],
      [53, 11, 4, '='],
      [61, 8, 5, '='],
      [73, 11, 4, '='],
      [80, 7, 6, '='],
    ],
    entities: [
      { id: 'casco-a', kind: 'shell', x: 27, y: 14, health: 2 },
      { id: 'perseguidor-a', kind: 'chaser', x: 48, y: 5, speed: 58 },
      { id: 'vida-a', kind: 'life', x: 83, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 68, y: 14 },
      { id: 'saida', kind: 'exit', x: 88, y: 14, variant: 'observatorio' },
    ],
    platforms: [
      { id: 'gelo-a', x: 21, y: 12, w: 3, range: 4, speed: 1.1, axis: 'y' },
      { id: 'gelo-b', x: 57, y: 12, w: 3, range: 5, speed: 0.85, axis: 'y' },
    ],
  },
  {
    id: '4-4',
    theme: 'canion',
    width: 82,
    height: 18,
    timeLimit: 265,
    hint: 'Pico do guardião: o Titã do Cânion salta e estilhaça o chão.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [20, 4, '^'],
      [39, 4, '^'],
    ],
    runs: [
      [9, 11, 6, '='],
      [20, 9, 6, 'F'],
      [31, 7, 5, '='],
      [40, 10, 5, 'F'],
      [51, 13, 25, '='],
    ],
    entities: [
      { id: 'espinho-a', kind: 'spiky', x: 29, y: 14 },
      { id: 'checkpoint', kind: 'checkpoint', x: 48, y: 14 },
      {
        id: 'guardiao-4',
        kind: 'boss',
        x: 60,
        y: 10,
        health: 9,
        speed: 48,
        range: 190,
        variant: 'tita',
      },
      { id: 'gema-4', kind: 'gem', x: 70, y: 9 },
      { id: 'saida', kind: 'exit', x: 78, y: 14, variant: 'sino' },
    ],
  },
  {
    id: '5-1',
    theme: 'floresta',
    width: 84,
    height: 17,
    timeLimit: 290,
    hint: 'Mata solar: use as molas para cruzar os vales de espinhos.',
    spawn: { x: 3, y: 12 },
    groundDepth: 2,
    gaps: [
      [18, 5, '^'],
      [45, 6, '^'],
      [68, 4, '^'],
    ],
    runs: [
      [9, 11, 5, '='],
      [18, 8, 6, '='],
      [30, 11, 6, '='],
      [44, 7, 7, '='],
      [58, 10, 6, '='],
      [69, 8, 5, '='],
      [79, 13, 2, '='],
      [16, 14, 1, 'S'],
      [39, 14, 1, 'S'],
      [65, 14, 1, 'S'],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 32, y: 9 },
      { id: 'espinho-a', kind: 'spiky', x: 57, y: 13 },
      { id: 'poder-5', kind: 'powerup', x: 47, y: 5, variant: 'forte' },
      { id: 'checkpoint', kind: 'checkpoint', x: 64, y: 13 },
      { id: 'saida', kind: 'exit', x: 80, y: 13, variant: 'obelisco' },
    ],
  },
  {
    id: '5-2',
    theme: 'floresta',
    width: 90,
    height: 18,
    timeLimit: 285,
    hint: 'Ruínas verdes: os portais formam uma sala bônus sobre o vale.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [22, 5, '^'],
      [52, 7, '^'],
    ],
    runs: [
      [9, 12, 7, '='],
      [20, 9, 7, '='],
      [34, 6, 8, '='],
      [49, 10, 11, '='],
      [68, 7, 7, '='],
      [80, 12, 6, '='],
      [38, 4, 4, 'B'],
    ],
    entities: [
      {
        id: 'portal-entrada',
        kind: 'portal',
        x: 24,
        y: 7,
        targetX: 37,
        targetY: 2,
        variant: 'dourado',
      },
      {
        id: 'portal-saida',
        kind: 'portal',
        x: 40,
        y: 2,
        targetX: 69,
        targetY: 5,
        variant: 'dourado',
      },
      { id: 'arremesso-a', kind: 'thrower', x: 54, y: 8 },
      { id: 'segredo-5', kind: 'secretExit', x: 40, y: 2 },
      { id: 'checkpoint', kind: 'checkpoint', x: 64, y: 14 },
      { id: 'saida', kind: 'exit', x: 86, y: 14, variant: 'obelisco' },
    ],
    secretStage: '5-4',
  },
  {
    id: '5-3',
    theme: 'floresta',
    width: 94,
    height: 18,
    timeLimit: 280,
    hint: 'Copas das agulhas: plataformas móveis atravessam corredores estreitos.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [17, 6, '^'],
      [38, 7, '^'],
      [63, 7, '^'],
      [82, 5, '^'],
    ],
    runs: [
      [9, 10, 5, '='],
      [20, 7, 5, '='],
      [32, 11, 5, '='],
      [42, 8, 6, '='],
      [56, 5, 5, '='],
      [67, 9, 6, '='],
      [78, 6, 5, '='],
      [87, 12, 4, '='],
    ],
    entities: [
      { id: 'voador-a', kind: 'flyer', x: 25, y: 5 },
      { id: 'arremesso-a', kind: 'thrower', x: 47, y: 6 },
      { id: 'perseguidor-a', kind: 'chaser', x: 70, y: 6, speed: 62 },
      { id: 'vida-a', kind: 'life', x: 59, y: 3 },
      { id: 'checkpoint', kind: 'checkpoint', x: 75, y: 14 },
      { id: 'saida', kind: 'exit', x: 90, y: 14, variant: 'fortaleza' },
    ],
    platforms: [
      { id: 'canyon-a', x: 18, y: 12, w: 3, range: 5, speed: 1.2, axis: 'x' },
      { id: 'canyon-b', x: 63, y: 12, w: 3, range: 6, speed: 1, axis: 'x' },
    ],
  },
  {
    id: '5-4',
    theme: 'floresta',
    width: 84,
    height: 18,
    timeLimit: 255,
    hint: 'Santuário-raiz: o Besouro de Pedra dispara em três direções.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [21, 4, '^'],
      [40, 4, '^'],
    ],
    runs: [
      [9, 11, 6, '='],
      [21, 8, 5, '='],
      [31, 6, 5, '='],
      [40, 9, 5, '='],
      [52, 13, 26, '='],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 32, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 49, y: 14 },
      {
        id: 'guardiao-5',
        kind: 'boss',
        x: 61,
        y: 10,
        health: 10,
        speed: 50,
        range: 200,
        variant: 'besouro',
      },
      { id: 'gema-5', kind: 'gem', x: 72, y: 9 },
      { id: 'saida', kind: 'exit', x: 80, y: 14, variant: 'obelisco' },
    ],
  },
  {
    id: '6-1',
    theme: 'gelo',
    width: 86,
    height: 19,
    timeLimit: 290,
    hint: 'Geleiras suspensas: acompanhe as plataformas e não deixe a câmera para trás.',
    spawn: { x: 3, y: 14 },
    gaps: [
      [15, 8],
      [35, 9],
      [58, 10],
      [78, 5],
    ],
    runs: [
      [8, 13, 5, '='],
      [18, 10, 5, '='],
      [28, 7, 5, '='],
      [39, 11, 5, '='],
      [49, 6, 5, '='],
      [62, 9, 6, '='],
      [73, 5, 5, '='],
      [82, 13, 2, '='],
    ],
    entities: [
      { id: 'voador-a', kind: 'flyer', x: 30, y: 5 },
      { id: 'perseguidor-a', kind: 'chaser', x: 51, y: 4, speed: 58 },
      { id: 'poder-6', kind: 'powerup', x: 65, y: 7, variant: 'fogo' },
      { id: 'checkpoint', kind: 'checkpoint', x: 70, y: 15 },
      { id: 'saida', kind: 'exit', x: 82, y: 15, variant: 'baliza' },
    ],
    platforms: [
      { id: 'nuvem-a', x: 15, y: 13, w: 3, range: 5, speed: 0.9, axis: 'x' },
      { id: 'nuvem-b', x: 56, y: 12, w: 3, range: 5, speed: 1.1, axis: 'y' },
    ],
  },
  {
    id: '6-2',
    theme: 'gelo',
    width: 92,
    height: 19,
    timeLimit: 285,
    hint: 'Torre de gelo: escadas suspensas levam à rota secreta.',
    spawn: { x: 3, y: 14 },
    gaps: [
      [18, 7],
      [43, 8],
      [70, 8],
    ],
    runs: [
      [9, 13, 6, '='],
      [20, 10, 5, '='],
      [31, 6, 6, '='],
      [45, 11, 5, '='],
      [56, 7, 6, '='],
      [72, 10, 6, '='],
      [83, 13, 5, '='],
      [23, 11, 1, 'H'],
      [23, 12, 1, 'H'],
      [34, 7, 1, 'H'],
      [34, 8, 1, 'H'],
      [59, 8, 1, 'H'],
      [59, 9, 1, 'H'],
    ],
    entities: [
      { id: 'perseguidor-a', kind: 'chaser', x: 35, y: 4, speed: 62 },
      { id: 'voador-a', kind: 'flyer', x: 58, y: 5 },
      { id: 'segredo-6', kind: 'secretExit', x: 60, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 67, y: 15 },
      { id: 'saida', kind: 'exit', x: 88, y: 15, variant: 'baliza' },
    ],
    platforms: [
      { id: 'vento-a', x: 42, y: 15, w: 3, range: 5, speed: 0.9, axis: 'y' },
      { id: 'vento-b', x: 69, y: 15, w: 3, range: 5, speed: 1.05, axis: 'y' },
    ],
    secretStage: '6-4',
  },
  {
    id: '6-3',
    theme: 'gelo',
    width: 96,
    height: 20,
    timeLimit: 280,
    hint: 'Glaciar móvel: cruze quatro elevadores sem perder o ritmo.',
    spawn: { x: 3, y: 15 },
    gaps: [
      [14, 10],
      [35, 10],
      [58, 10],
      [80, 10],
    ],
    runs: [
      [8, 14, 5, '='],
      [20, 10, 5, '='],
      [30, 6, 5, '='],
      [42, 12, 5, '='],
      [52, 7, 5, '='],
      [65, 11, 5, '='],
      [75, 5, 5, '='],
      [88, 14, 5, '='],
    ],
    entities: [
      { id: 'perseguidor-a', kind: 'chaser', x: 31, y: 4, speed: 66 },
      { id: 'perseguidor-b', kind: 'chaser', x: 76, y: 3, speed: 70 },
      { id: 'vida-a', kind: 'life', x: 54, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 72, y: 16 },
      { id: 'saida', kind: 'exit', x: 92, y: 16, variant: 'observatorio' },
    ],
    platforms: [
      { id: 'ilha-a', x: 14, y: 14, w: 3, range: 6, speed: 1, axis: 'x' },
      { id: 'ilha-b', x: 36, y: 13, w: 3, range: 5, speed: 0.8, axis: 'y' },
      { id: 'ilha-c', x: 59, y: 13, w: 3, range: 6, speed: 1.15, axis: 'x' },
      { id: 'ilha-d', x: 81, y: 12, w: 3, range: 5, speed: 0.95, axis: 'y' },
    ],
  },
  {
    id: '6-4',
    theme: 'gelo',
    width: 86,
    height: 19,
    timeLimit: 250,
    hint: 'Ninho do guardião: o Falcão de Gelo mergulha sobre os dois jogadores.',
    spawn: { x: 3, y: 14 },
    gaps: [
      [20, 6],
      [42, 6],
    ],
    runs: [
      [9, 12, 6, '='],
      [21, 9, 6, '='],
      [33, 6, 5, '='],
      [43, 10, 6, '='],
      [55, 14, 25, '='],
    ],
    entities: [
      { id: 'perseguidor-a', kind: 'chaser', x: 35, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 52, y: 15 },
      {
        id: 'guardiao-6',
        kind: 'boss',
        x: 64,
        y: 9,
        health: 11,
        speed: 54,
        range: 210,
        variant: 'falcao',
      },
      { id: 'gema-6', kind: 'gem', x: 74, y: 8 },
      { id: 'saida', kind: 'exit', x: 82, y: 15, variant: 'baliza' },
    ],
  },
  {
    id: '7-1',
    theme: 'vulcao',
    width: 88,
    height: 18,
    timeLimit: 280,
    hint: 'Caldeira rubra: lava causa dano; use as plataformas de basalto.',
    spawn: { x: 3, y: 13 },
    groundDepth: 2,
    gaps: [
      [17, 8, '^'],
      [42, 9, '^'],
      [69, 8, '^'],
    ],
    runs: [
      [9, 12, 5, '='],
      [18, 9, 7, '='],
      [31, 12, 6, '='],
      [43, 8, 8, '='],
      [58, 11, 6, '='],
      [70, 9, 7, '='],
      [81, 13, 3, '='],
    ],
    entities: [
      { id: 'planta-a', kind: 'plant', x: 33, y: 14 },
      { id: 'arremesso-a', kind: 'thrower', x: 47, y: 6 },
      { id: 'poder-7', kind: 'powerup', x: 61, y: 9, variant: 'fogo' },
      { id: 'checkpoint', kind: 'checkpoint', x: 66, y: 14 },
      { id: 'saida', kind: 'exit', x: 84, y: 14, variant: 'forja' },
    ],
  },
  {
    id: '7-2',
    theme: 'vulcao',
    width: 94,
    height: 19,
    timeLimit: 275,
    hint: 'Forja profunda: atravesse o túnel frágil antes que ele desabe.',
    spawn: { x: 3, y: 14 },
    groundDepth: 2,
    gaps: [
      [18, 7, '^'],
      [48, 11, '^'],
      [77, 8, '^'],
    ],
    runs: [
      [9, 13, 6, '='],
      [18, 10, 8, 'F'],
      [31, 7, 7, '='],
      [46, 11, 14, 'F'],
      [66, 7, 7, '='],
      [77, 10, 9, 'F'],
      [89, 14, 2, '='],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 34, y: 5 },
      { id: 'voador-a', kind: 'flyer', x: 54, y: 8 },
      { id: 'segredo-7', kind: 'secretExit', x: 69, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 73, y: 15 },
      { id: 'saida', kind: 'exit', x: 90, y: 15, variant: 'forja' },
    ],
    secretStage: '7-4',
  },
  {
    id: '7-3',
    theme: 'vulcao',
    width: 98,
    height: 19,
    timeLimit: 270,
    hint: 'Coração magmático: portais saltam entre ilhas cercadas por lava.',
    spawn: { x: 3, y: 14 },
    groundDepth: 2,
    gaps: [
      [15, 14, '^'],
      [38, 15, '^'],
      [65, 15, '^'],
    ],
    runs: [
      [8, 13, 5, '='],
      [18, 9, 6, '='],
      [31, 12, 5, '='],
      [42, 7, 7, '='],
      [57, 11, 5, '='],
      [69, 8, 7, '='],
      [84, 12, 9, '='],
    ],
    entities: [
      { id: 'portal-a', kind: 'portal', x: 22, y: 7, targetX: 44, targetY: 5, variant: 'rubro' },
      { id: 'portal-b', kind: 'portal', x: 47, y: 5, targetX: 70, targetY: 6, variant: 'rubro' },
      { id: 'arremesso-a', kind: 'thrower', x: 60, y: 9 },
      { id: 'vida-a', kind: 'life', x: 73, y: 6 },
      { id: 'checkpoint', kind: 'checkpoint', x: 81, y: 15 },
      { id: 'saida', kind: 'exit', x: 94, y: 15, variant: 'núcleo' },
    ],
    platforms: [
      { id: 'basalto-inicial', x: 15, y: 14, w: 3, range: 5, speed: 1, axis: 'y' },
      { id: 'basalto-a', x: 29, y: 13, w: 3, range: 5, speed: 1.2, axis: 'y' },
      { id: 'basalto-b', x: 64, y: 13, w: 3, range: 5, speed: 1, axis: 'x' },
    ],
  },
  {
    id: '7-4',
    theme: 'vulcao',
    width: 88,
    height: 19,
    timeLimit: 245,
    hint: 'Trono da forja: o Dragão de Cinza alterna voo e chuva de brasas.',
    spawn: { x: 3, y: 14 },
    groundDepth: 2,
    gaps: [
      [19, 6, '^'],
      [42, 6, '^'],
    ],
    runs: [
      [9, 12, 6, '='],
      [20, 9, 6, '='],
      [32, 6, 6, '='],
      [43, 10, 6, '='],
      [56, 14, 26, '='],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 35, y: 4 },
      { id: 'checkpoint', kind: 'checkpoint', x: 53, y: 15 },
      {
        id: 'guardiao-7',
        kind: 'boss',
        x: 65,
        y: 10,
        health: 12,
        speed: 58,
        range: 220,
        variant: 'dragao',
      },
      { id: 'gema-7', kind: 'gem', x: 76, y: 9 },
      { id: 'saida', kind: 'exit', x: 84, y: 15, variant: 'forja' },
    ],
  },
  {
    id: '8-1',
    theme: 'castelo',
    width: 92,
    height: 19,
    timeLimit: 270,
    hint: 'Muralha celeste: todos os perigos anteriores retornam em sequência.',
    spawn: { x: 3, y: 14 },
    groundDepth: 2,
    gaps: [
      [18, 5, '^'],
      [43, 6],
      [70, 6, '^'],
    ],
    runs: [
      [9, 12, 6, '='],
      [18, 9, 6, 'F'],
      [30, 6, 6, '='],
      [42, 10, 8, '='],
      [57, 7, 6, '='],
      [70, 10, 7, 'F'],
      [83, 14, 5, '='],
      [39, 16, 1, 'S'],
    ],
    entities: [
      { id: 'casco-a', kind: 'shell', x: 27, y: 15, health: 2 },
      { id: 'arremesso-a', kind: 'thrower', x: 33, y: 4 },
      { id: 'perseguidor-a', kind: 'chaser', x: 60, y: 5, speed: 68 },
      { id: 'poder-8', kind: 'powerup', x: 75, y: 8, variant: 'estrela' },
      { id: 'checkpoint', kind: 'checkpoint', x: 79, y: 15 },
      { id: 'saida', kind: 'exit', x: 88, y: 15, variant: 'portão' },
    ],
  },
  {
    id: '8-2',
    theme: 'castelo',
    width: 98,
    height: 20,
    timeLimit: 265,
    hint: 'Biblioteca suspensa: portais e escadas escondem o último atalho.',
    spawn: { x: 3, y: 15 },
    groundDepth: 2,
    gaps: [
      [20, 7],
      [50, 8],
      [79, 7],
    ],
    runs: [
      [9, 14, 7, '='],
      [21, 10, 7, '='],
      [34, 6, 7, '='],
      [48, 11, 11, 'F'],
      [65, 7, 7, '='],
      [79, 10, 8, '='],
      [91, 15, 3, '='],
      [24, 11, 1, 'H'],
      [24, 12, 1, 'H'],
      [24, 13, 1, 'H'],
      [68, 8, 1, 'H'],
      [68, 9, 1, 'H'],
    ],
    entities: [
      { id: 'portal-a', kind: 'portal', x: 25, y: 8, targetX: 37, targetY: 4, variant: 'prisma' },
      { id: 'arremesso-a', kind: 'thrower', x: 53, y: 9 },
      { id: 'perseguidor-a', kind: 'chaser', x: 69, y: 5, speed: 72 },
      { id: 'segredo-8', kind: 'secretExit', x: 70, y: 5 },
      { id: 'checkpoint', kind: 'checkpoint', x: 76, y: 16 },
      { id: 'saida', kind: 'exit', x: 94, y: 16, variant: 'portão' },
    ],
    platforms: [
      { id: 'biblioteca-inicial', x: 19, y: 16, w: 3, range: 7, speed: 1, axis: 'y' },
      { id: 'biblioteca-a', x: 49, y: 16, w: 3, range: 7, speed: 0.85, axis: 'y' },
      { id: 'biblioteca-b', x: 78, y: 16, w: 3, range: 7, speed: 1.05, axis: 'y' },
    ],
    secretStage: '8-4',
  },
  {
    id: '8-3',
    theme: 'castelo',
    width: 104,
    height: 20,
    timeLimit: 260,
    hint: 'Mecanismo final: quatro salas testam água, gelo, lava e céu.',
    spawn: { x: 3, y: 15 },
    groundDepth: 2,
    gaps: [
      [17, 10, '~'],
      [39, 8],
      [62, 10, '^'],
      [86, 9],
    ],
    runs: [
      [9, 14, 5, '='],
      [18, 10, 8, '='],
      [31, 13, 5, '='],
      [41, 8, 6, 'F'],
      [52, 12, 6, '='],
      [64, 9, 8, '='],
      [77, 6, 6, '='],
      [88, 11, 8, '='],
      [98, 15, 3, '='],
      [37, 17, 1, 'S'],
    ],
    fills: [[17, 13, 10, 6, '~']],
    entities: [
      { id: 'aquatico-a', kind: 'aquatic', x: 22, y: 14 },
      { id: 'casco-a', kind: 'shell', x: 55, y: 16, health: 2 },
      { id: 'arremesso-a', kind: 'thrower', x: 68, y: 7 },
      { id: 'perseguidor-a', kind: 'chaser', x: 80, y: 4, speed: 74 },
      { id: 'vida-a', kind: 'life', x: 92, y: 9 },
      { id: 'checkpoint', kind: 'checkpoint', x: 84, y: 16 },
      { id: 'saida', kind: 'exit', x: 100, y: 16, variant: 'elevador' },
    ],
    platforms: [
      { id: 'mecanismo-a', x: 39, y: 14, w: 3, range: 5, speed: 1.1, axis: 'y' },
      { id: 'mecanismo-b', x: 84, y: 13, w: 3, range: 6, speed: 1.2, axis: 'x' },
    ],
  },
  {
    id: '8-4',
    theme: 'castelo',
    width: 96,
    height: 20,
    timeLimit: 240,
    hint: 'Coroa do reino: o Arquiteto Zero combina os sete guardiões anteriores.',
    spawn: { x: 3, y: 15 },
    groundDepth: 2,
    gaps: [
      [18, 6, '^'],
      [40, 6],
      [62, 6, '^'],
    ],
    runs: [
      [9, 13, 6, '='],
      [19, 10, 6, 'F'],
      [31, 7, 6, '='],
      [41, 11, 6, '='],
      [52, 6, 6, '='],
      [63, 10, 6, 'F'],
      [74, 15, 16, '='],
    ],
    entities: [
      { id: 'arremesso-a', kind: 'thrower', x: 34, y: 5 },
      { id: 'perseguidor-a', kind: 'chaser', x: 54, y: 4, speed: 76 },
      { id: 'checkpoint', kind: 'checkpoint', x: 71, y: 16 },
      {
        id: 'guardiao-8',
        kind: 'boss',
        x: 79,
        y: 11,
        health: 16,
        speed: 62,
        range: 230,
        variant: 'arquiteto',
      },
      { id: 'gema-8', kind: 'gem', x: 86, y: 9 },
      { id: 'saida', kind: 'exit', x: 92, y: 16, variant: 'coroa' },
    ],
  },
]

export const REINO_ZERO_ULTRA_STAGES: readonly ReinoZeroUltraStage[] =
  AUTHORED_STAGES.map(compileStage)

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasOnlyKeys(record: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed)
  return Object.keys(record).every((key) => keys.has(key))
}

function finiteBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function shortText(value: unknown, max = 64): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= max
}

function validEntity(value: unknown, width: number, height: number): value is ReinoZeroUltraEntity {
  if (!isRecord(value)) return false
  return (
    hasOnlyKeys(value, [
      'id',
      'kind',
      'x',
      'y',
      'variant',
      'health',
      'range',
      'speed',
      'targetX',
      'targetY',
    ]) &&
    shortText(value.id) &&
    ENTITY_KINDS.has(value.kind as ReinoZeroUltraEntity['kind']) &&
    finiteBetween(value.x, -4, width + 4) &&
    finiteBetween(value.y, -4, height + 4) &&
    (value.variant === undefined || shortText(value.variant)) &&
    (value.health === undefined || finiteBetween(value.health, 1, 100)) &&
    (value.range === undefined || finiteBetween(value.range, 0, MAX_WIDTH * 32)) &&
    (value.speed === undefined || finiteBetween(value.speed, 0, 2_000)) &&
    (value.targetX === undefined || finiteBetween(value.targetX, 0, width - 1)) &&
    (value.targetY === undefined || finiteBetween(value.targetY, 0, height - 1)) &&
    (value.kind !== 'portal' ||
      (finiteBetween(value.targetX, 0, width - 1) && finiteBetween(value.targetY, 0, height - 1)))
  )
}

function validPlatform(
  value: unknown,
  width: number,
  height: number,
): value is ReinoZeroUltraPlatform {
  if (!isRecord(value)) return false
  return (
    hasOnlyKeys(value, ['id', 'x', 'y', 'w', 'range', 'speed', 'axis']) &&
    shortText(value.id) &&
    finiteBetween(value.x, -4, width + 4) &&
    finiteBetween(value.y, -4, height + 4) &&
    finiteBetween(value.w, 0.25, width) &&
    finiteBetween(value.range, 0, width) &&
    finiteBetween(value.speed, 0, 100) &&
    (value.axis === 'x' || value.axis === 'y')
  )
}

function validTrigger(
  value: unknown,
  width: number,
  height: number,
): value is ReinoZeroUltraTrigger {
  if (!isRecord(value)) return false
  return (
    hasOnlyKeys(value, ['kind', 'x', 'y', 'w', 'h', 'value']) &&
    TRIGGER_KINDS.has(value.kind as ReinoZeroUltraTrigger['kind']) &&
    finiteBetween(value.x, -4, width + 4) &&
    finiteBetween(value.y, -4, height + 4) &&
    finiteBetween(value.w, 0.25, width + 8) &&
    finiteBetween(value.h, 0.25, height + 8) &&
    shortText(value.value, 500)
  )
}

function uniqueIds(values: readonly { id: string }[]): boolean {
  return new Set(values.map((item) => item.id)).size === values.length
}

function hasEntityKind(values: readonly unknown[], kind: ReinoZeroUltraEntity['kind']): boolean {
  return values.some((value) => isRecord(value) && value.kind === kind)
}

/** Validador estrito usado pelo editor, pelo gerador e pelos testes de conteúdo. */
export function validateReinoZeroUltraStage(value: unknown): ReinoZeroUltraStage | null {
  if (!isRecord(value)) return null
  const width = typeof value.width === 'number' ? value.width : 0
  const height = typeof value.height === 'number' ? value.height : 0
  if (
    !hasOnlyKeys(value, [
      'schemaVersion',
      'id',
      'world',
      'stage',
      'theme',
      'width',
      'height',
      'timeLimit',
      'seed',
      'spawn',
      'tiles',
      'entities',
      'platforms',
      'triggers',
      'nextStage',
      'secretStage',
    ]) ||
    value.schemaVersion !== 1 ||
    !shortText(value.id) ||
    !Number.isInteger(value.world) ||
    !finiteBetween(value.world, 1, 8) ||
    !Number.isInteger(value.stage) ||
    !finiteBetween(value.stage, 1, 4) ||
    value.id !== `${value.world}-${value.stage}` ||
    !REINO_ZERO_ULTRA_THEMES.includes(value.theme as ReinoZeroUltraTheme) ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    !finiteBetween(value.width, 1, MAX_WIDTH) ||
    !finiteBetween(value.height, 1, MAX_HEIGHT) ||
    !finiteBetween(value.timeLimit, 1, 3_600) ||
    !Number.isSafeInteger(value.seed) ||
    !Array.isArray(value.tiles) ||
    value.tiles.length !== value.height ||
    !value.tiles.every(
      (row) =>
        typeof row === 'string' &&
        row.length === value.width &&
        [...row].every((tile) => TILE_CHARS.has(tile)),
    ) ||
    !Array.isArray(value.entities) ||
    value.entities.length > MAX_ENTITIES ||
    !value.entities.every((entity) => validEntity(entity, width, height)) ||
    !hasEntityKind(value.entities, 'exit') ||
    !uniqueIds(value.entities) ||
    !Array.isArray(value.platforms) ||
    value.platforms.length > MAX_PLATFORMS ||
    !value.platforms.every((platform) => validPlatform(platform, width, height)) ||
    !uniqueIds(value.platforms) ||
    !Array.isArray(value.triggers) ||
    value.triggers.length === 0 ||
    value.triggers.length > MAX_TRIGGERS ||
    !value.triggers.every((trigger) => validTrigger(trigger, width, height)) ||
    !isRecord(value.triggers[0]) ||
    value.triggers[0].kind !== 'hint' ||
    !isRecord(value.spawn) ||
    !hasOnlyKeys(value.spawn, ['x', 'y']) ||
    !finiteBetween(value.spawn.x, 0, width - 1) ||
    !finiteBetween(value.spawn.y, 0, height - 1) ||
    (value.nextStage !== undefined && !/^([1-8])-([1-4])$/.test(String(value.nextStage))) ||
    (value.secretStage !== undefined && !/^([1-8])-([1-4])$/.test(String(value.secretStage)))
  ) {
    return null
  }
  return value as unknown as ReinoZeroUltraStage
}

function tileIsSolid(tile: string): boolean {
  return (
    tile === '#' ||
    tile === '=' ||
    tile === 'B' ||
    tile === '?' ||
    tile === 'U' ||
    tile === 'S' ||
    tile === 'F'
  )
}

function tileIsHazard(tile: string): boolean {
  return tile === '^'
}

function tileAt(stage: ReinoZeroUltraStage, x: number, y: number): string {
  if (x < 0 || x >= stage.width || y < 0 || y >= stage.height) return '#'
  return stage.tiles[y]?.charAt(x) ?? '#'
}

function canStand(stage: ReinoZeroUltraStage, x: number, y: number): boolean {
  const tile = tileAt(stage, x, y)
  if (tileIsSolid(tile) || tileIsHazard(tile)) return false
  if (tile === '~' || tile === 'H') return true
  const below = tileAt(stage, x, y + 1)
  if (tileIsSolid(below)) return true
  return stage.platforms.some((platform) => {
    if (platform.axis === 'y')
      return (
        x >= platform.x - 1 &&
        x <= platform.x + platform.w &&
        y + 1 >= Math.floor(platform.y - platform.range) &&
        y + 1 <= Math.ceil(platform.y + platform.range)
      )
    return (
      y + 1 === Math.floor(platform.y) &&
      x >= platform.x - platform.range - 1 &&
      x <= platform.x + platform.w + platform.range
    )
  })
}

/** Busca conservadora de rota entre o spawn e a chegada usando as capacidades do motor. */
export function hasConservativeRoute(stage: ReinoZeroUltraStage): boolean {
  const exit = stage.entities.find((entity) => entity.kind === 'exit')
  if (!exit) return false
  const standable: Array<readonly [number, number]> = []
  for (let y = 0; y < stage.height - 1; y += 1)
    for (let x = 0; x < stage.width; x += 1) if (canStand(stage, x, y)) standable.push([x, y])

  let start = 0
  let startDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < standable.length; index += 1) {
    const point = standable[index]
    if (!point) continue
    const distance = Math.abs(point[0] - stage.spawn.x) + Math.abs(point[1] - stage.spawn.y)
    if (distance < startDistance) {
      start = index
      startDistance = distance
    }
  }
  if (standable.length === 0 || startDistance > 8) return false

  const queue = [start]
  const visited = new Set([start])
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const currentIndex = queue[cursor]
    if (currentIndex === undefined) continue
    const current = standable[currentIndex]
    if (!current) continue
    if (Math.abs(current[0] - exit.x) <= 3 && Math.abs(current[1] - exit.y) <= 5) return true
    for (let candidateIndex = 0; candidateIndex < standable.length; candidateIndex += 1) {
      if (visited.has(candidateIndex)) continue
      const candidate = standable[candidateIndex]
      if (!candidate) continue
      const dx = Math.abs(candidate[0] - current[0])
      const dy = candidate[1] - current[1]
      const localStep = dx <= 1 && dy >= -1 && dy <= 2
      const jump = dx <= 7 && dy >= -6 && dy <= 8
      const safeDrop = dx <= 7 && dy > 8
      const ladder =
        dx <= 1 &&
        Math.abs(dy) <= 7 &&
        (tileAt(stage, current[0], current[1]) === 'H' ||
          tileAt(stage, candidate[0], candidate[1]) === 'H')
      const swimming =
        dx <= 6 &&
        Math.abs(dy) <= 6 &&
        (tileAt(stage, current[0], current[1]) === '~' ||
          tileAt(stage, candidate[0], candidate[1]) === '~')
      const portalRoute = stage.entities.some(
        (entity) =>
          entity.kind === 'portal' &&
          entity.targetX !== undefined &&
          entity.targetY !== undefined &&
          Math.abs(current[0] - entity.x) <= 3 &&
          Math.abs(current[1] - entity.y) <= 5 &&
          Math.abs(candidate[0] - entity.targetX) <= 3 &&
          Math.abs(candidate[1] - entity.targetY) <= 5,
      )
      if (localStep || jump || safeDrop || ladder || swimming || portalRoute) {
        visited.add(candidateIndex)
        queue.push(candidateIndex)
      }
    }
  }
  return false
}

/** Valida a campanha como grafo, além do schema isolado de cada fase. */
export function validateReinoZeroUltraCampaign(
  value: readonly unknown[],
): readonly ReinoZeroUltraStage[] | null {
  if (value.length !== 32) return null
  const stages: ReinoZeroUltraStage[] = []
  for (const candidate of value) {
    const stage = validateReinoZeroUltraStage(candidate)
    if (!stage || !hasConservativeRoute(stage)) return null
    stages.push(stage)
  }
  const ids = new Set(stages.map((stage) => stage.id))
  if (ids.size !== stages.length) return null
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index]
    if (!stage) return null
    const expectedNext = stages[index + 1]?.id
    if (stage.nextStage !== expectedNext) return null
    if (stage.secretStage !== undefined && !ids.has(stage.secretStage)) return null
  }
  return stages
}
