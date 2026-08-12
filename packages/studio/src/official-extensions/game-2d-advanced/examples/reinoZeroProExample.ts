import type { ExtensionExample } from '#extensions'
import type { JSStatement } from '#ir'
import type { GameKitCampaignStage } from '../campaignSchema'

const THEMES = ['campo', 'caverna', 'agua', 'neve', 'deserto', 'ceu', 'vulcao', 'castelo']

function stageId(world: number, order: number): string {
  return `${world}-${order}`
}

function nextStageId(world: number, order: number): string | undefined {
  if (world === 8 && order === 4) return undefined
  return order < 4 ? stageId(world, order + 1) : stageId(world + 1, 1)
}

function stageTiles(width: number, height: number, world: number, order: number): string[] {
  const cells = Array.from({ length: height }, () => Array.from({ length: width }, () => '.'))
  const setCell = (row: number, column: number, tile: string): void => {
    const line = cells[row]
    if (line && column >= 0 && column < line.length) line[column] = tile
  }
  for (let col = 0; col < width; col += 1) {
    setCell(height - 1, col, '#')
    if (world >= 4) setCell(height - 2, col, '#')
  }
  for (let col = 10; col < width - 8; col += 14 + order) {
    const length = world === 3 ? 5 : 2 + ((world + order) % 3)
    for (let gap = 0; gap < length; gap += 1) {
      setCell(height - 1, col + gap, world === 3 ? '~' : world >= 7 ? '^' : '.')
      if (world >= 4) setCell(height - 2, col + gap, '.')
    }
  }
  for (let col = 7; col < width - 6; col += 11) {
    const row = height - 5 - ((col + order) % 3)
    for (let piece = 0; piece < 4; piece += 1) setCell(row, col + piece, '=')
    setCell(row - 2, col + 1, col % 2 === 0 ? '?' : 'B')
  }
  if (world === 2 || world === 6) {
    const ladder = Math.floor(width * 0.62)
    for (let row = height - 8; row < height - 1; row += 1) setCell(row, ladder, 'H')
  }
  return cells.map((row) => row.join(''))
}

function makeStage(world: number, order: number): GameKitCampaignStage {
  const width = 56 + world * 4 + order * 5
  const height = 16 + (world % 3)
  const id = stageId(world, order)
  const nextStage = nextStageId(world, order)
  const entities: GameKitCampaignStage['entities'] = [
    { kind: 'hero', id: 'inicio', x: 2, y: height - (world >= 4 ? 4 : 2) },
    { kind: 'checkpoint', id: 'meio', x: Math.floor(width / 2), y: height - 3 },
    {
      kind: 'exit',
      id: 'saida',
      x: width - 4,
      y: height - 3,
      ...(order === 4 ? { props: { requiresBoss: true } } : {}),
    },
  ]
  for (let index = 0; index < 10 + world; index += 1) {
    entities.push({
      kind: 'coin',
      id: `moeda-${index + 1}`,
      x: 6 + index * Math.max(3, Math.floor((width - 14) / (10 + world))),
      y: height - 5 - (index % 3),
    })
  }
  for (let index = 0; index < 2 + order; index += 1) {
    const kinds = ['walker', 'flyer', 'spiky', 'shell'] as const
    const kind = kinds[(world + order + index) % kinds.length] ?? 'walker'
    entities.push({
      kind,
      id: `inimigo-${index + 1}`,
      x: 15 + index * 10,
      y: kind === 'flyer' ? height - 8 : height - 3,
      props: { speed: 24 + world * 3, range: 32 + order * 8 },
    })
  }
  if (order >= 2) {
    entities.push({
      kind: 'movingPlatform',
      id: 'plataforma-movel',
      x: Math.floor(width * 0.38),
      y: height - 7,
      props: { range: 36 + world * 3, speed: 0.7 + order * 0.12 },
    })
  }
  if (order === 1 && world % 2 === 0) {
    entities.push({ kind: 'powerup', id: `poder-${world}`, x: 20, y: height - 6, variant: 'forte' })
  }
  if (order === 2) {
    entities.push({ kind: 'secretExit', id: `segredo-${world}`, x: width - 14, y: height - 9 })
  }
  if (order === 4) {
    entities.push({ kind: 'gem', id: `gema-${world}`, x: width - 13, y: height - 7 })
    entities.push({
      kind: 'boss',
      id: `guardiao-${world}`,
      x: width - 18,
      y: height - 4,
      props: { health: world === 8 ? 12 : 4 + world, speed: 22 + world * 2 },
    })
  }
  return {
    schemaVersion: 1,
    id,
    world,
    order,
    theme: THEMES[world - 1] ?? 'campo',
    width,
    height,
    tiles: stageTiles(width, height, world, order),
    entities,
    triggers: [
      {
        kind: order === 1 ? 'dica' : 'marco',
        x: 3,
        y: height - 5,
        w: 5,
        h: 4,
        target: id,
        value: order === 1 ? `Mundo ${world}: explore, encontre a gema e vença o guardião.` : order,
      },
    ],
    ...(nextStage ? { nextStage } : {}),
    ...(order === 2 ? { secretStage: stageId(world, 4) } : {}),
    timeLimit: Math.max(160, 330 - world * 12 - order * 8),
  }
}

export const reinoZeroProStages = Array.from({ length: 8 }, (_, worldIndex) =>
  Array.from({ length: 4 }, (_, orderIndex) => makeStage(worldIndex + 1, orderIndex + 1)),
).flat()

const start: JSStatement[] = [
  {
    type: 'gk:setup',
    w: { type: 'num', value: 512 },
    h: { type: 'num', value: 288 },
    bg: '#101827',
    accent: '#35d0ba',
  },
  {
    type: 'gk:setStageDescription',
    description:
      'Reino Zero Pro. Use setas ou A e D para andar, X ou espaço para pular, Z ou Shift para correr. Explore oito mundos, encontre oito gemas e vença os guardiões.',
  },
  { type: 'gk:fixedSetup', seed: { type: 'num', value: 147480 } },
  {
    type: 'gk:defineCampaign',
    id: 'reino-zero-pro',
    version: { type: 'num', value: 1 },
    firstStage: '1-1',
    players: { type: 'num', value: 2 },
    seed: { type: 'num', value: 147480 },
    requiredGems: { type: 'num', value: 8 },
  },
  ...reinoZeroProStages.map(
    (stage): JSStatement => ({
      type: 'gk:defineCampaignStage',
      stage,
    }),
  ),
  { type: 'gk:startCampaign', stageId: '1-1' },
]

const events: JSStatement[] = [
  {
    type: 'gk:onCampaignEvent',
    event: 'dica',
    body: [
      {
        type: 'consoleLog',
        value: { type: 'gk:campaignEventValue', field: 'value' },
      },
    ],
  },
  {
    type: 'gk:onCampaignEvent',
    event: 'fim',
    body: [
      {
        type: 'consoleLog',
        value: { type: 'gk:campaignEventValue', field: 'complete' },
      },
    ],
  },
]

export const reinoZeroProExample: ExtensionExample = {
  name: 'Reino Zero Pro',
  experience: 'game',
  description:
    'Aventura editável com 8 mundos, 32 fases, regiões, eventos, rotas secretas, dois jogadores, checkpoints, guardiões, saves e replay determinístico.',
  ir: {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d-advanced' }],
    behavior: { start, events, loops: [] },
  },
}
