import type { ExtensionExample } from '#extensions'
import type { JSExpr, JSStatement } from '#ir'
import { beginnerGameExample } from '../shared'

const TILE = 16
const COLS = 72
const ROWS = 15
const LAST_LEVEL = 32

interface Theme {
  sky: string
  ground: string
  edge: string
  brick: string
  question: string
  pipe: string
  platform: string
  hazard: string
}

const THEMES: readonly Theme[] = [
  {
    sky: '#5c94fc',
    ground: '#c87932',
    edge: '#f8d878',
    brick: '#a84b26',
    question: '#f8b800',
    pipe: '#2fb34a',
    platform: '#f5df9b',
    hazard: '#1d67c1',
  },
  {
    sky: '#14213d',
    ground: '#72564a',
    edge: '#bd9b72',
    brick: '#82543d',
    question: '#f2a900',
    pipe: '#237d42',
    platform: '#b9a17e',
    hazard: '#183c78',
  },
  {
    sky: '#2d9bd8',
    ground: '#d6b36a',
    edge: '#fff1ac',
    brick: '#bc6b38',
    question: '#ffd447',
    pipe: '#38a66b',
    platform: '#e7d9a0',
    hazard: '#166ab1',
  },
  {
    sky: '#abddff',
    ground: '#8c704e',
    edge: '#f7e6b5',
    brick: '#b9613f',
    question: '#ffc928',
    pipe: '#329a55',
    platform: '#fff4c8',
    hazard: '#4e8ecd',
  },
  {
    sky: '#ffb35c',
    ground: '#9c4935',
    edge: '#ffd98a',
    brick: '#7b2f2f',
    question: '#ffcf33',
    pipe: '#477c3a',
    platform: '#eabf7b',
    hazard: '#dd382f',
  },
  {
    sky: '#33425b',
    ground: '#6c5b5b',
    edge: '#c7b8a1',
    brick: '#78443f',
    question: '#e8ad25',
    pipe: '#3b7650',
    platform: '#b9b0a5',
    hazard: '#972e3b',
  },
  {
    sky: '#19162f',
    ground: '#51416d',
    edge: '#b394d6',
    brick: '#693f65',
    question: '#e2a92c',
    pipe: '#316c51',
    platform: '#a690c5',
    hazard: '#d43c64',
  },
  {
    sky: '#090b18',
    ground: '#3a3144',
    edge: '#8e779a',
    brick: '#553343',
    question: '#d49b22',
    pipe: '#285445',
    platform: '#9b89a8',
    hazard: '#f04b3e',
  },
] as const

const n = (value: number): JSExpr => ({ type: 'num', value })
const variable = (name: string): JSExpr => ({ type: 'var', name })
const binary = (
  op: Extract<JSExpr, { type: 'binop' }>['op'],
  left: JSExpr,
  right: JSExpr,
): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const equals = (left: JSExpr, right: number): JSExpr => binary('==', left, n(right))
const and = (left: JSExpr, right: JSExpr): JSExpr => ({ type: 'logical', op: '&&', left, right })
const or = (left: JSExpr, right: JSExpr): JSExpr => ({ type: 'logical', op: '||', left, right })

function paintRect(x: number, y: number, w: number, h: number, color: string): JSStatement {
  return { type: 'g2d:paintRect', ctxVar: 'ctx', x: n(x), y: n(y), w: n(w), h: n(h), color }
}

function paintCircle(x: number, y: number, r: number, color: string): JSStatement {
  return { type: 'g2d:paintCircle', ctxVar: 'ctx', x: n(x), y: n(y), r: n(r), color }
}

function shape(shapeName: string, body: JSStatement[]): JSStatement {
  return { type: 'g2d:defineShape', shapeName, body }
}

function tileShape(name: string, fill: string, edge: string, detail = fill): JSStatement {
  return shape(name, [
    paintRect(0, 0, 16, 16, fill),
    paintRect(0, 0, 16, 2, edge),
    paintRect(0, 14, 16, 2, detail),
    paintRect(0, 0, 2, 16, edge),
  ])
}

function themeShapes(index: number, theme: Theme): JSStatement[] {
  const prefix = `r${index + 1}`
  return [
    shape(`${prefix}Ceu`, [paintRect(0, 0, 16, 16, theme.sky)]),
    tileShape(`${prefix}Chao`, theme.ground, theme.edge, theme.edge),
    shape(`${prefix}Tijolo`, [
      paintRect(0, 0, 16, 16, theme.brick),
      paintRect(0, 0, 16, 2, theme.edge),
      paintRect(0, 7, 16, 2, '#402018'),
      paintRect(7, 0, 2, 8, '#402018'),
      paintRect(3, 8, 2, 8, '#402018'),
    ]),
    shape(`${prefix}Premio`, [
      paintRect(0, 0, 16, 16, theme.question),
      paintRect(0, 0, 16, 2, '#fff1a8'),
      paintRect(0, 14, 16, 2, '#8e4f13'),
      paintRect(6, 4, 5, 2, '#fff4ba'),
      paintRect(9, 6, 2, 4, '#fff4ba'),
      paintRect(7, 11, 2, 2, '#fff4ba'),
    ]),
    // A boca do cano mora SÓ nesta peça. Quando ela era o cano inteiro, um cano de
    // dois tiles ganhava duas bocas — a de baixo caindo bem na linha do chão, que é
    // o que dava a leitura de "cano enterrado".
    shape(`${prefix}Cano`, [
      paintRect(2, 0, 12, 16, theme.pipe),
      paintRect(0, 0, 16, 5, theme.edge),
      paintRect(4, 1, 3, 15, '#8fe06d'),
      paintRect(12, 1, 2, 15, '#174a2c'),
    ]),
    // Corpo: sem boca, e os brilhos vão de ponta a ponta para emendar entre tiles.
    shape(`${prefix}CanoCorpo`, [
      paintRect(2, 0, 12, 16, theme.pipe),
      paintRect(4, 0, 3, 16, '#8fe06d'),
      paintRect(12, 0, 2, 16, '#174a2c'),
    ]),
    tileShape(`${prefix}Plataforma`, theme.platform, '#fff5cf', theme.ground),
    shape(`${prefix}Perigo`, [
      paintRect(0, 0, 16, 16, theme.sky),
      paintRect(0, 10, 16, 6, theme.hazard),
      paintRect(2, 8, 4, 4, theme.hazard),
      paintRect(10, 8, 4, 4, theme.hazard),
    ]),
  ]
}

function campaignShapes(): JSStatement[] {
  return [
    shape('lumi', [
      paintRect(3, 1, 8, 4, '#f4c542'),
      paintRect(1, 5, 13, 4, '#f4c542'),
      paintRect(4, 9, 8, 8, '#e84a3c'),
      paintRect(2, 17, 12, 5, '#2e55a3'),
      paintRect(2, 22, 5, 2, '#63341f'),
      paintRect(10, 22, 5, 2, '#63341f'),
      paintRect(10, 6, 2, 2, '#17223b'),
    ]),
    shape('brasa', [
      paintRect(1, 6, 14, 9, '#8f5236'),
      paintRect(3, 3, 10, 4, '#b96b3f'),
      paintRect(2, 14, 5, 2, '#35241f'),
      paintRect(10, 14, 5, 2, '#35241f'),
      paintRect(4, 8, 2, 2, '#fff2bf'),
      paintRect(10, 8, 2, 2, '#fff2bf'),
    ]),
    shape('casco', [
      paintCircle(8, 8, 7, '#3bad51'),
      paintRect(2, 8, 12, 7, '#f2d781'),
      paintRect(5, 2, 6, 9, '#64d25f'),
      paintRect(10, 4, 2, 2, '#142d24'),
    ]),
    shape('espinho', [
      paintRect(2, 6, 12, 9, '#7f5ba7'),
      paintRect(3, 2, 3, 6, '#e6d6ff'),
      paintRect(7, 1, 3, 7, '#e6d6ff'),
      paintRect(11, 2, 3, 6, '#e6d6ff'),
      paintRect(4, 9, 2, 2, '#ffffff'),
      paintRect(10, 9, 2, 2, '#ffffff'),
    ]),
    shape('asa', [
      paintRect(4, 5, 8, 8, '#ed6b54'),
      paintRect(0, 2, 5, 7, '#f8f2df'),
      paintRect(11, 2, 5, 7, '#f8f2df'),
      paintRect(9, 7, 2, 2, '#1d2742'),
    ]),
    shape('guardiao', [
      paintRect(1, 5, 22, 17, '#56316f'),
      paintRect(3, 1, 18, 7, '#d8493f'),
      paintRect(2, 0, 4, 6, '#f1d36b'),
      paintRect(18, 0, 4, 6, '#f1d36b'),
      paintRect(6, 10, 3, 3, '#fff2b8'),
      paintRect(15, 10, 3, 3, '#fff2b8'),
    ]),
    shape('gema', [
      paintRect(5, 1, 6, 2, '#fff7a6'),
      paintRect(3, 3, 10, 9, '#f4ca32'),
      paintRect(5, 12, 6, 3, '#d98b1c'),
      paintRect(6, 4, 2, 6, '#fff7a6'),
    ]),
    shape('broto', [
      paintRect(3, 5, 10, 9, '#f2eee0'),
      paintCircle(8, 5, 6, '#e94a42'),
      paintCircle(5, 4, 2, '#fff4d8'),
      paintCircle(11, 6, 2, '#fff4d8'),
      paintRect(5, 10, 2, 2, '#25304a'),
      paintRect(9, 10, 2, 2, '#25304a'),
    ]),
    shape('portal', [
      paintRect(5, 0, 3, 30, '#e7e1c4'),
      paintRect(8, 2, 12, 7, '#f0cb3d'),
      paintRect(8, 9, 9, 5, '#df493b'),
      paintRect(2, 28, 12, 2, '#e7e1c4'),
    ]),
    shape('invisivel', []),
  ]
}

function seeded(seed: number, offset: number): number {
  return Math.abs((seed * 37 + offset * 17 + seed * offset * 3) % 997)
}

/** Colunas de entrada e saída que nunca recebem poço. */
const SAFE_MARGIN = 8
/** Primeira linha de chão. A superfície pisável é o topo dela -> y = 208. */
const GROUND_TOP_ROW = 13

const T_CHAO = 0
const T_TIJOLO = 1
const T_PREMIO = 2
const T_CANO_TOPO = 3
const T_PLATAFORMA = 4
const T_CEU = 5
const T_PERIGO = 6
const T_CANO_CORPO = 7

/**
 * Sorteia os poços em SEGMENTOS separados, em vez de colunas soltas.
 *
 * Antes cada poço era jogado no mapa de forma independente, e dois sorteios vizinhos
 * se encostavam formando vãos de 4-5 tiles. Com gravidade 0.42, impulso 7.2 e
 * velocidade 2.35 o pulo alcança ~80px (5 tiles) partindo da borda exata — ou seja,
 * a 7-1 ficava intransponível na prática. Exigir 2 colunas firmes entre segmentos
 * garante vão máximo de 2 tiles e plataforma de pouso de 32px.
 */
function levelPits(level: number, world: number, stage: number): Set<number> {
  const segments: Array<{ start: number; width: number }> = []
  const pitCount = stage === 3 ? 6 : 2 + Math.floor(world / 3)
  const span = COLS - SAFE_MARGIN * 2
  for (let index = 0; index < pitCount; index += 1) {
    const width = stage >= 3 || index % 2 === 0 ? 2 : 1
    const start = SAFE_MARGIN + (seeded(level, index) % (span - width))
    const tooClose = segments.some(
      (seg) => start < seg.start + seg.width + 2 && seg.start < start + width + 2,
    )
    if (tooClose) continue
    segments.push({ start, width })
  }
  const pits = new Set<number>()
  for (const seg of segments) {
    for (let offset = 0; offset < seg.width; offset += 1) pits.add(seg.start + offset)
  }
  return pits
}

/**
 * Acha o par de colunas firmes mais próximo do lugar desejado para um cano.
 *
 * Canos têm 2 colunas (como no jogo de referência) e precisam de chão embaixo: antes
 * o cano era escrito por cima da linha 13 — que É chão — e por isso aparecia meio
 * enterrado, e em 10 das 32 fases ficava sólido pairando sobre um poço.
 */
function firmPipePair(desired: number, pits: Set<number>, taken: Set<number>): number | null {
  for (let delta = 0; delta <= 8; delta += 1) {
    const candidates = delta === 0 ? [desired] : [desired - delta, desired + delta]
    for (const col of candidates) {
      if (col < SAFE_MARGIN || col + 1 >= COLS - SAFE_MARGIN) continue
      if (pits.has(col) || pits.has(col + 1)) continue
      // Uma coluna de folga dos outros canos, senão dois canos vizinhos viram um só.
      if (taken.has(col - 1) || taken.has(col) || taken.has(col + 1) || taken.has(col + 2)) {
        continue
      }
      return col
    }
  }
  return null
}

function levelRows(world: number, stage: number): number[][] {
  const level = (world - 1) * 4 + stage
  const rows = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => T_CEU))
  const pits = levelPits(level, world, stage)

  // Chão: duas linhas maciças, interrompidas só pelos poços. O fundo do poço recebe
  // a peça de perigo, que é decorativa — quem cai atravessa e morre pela regra da fase.
  for (let col = 0; col < COLS; col += 1) {
    if (pits.has(col)) {
      rows[14]![col] = T_PERIGO
      continue
    }
    rows[GROUND_TOP_ROW]![col] = T_CHAO
    rows[14]![col] = T_CHAO
  }

  // Canos: 2 colunas, assentados SOBRE o chão, com a boca só no tile de cima.
  const pipeColumns = new Set<number>()
  for (let index = 0; index < 3; index += 1) {
    const desired = 21 + index * 16 + ((world + stage + index) % 4)
    const col = firmPipePair(desired, pits, pipeColumns)
    if (col === null) continue
    const height = index === 1 && stage > 1 ? 3 : 2
    for (const pipeCol of [col, col + 1]) {
      pipeColumns.add(pipeCol)
      for (let offset = 0; offset < height; offset += 1) {
        const row = GROUND_TOP_ROW - 1 - offset
        rows[row]![pipeCol] = offset === height - 1 ? T_CANO_TOPO : T_CANO_CORPO
      }
    }
  }

  const freeForScenery = (col: number): boolean => col >= 0 && col < COLS && !pipeColumns.has(col)

  const blocks = [10, 11, 18, 25, 33, 41, 52, 60]
  for (let index = 0; index < blocks.length; index += 1) {
    const col = blocks[index]! + ((level + index) % 3)
    if (!freeForScenery(col)) continue
    rows[9 + ((level + index) % 2)]![col] = index % 3 === 1 ? T_PREMIO : T_TIJOLO
  }
  if (stage === 2) {
    for (let col = 13; col < COLS - 10; col += 1) {
      if (col % 9 < 6 && freeForScenery(col)) rows[3 + ((col + world) % 2)]![col] = T_TIJOLO
    }
  }
  if (stage === 3) {
    for (let col = 12; col < COLS - 8; col += 8) {
      const row = rows[8 + ((col + world) % 3)]!
      for (const platformCol of [col, col + 1, col + 2]) {
        if (freeForScenery(platformCol)) row[platformCol] = T_PLATAFORMA
      }
    }
  }
  if (stage === 4) {
    for (let col = 8; col < COLS - 8; col += 7) {
      const row = rows[11 - ((col + world) % 4)]!
      for (const platformCol of [col, col + 1]) {
        if (freeForScenery(platformCol)) row[platformCol] = T_PLATAFORMA
      }
    }
  }
  return rows
}

function levelGrid(world: number, stage: number): string {
  return levelRows(world, stage)
    .map((row) => row.join(' '))
    .join(';')
}

const SOLID_TILES = new Set([T_CHAO, T_TIJOLO, T_PREMIO, T_CANO_TOPO, T_CANO_CORPO])

/** A coluna tem chão firme nas duas linhas de piso? */
function isFirmColumn(rows: number[][], col: number): boolean {
  if (col < 0 || col >= COLS) return false
  return SOLID_TILES.has(rows[GROUND_TOP_ROW]![col]!) && SOLID_TILES.has(rows[14]![col]!)
}

/** O espaço acima do chão está livre para um corpo de `height` px nesta coluna? */
function hasHeadroom(rows: number[][], col: number, height: number): boolean {
  const tiles = Math.ceil(height / TILE)
  for (let offset = 1; offset <= tiles; offset += 1) {
    const row = GROUND_TOP_ROW - offset
    if (row < 0) return false
    if (SOLID_TILES.has(rows[row]![col]!)) return false
  }
  return true
}

/**
 * Devolve o x (em px) da faixa de chão firme mais próxima do lugar pretendido, larga o
 * bastante para o corpo e com pé-direito livre.
 *
 * Antes os inimigos, a gema e o portal nasciam em x fixos que ignoravam a grade — 16 de
 * 164 inimigos terrestres nasciam sobre poço e caíam para fora do mundo, e a gema
 * aparecia dentro de um tijolo em 9 das 32 fases (incluindo a 1-1).
 */
function firmSpotNear(rows: number[][], desiredX: number, width: number, height: number): number {
  const span = Math.max(1, Math.ceil(width / TILE))
  const desiredCol = Math.round(desiredX / TILE)
  const fits = (start: number): boolean => {
    for (let offset = 0; offset < span; offset += 1) {
      if (!isFirmColumn(rows, start + offset)) return false
      if (!hasHeadroom(rows, start + offset, height)) return false
    }
    return true
  }
  // Se o lugar pretendido já serve, ele fica onde está — alinhar ao tile por hábito
  // moveria quase toda posição de quase toda fase, e cada uma dessas mudanças vira um
  // statement a mais na IR sem melhorar nada no jogo.
  const desiredStart = Math.floor(desiredX / TILE)
  const desiredEnd = Math.floor((desiredX + width - 1) / TILE)
  let firmWhereItIs = true
  for (let col = desiredStart; col <= desiredEnd; col += 1) {
    if (!isFirmColumn(rows, col) || !hasHeadroom(rows, col, height)) firmWhereItIs = false
  }
  if (firmWhereItIs) return desiredX
  for (let delta = 0; delta <= COLS; delta += 1) {
    for (const col of delta === 0 ? [desiredCol] : [desiredCol - delta, desiredCol + delta]) {
      if (col < 1 || col + span > COLS - 1) continue
      if (fits(col)) return col * TILE
    }
  }
  return desiredX
}

function levelName(level: number): string {
  const world = Math.floor((level - 1) / 4) + 1
  const stage = ((level - 1) % 4) + 1
  return `${world}-${stage}`
}

function mapDeclarations(): JSStatement[] {
  const statements: JSStatement[] = []
  for (let world = 1; world <= 8; world += 1) {
    statements.push({ type: 'g2d:createVectorTileset', varName: `pecas${world}`, size: n(TILE) })
    // A ordem É o índice usado por `levelGrid`. 'CanoCorpo' entra no fim (7) para não
    // deslocar os índices que as grades já usam.
    const names = ['Chao', 'Tijolo', 'Premio', 'Cano', 'Plataforma', 'Ceu', 'Perigo', 'CanoCorpo']
    const roles = [
      'solid',
      'solid',
      'solid',
      'solid',
      'platform',
      'decor',
      'decor',
      'solid',
    ] as const
    for (let tile = 0; tile < names.length; tile += 1) {
      statements.push({
        type: 'g2d:defineVectorTile',
        tilesetVar: `pecas${world}`,
        index: n(tile),
        shape: `r${world}${names[tile]!}`,
        role: roles[tile]!,
      })
    }
    for (let stage = 1; stage <= 4; stage += 1) {
      const level = (world - 1) * 4 + stage
      statements.push({
        type: 'g2d:createVectorTileMap',
        varName: `mapa${level}`,
        tilesetVar: `pecas${world}`,
        grid: levelGrid(world, stage),
      })
      statements.push({
        type: 'g2d:createWorldFromTileMap',
        varName: `area${level}`,
        mapVar: `mapa${level}`,
        size: n(TILE),
      })
      statements.push({ type: 'g2d:setWorldEdges', worldVar: `area${level}`, edges: 'none' })
      statements.push({
        type: 'g2d:configureWorldCamera',
        worldVar: `area${level}`,
        horizontal: 'right',
        vertical: 'off',
        deadZoneX: n(48),
        deadZoneY: n(0),
      })
      // "Criar a Fase" é start-only: os 32 têm que ficar aqui, planos no início, e não
      // dentro de `carregarFase`. É o que dá ao motor o ponto de renascimento e o que
      // habilita o "Reiniciar a Fase" a devolver posição, câmera e tiles quebrados.
      statements.push({
        type: 'g2d:createLevel',
        varName: `fase${level}`,
        worldVar: `area${level}`,
        spawnX: n(32),
        spawnY: n(SURFACE_Y - 24),
      })
    }
  }
  return statements
}

function prepareActiveLevel(): JSStatement[] {
  return [
    { type: 'g2d:clearGroup', groupVar: 'brasas' },
    { type: 'g2d:clearGroup', groupVar: 'cascos' },
    { type: 'g2d:clearGroup', groupVar: 'espinhos' },
    { type: 'g2d:clearGroup', groupVar: 'asas' },
    { type: 'g2d:clearGroup', groupVar: 'guardioes' },
    { type: 'assign', name: 'premioAtivo', value: n(1) },
    // O herói NÃO é reposicionado aqui: quem faz isso é o "Reiniciar a Fase" do
    // `activateLevel`, que além da posição devolve a câmera e os blocos `?`.
    {
      type: 'g2d:setPosition',
      spriteVar: 'gema',
      x: variable('xGema'),
      y: n(GEMA_Y),
    },
    { type: 'g2d:setPosition', spriteVar: 'broto', x: n(-100), y: n(-100) },
    {
      type: 'g2d:setPosition',
      spriteVar: 'portal',
      x: variable('xPortal'),
      y: n(standingY(32)),
    },
    {
      type: 'g2d:setPosition',
      spriteVar: 'atalho',
      x: variable('xAtalho'),
      y: variable('yAtalho'),
    },
    { type: 'g2d:addEnemyTypeToWorld', worldVar: 'areaAtual', typeVar: 'brasas' },
    { type: 'g2d:addEnemyTypeToWorld', worldVar: 'areaAtual', typeVar: 'cascos' },
    { type: 'g2d:addEnemyTypeToWorld', worldVar: 'areaAtual', typeVar: 'espinhos' },
    { type: 'g2d:addEnemyTypeToWorld', worldVar: 'areaAtual', typeVar: 'asas' },
    { type: 'g2d:addEnemyTypeToWorld', worldVar: 'areaAtual', typeVar: 'guardioes' },
    { type: 'g2d:spawnEnemy', typeVar: 'brasas', x: variable('xBrasa1'), y: n(standingY(16)) },
    {
      type: 'if',
      cond: binary('>=', variable('etapa'), n(2)),
      then: [
        { type: 'g2d:spawnEnemy', typeVar: 'brasas', x: variable('xBrasa2'), y: n(standingY(16)) },
      ],
    },
    {
      type: 'if',
      cond: binary('>=', variable('etapa'), n(3)),
      then: [
        { type: 'g2d:spawnEnemy', typeVar: 'brasas', x: variable('xBrasa3'), y: n(standingY(16)) },
      ],
    },
    {
      type: 'if',
      cond: binary('>=', variable('mundo'), n(3)),
      then: [
        { type: 'g2d:spawnEnemy', typeVar: 'brasas', x: variable('xBrasa4'), y: n(standingY(16)) },
      ],
    },
    {
      type: 'if',
      cond: binary('>=', variable('mundo'), n(6)),
      then: [
        { type: 'g2d:spawnEnemy', typeVar: 'brasas', x: variable('xBrasa5'), y: n(standingY(16)) },
      ],
    },
    {
      type: 'if',
      cond: binary('>=', variable('mundo'), n(2)),
      then: [
        { type: 'g2d:spawnEnemy', typeVar: 'cascos', x: variable('xCasco'), y: n(standingY(16)) },
      ],
    },
    {
      type: 'if',
      cond: binary('>=', variable('mundo'), n(4)),
      then: [
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'espinhos',
          x: variable('xEspinho'),
          y: n(standingY(16)),
        },
      ],
    },
    {
      type: 'if',
      cond: equals(variable('etapa'), 3),
      then: [{ type: 'g2d:spawnEnemy', typeVar: 'asas', x: n(520), y: n(96) }],
    },
    {
      type: 'if',
      cond: equals(variable('etapa'), 4),
      then: [
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'guardioes',
          x: variable('xChefe'),
          y: n(standingY(24)),
        },
      ],
    },
    {
      type: 'if',
      cond: equals(variable('jornada'), 2),
      then: [
        {
          type: 'g2d:spawnEnemy',
          typeVar: 'espinhos',
          x: variable('xEspinhoExtra'),
          y: n(standingY(16)),
        },
      ],
    },
  ]
}

/** Altura da superfície pisável: topo da primeira linha de chão. */
const SURFACE_Y = GROUND_TOP_ROW * TILE

/** Onde a base de um corpo de altura `h` encosta no chão. */
const standingY = (height: number): number => SURFACE_Y - height

/**
 * Acha o atalho do cano: a peça de topo do cano do meio, com a caixa logo ACIMA dela.
 *
 * A caixa antiga ficava em y 192-224 e o cano tinha 1 tile: quem estava EM CIMA do cano
 * (pés em 192) não sobrepunha nada, e quem estava em pé no chão (corpo 184-208)
 * sobrepunha. O gatilho estava invertido — agachar no chão liso teleportava 4 fases e
 * agachar no cano não fazia nada.
 */
function pipeShortcut(rows: number[][]): { x: number; y: number } | null {
  const tops: number[] = []
  for (let col = 0; col < COLS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      if (rows[row]![col] === T_CANO_TOPO) {
        if (!tops.some((taken) => Math.abs(taken - col) <= 1)) tops.push(col)
        break
      }
    }
  }
  if (tops.length === 0) return null
  const col = tops[Math.min(1, tops.length - 1)]!
  let topRow = ROWS
  for (let row = 0; row < ROWS; row += 1) {
    if (rows[row]![col] === T_CANO_TOPO) {
      topRow = row
      break
    }
  }
  return { x: col * TILE, y: topRow * TILE - ATALHO_H }
}

const ATALHO_H = 16

/**
 * Altura da gema: linha 11, dois tiles acima da superfície. `firmSpotNear` exige 48px
 * de pé-direito livre naquela coluna, então ela nunca nasce dentro de tijolo.
 * O y=150 antigo era constante mágica: caía entre as linhas 9 e 10, que são exatamente
 * as linhas de tijolo e bloco `?`.
 */
const GEMA_Y = SURFACE_Y - 32

/** Coordenadas que mudam de fase para fase, derivadas da grade daquela fase. */
function levelSpawnPoints(world: number, stage: number): Record<string, number> {
  const rows = levelRows(world, stage)
  const shortcut = pipeShortcut(rows)
  return {
    xGema: firmSpotNear(rows, 382 + ((((world - 1) * 4 + stage) * 23) % 180), 16, 48),
    xPortal: firmSpotNear(rows, (COLS - 4) * TILE, 20, 48),
    xAtalho: shortcut ? shortcut.x : 23 * TILE,
    yAtalho: shortcut ? shortcut.y : SURFACE_Y - ATALHO_H,
    xChefe: firmSpotNear(rows, 930, 24, 32),
    xBrasa1: firmSpotNear(rows, 190, 16, 32),
    xBrasa2: firmSpotNear(rows, 340, 16, 32),
    xBrasa3: firmSpotNear(rows, 490, 16, 32),
    xBrasa4: firmSpotNear(rows, 640, 16, 32),
    xBrasa5: firmSpotNear(rows, 790, 16, 32),
    xCasco: firmSpotNear(rows, 350, 16, 32),
    xEspinho: firmSpotNear(rows, 610, 16, 32),
    xEspinhoExtra: firmSpotNear(rows, 760, 16, 32),
  }
}

/**
 * Posições pretendidas, antes de a grade opinar. Servem de PADRÃO compartilhado: cada
 * fase só reescreve as coordenadas que a própria grade obrigou a mover, em vez de
 * repetir as treze em trinta e duas fases. São ~400 statements a menos na IR — e menos
 * blocos no canvas da criança.
 */
const SPAWN_POINT_DEFAULTS: Record<string, number> = {
  xGema: 390,
  xPortal: (COLS - 4) * TILE,
  xAtalho: 23 * TILE,
  yAtalho: SURFACE_Y - ATALHO_H,
  xChefe: 930,
  xBrasa1: 190,
  xBrasa2: 340,
  xBrasa3: 490,
  xBrasa4: 640,
  xBrasa5: 790,
  xCasco: 350,
  xEspinho: 610,
  xEspinhoExtra: 760,
}

const SPAWN_POINT_NAMES = Object.keys(SPAWN_POINT_DEFAULTS)

function activateLevel(level: number): JSStatement[] {
  const world = Math.floor((level - 1) / 4) + 1
  const stage = ((level - 1) % 4) + 1
  const points = levelSpawnPoints(world, stage)
  return [
    { type: 'assign', name: 'mapaAtual', value: variable(`mapa${level}`) },
    { type: 'assign', name: 'areaAtual', value: variable(`area${level}`) },
    { type: 'assign', name: 'mundo', value: n(world) },
    { type: 'assign', name: 'etapa', value: n(stage) },
    { type: 'assign', name: 'tempo', value: n(300 - world * 8) },
    ...SPAWN_POINT_NAMES.filter((name) => points[name] !== SPAWN_POINT_DEFAULTS[name]).map(
      (name): JSStatement => ({ type: 'assign', name, value: n(points[name]!) }),
    ),
    // Reiniciar a Fase é o que devolve o herói ao spawn, RESETA A CÂMERA e restaura os
    // blocos `?` quebrados. Sem isto a câmera de `horizontal:'right'` ficava travada no
    // lugar da morte e o jogador renascia fora da viewport, invisível.
    { type: 'g2d:restartLevel', levelVar: `fase${level}`, spriteVar: 'lumi' },
  ]
}

function selectActiveLevel(): JSStatement[] {
  return [
    // Os padrões primeiro: a fase anterior pode ter reescrito alguma coordenada, e sem
    // isto a sobrescrita dela vazaria para a fase seguinte.
    ...SPAWN_POINT_NAMES.map(
      (name): JSStatement => ({
        type: 'assign',
        name,
        value: n(SPAWN_POINT_DEFAULTS[name]!),
      }),
    ),
    ...Array.from(
      { length: LAST_LEVEL },
      (_, index): JSStatement => ({
        type: 'if',
        cond: equals(variable('fase'), index + 1),
        then: activateLevel(index + 1),
      }),
    ),
    ...prepareActiveLevel(),
  ]
}

function loadActiveLevel(): JSStatement {
  return { type: 'callFunction', name: 'carregarFase', args: [] }
}

function nextLevel(): JSStatement[] {
  return [
    { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
    { type: 'g2d:playFx', fx: 'win' },
    { type: 'assign', name: 'fase', value: binary('+', variable('fase'), n(1)) },
    {
      type: 'if',
      cond: binary('>', variable('fase'), n(LAST_LEVEL)),
      then: [
        {
          type: 'if',
          cond: equals(variable('jornada'), 1),
          then: [
            { type: 'assign', name: 'jornada', value: n(2) },
            { type: 'assign', name: 'fase', value: n(1) },
            { type: 'assign', name: 'velocidade', value: n(3) },
            loadActiveLevel(),
          ],
          else: [{ type: 'g2d:setScene', name: 'final' }],
        },
      ],
      else: [loadActiveLevel()],
    },
  ]
}

function enemyType(
  varName: string,
  behavior: string,
  shapeName: string,
  hp: number,
  speed: number,
  w: number,
  h: number,
): JSStatement {
  return {
    type: 'g2d:defineEnemyType',
    varName,
    behavior,
    color: '#ffffff',
    image: '',
    shape: shapeName,
    hp: n(hp),
    speed: n(speed),
    dmg: n(1),
    w: n(w),
    h: n(h),
  }
}

function drawHud(): JSStatement[] {
  // O placar cabe em DUAS linhas dentro dos 256px do palco. Numa linha só, com a
  // fonte proporcional, o TEMPO começava a 30px da borda precisando de ~50 e era
  // cortado; PONTOS invadia MOEDAS assim que passava de 4 dígitos.
  // Também não há mais escurecimento: o `drawFade` cobria a TELA INTEIRA a cada
  // quadro, depois de todo o desenho, e deixava o jogo 22% mais escuro para sempre.
  return [
    {
      type: 'g2d:drawPixelText',
      ctxVar: 'ctx',
      text: 'REINO ZERO',
      x: n(8),
      y: n(6),
      size: n(1),
      color: '#ffffff',
      align: 'left',
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'PONTOS',
      value: variable('pontos'),
      x: n(8),
      y: n(24),
      color: '#ffffff',
      size: n(10),
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'MOEDAS',
      value: variable('moedas'),
      x: n(140),
      y: n(24),
      color: '#ffffff',
      size: n(10),
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'MUNDO',
      value: variable('mundo'),
      x: n(8),
      y: n(38),
      color: '#ffffff',
      size: n(10),
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'ETAPA',
      value: variable('etapa'),
      x: n(72),
      y: n(38),
      color: '#ffffff',
      size: n(10),
    },
    {
      type: 'g2d:drawScore',
      ctxVar: 'ctx',
      label: 'TEMPO',
      value: variable('tempo'),
      x: n(140),
      y: n(38),
      color: '#ffffff',
      size: n(10),
    },
  ]
}

const swimmingLevel = and(equals(variable('mundo'), 3), equals(variable('etapa'), 2))

function alternateToLivingPlayer(): JSStatement {
  return {
    type: 'if',
    cond: equals(variable('jogadores'), 2),
    then: [
      {
        type: 'if',
        cond: equals(variable('jogador'), 1),
        then: [
          {
            type: 'if',
            cond: binary('>', variable('vidas2'), n(0)),
            then: [{ type: 'assign', name: 'jogador', value: n(2) }],
          },
        ],
        else: [
          {
            type: 'if',
            cond: binary('>', variable('vidas1'), n(0)),
            then: [{ type: 'assign', name: 'jogador', value: n(1) }],
          },
        ],
      },
    ],
  }
}

const playingBody: JSStatement[] = [
  {
    type: 'if',
    cond: swimmingLevel,
    then: [{ type: 'g2d:swim', spriteVar: 'lumi', speed: variable('velocidade') }],
    else: [
      {
        type: 'g2d:classicPlatformer',
        spriteVar: 'lumi',
        speed: variable('velocidade'),
        jump: n(7.2),
      },
    ],
  },
  { type: 'g2d:collideWorld', spriteVar: 'lumi', worldVar: 'areaAtual' },
  { type: 'g2d:followCameraInWorld', spriteVar: 'lumi', worldVar: 'areaAtual' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'brasas' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'cascos' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'espinhos' },
  { type: 'g2d:applyGravityToGroup', groupVar: 'guardioes' },
  // ⚠️ A pisada vem ANTES do "Atualizar": é o "Atualizar" que colhe quem morreu e
  // solta as partículas. Na ordem invertida, a pisada do quadro N só era colhida no
  // quadro N+1 — um quadro de atraso somado ao resto.
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'brasas', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'cascos', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'espinhos', bounce: n(5.5) },
  { type: 'g2d:stompEnemy', spriteVar: 'lumi', typeVar: 'guardioes', bounce: n(6) },
  { type: 'g2d:updateEnemyType', typeVar: 'brasas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'cascos', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'espinhos', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'asas', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyType', typeVar: 'guardioes', ctxVar: 'ctx', targetVar: 'lumi' },
  { type: 'g2d:updateEnemyShells', typeVar: 'cascos', worldVar: 'areaAtual' },
  {
    type: 'g2d:forEachTileContact',
    spriteVar: 'lumi',
    mapVar: 'mapaAtual',
    side: 'head',
    contactName: 'bloco',
    body: [
      {
        type: 'if',
        cond: { type: 'g2d:tileContactIs', contactVar: 'bloco', index: n(2) },
        then: [
          { type: 'g2d:setTileAtContact', contactVar: 'bloco', index: n(1) },
          { type: 'assign', name: 'moedas', value: binary('+', variable('moedas'), n(1)) },
          { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(200)) },
          { type: 'g2d:playFx', fx: 'coin' },
          {
            type: 'if',
            cond: equals(variable('premioAtivo'), 1),
            then: [
              { type: 'assign', name: 'premioAtivo', value: n(0) },
              {
                type: 'g2d:setPosition',
                spriteVar: 'broto',
                x: { type: 'g2d:spriteX', spriteVar: 'lumi' },
                y: n(150),
              },
            ],
          },
        ],
      },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'gema' },
    then: [
      { type: 'assign', name: 'moedas', value: binary('+', variable('moedas'), n(1)) },
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(100)) },
      { type: 'g2d:playFx', fx: 'coin' },
      { type: 'g2d:setPosition', spriteVar: 'gema', x: n(-100), y: n(-100) },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'broto' },
    then: [
      { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(1) },
      { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(1000)) },
      { type: 'g2d:playFx', fx: 'powerup' },
      { type: 'g2d:setPosition', spriteVar: 'broto', x: n(-100), y: n(-100) },
    ],
  },
  {
    type: 'if',
    cond: and(
      { type: 'g2d:touches', aVar: 'lumi', bVar: 'atalho' },
      { type: 'g2d:actionPressed', action: 'down' },
    ),
    then: [
      {
        type: 'if',
        cond: binary('<=', variable('fase'), n(28)),
        then: [
          { type: 'assign', name: 'fase', value: binary('+', variable('fase'), n(4)) },
          { type: 'assign', name: 'pontos', value: binary('+', variable('pontos'), n(500)) },
          { type: 'g2d:playFx', fx: 'whoosh' },
          loadActiveLevel(),
        ],
      },
    ],
  },
  {
    type: 'if',
    cond: { type: 'g2d:touches', aVar: 'lumi', bVar: 'portal' },
    then: [
      {
        type: 'if',
        cond: or(
          binary('!=', variable('etapa'), n(4)),
          binary('<=', { type: 'g2d:countGroup', groupVar: 'guardioes' }, n(0)),
        ),
        then: nextLevel(),
      },
    ],
  },
  {
    type: 'g2d:onSpriteGroupOverlap',
    spriteVar: 'lumi',
    groupVar: 'todosInimigos',
    itemName: 'inimigoTocado',
    body: [{ type: 'g2d:hurtByEnemy', spriteVar: 'lumi', enemyVar: 'inimigoTocado' }],
  },
  {
    type: 'g2d:onEnemyShotHit',
    spriteVar: 'lumi',
    typeVar: 'guardioes',
    itemName: 'disparoGuardiao',
    body: [{ type: 'g2d:hurtByEnemy', spriteVar: 'lumi', enemyVar: 'disparoGuardiao' }],
  },
  { type: 'g2d:drawWorld', ctxVar: 'ctx', worldVar: 'areaAtual' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'gema' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'broto' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'portal' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'brasas' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'cascos' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'espinhos' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'asas' },
  { type: 'g2d:drawEnemyType', ctxVar: 'ctx', typeVar: 'guardioes' },
  { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'lumi' },
  ...drawHud(),
  {
    type: 'if',
    cond: or(
      or(
        binary('>', { type: 'g2d:spriteY', spriteVar: 'lumi' }, n(260)),
        binary('<=', variable('tempo'), n(0)),
      ),
      { type: 'g2d:healthDepleted', spriteVar: 'lumi' },
    ),
    then: [
      {
        type: 'if',
        cond: equals(variable('jogador'), 1),
        then: [{ type: 'assign', name: 'vidas1', value: binary('-', variable('vidas1'), n(1)) }],
        else: [{ type: 'assign', name: 'vidas2', value: binary('-', variable('vidas2'), n(1)) }],
      },
      alternateToLivingPlayer(),
      { type: 'g2d:changeHealth', spriteVar: 'lumi', delta: n(2) },
      { type: 'g2d:playFx', fx: 'hurt' },
      { type: 'g2d:setVelocity', spriteVar: 'lumi', vx: n(0), vy: n(0) },
      loadActiveLevel(),
      {
        type: 'if',
        cond: and(binary('<=', variable('vidas1'), n(0)), binary('<=', variable('vidas2'), n(0))),
        then: [
          { type: 'g2d:setScene', name: 'continua' },
          { type: 'g2d:playFx', fx: 'gameover' },
        ],
      },
    ],
  },
]

export const reinoZeroExample: ExtensionExample = beginnerGameExample({
  name: 'Reino Zero',
  experience: 'game',
  description:
    'Aventura de plataforma autoral com 8 mundos e 32 fases, 1 ou 2 jogadores alternados, segredos, inimigos, chefes e segunda jornada difícil. Setas/WASD movem, Z/Espaço pula, X corre, Backspace seleciona 1 ou 2 jogadores, Enter inicia e Esc pausa.',
  ir: {
    html: [{ type: 'canvas', id: 'tela', width: 256, height: 240 }],
    css: [
      {
        selector: 'body',
        declarations: {
          background: '#070b16',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'center',
          'min-height': '100vh',
          margin: '0',
        },
      },
      {
        selector: 'canvas',
        declarations: {
          background: '#5c94fc',
          border: '4px solid #f7e7b2',
          'image-rendering': 'pixelated',
          'max-width': '100%',
          height: 'auto',
        },
      },
    ],
    version: 2,
    behavior: {
      molds: [
        ...campaignShapes(),
        ...THEMES.flatMap((theme, index) => themeShapes(index, theme)),
        enemyType('brasas', 'patrulha', 'brasa', 1, 0.65, 16, 16),
        // 16×16 e não 16×20: a figura do casco é desenhada num quadrado de 16, e
        // `drawCustomShape` só translada (não escala). Com a caixa 4px mais alta que o
        // desenho, o casco aparecia flutuando 4px acima do chão em que colidia.
        enemyType('cascos', 'patrulha', 'casco', 1, 0.75, 16, 16),
        enemyType('espinhos', 'espinho', 'espinho', 1, 0.55, 16, 16),
        enemyType('asas', 'voador-vertical', 'asa', 1, 0.8, 16, 16),
        enemyType('guardioes', 'chefao', 'guardiao', 1, 0.75, 24, 24),
        { type: 'g2d:allEnemiesGroup', varName: 'todosInimigos' },
      ],
      start: [
        { type: 'g2d:enableClassicControls', mode: 'auto' },
        { type: 'g2d:setGravity', value: n(0.42) },
        ...mapDeclarations(),
        {
          type: 'g2d:createShapeSprite',
          varName: 'lumi',
          shapeName: 'lumi',
          x: n(32),
          y: n(SURFACE_Y - 24),
          w: n(16),
          h: n(24),
        },
        { type: 'g2d:setHitboxScale', spriteVar: 'lumi', percent: n(85) },
        { type: 'g2d:setHealth', spriteVar: 'lumi', amount: n(2) },
        {
          type: 'g2d:createShapeSprite',
          varName: 'gema',
          shapeName: 'gema',
          x: n(390),
          y: n(GEMA_Y),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'broto',
          shapeName: 'broto',
          x: n(-100),
          y: n(-100),
          w: n(16),
          h: n(16),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'portal',
          shapeName: 'portal',
          x: n((COLS - 4) * TILE),
          y: n(SURFACE_Y - 32),
          w: n(20),
          h: n(32),
        },
        {
          type: 'g2d:createShapeSprite',
          varName: 'atalho',
          shapeName: 'invisivel',
          x: n(23 * TILE),
          y: n(SURFACE_Y - ATALHO_H),
          w: n(2 * TILE),
          h: n(ATALHO_H),
        },
        // Coordenadas que cada fase preenche a partir da própria grade, para que gema,
        // portal, atalho e inimigos nunca caiam sobre poço nem dentro de tijolo.
        ...SPAWN_POINT_NAMES.map(
          (name): JSStatement => ({
            type: 'var',
            name,
            value: n(SPAWN_POINT_DEFAULTS[name]!),
          }),
        ),
        { type: 'var', name: 'fase', value: n(1) },
        { type: 'var', name: 'mundo', value: n(1) },
        { type: 'var', name: 'etapa', value: n(1) },
        { type: 'var', name: 'jornada', value: n(1) },
        { type: 'var', name: 'jogadores', value: n(1) },
        { type: 'var', name: 'jogador', value: n(1) },
        { type: 'var', name: 'vidas1', value: n(3) },
        { type: 'var', name: 'vidas2', value: n(0) },
        { type: 'var', name: 'pontos', value: n(0) },
        { type: 'var', name: 'moedas', value: n(0) },
        { type: 'var', name: 'tempo', value: n(300) },
        { type: 'var', name: 'velocidade', value: n(2.35) },
        { type: 'var', name: 'premioAtivo', value: n(1) },
        { type: 'var', name: 'mapaAtual', value: variable('mapa1') },
        { type: 'var', name: 'areaAtual', value: variable('area1') },
        { type: 'funcDecl', name: 'carregarFase', params: [], body: selectActiveLevel() },
        { type: 'g2d:setEnemyStompMode', typeVar: 'brasas', mode: 'squash' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'cascos', mode: 'shell' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'espinhos', mode: 'spiky' },
        { type: 'g2d:setEnemyStompMode', typeVar: 'guardioes', mode: 'damage' },
        loadActiveLevel(),
        { type: 'g2d:setScene', name: 'titulo' },
        { type: 'g2d:playMusic', tune: 'happy' },
      ],
      events: [
        {
          type: 'g2d:onActionPressed',
          action: 'pause',
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:isPaused' },
              then: [{ type: 'g2d:resumeGame' }],
              else: [{ type: 'g2d:pauseGame' }],
            },
          ],
        },
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:clear' },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'titulo' },
              then: [
                { type: 'g2d:drawWorld', ctxVar: 'ctx', worldVar: 'areaAtual' },
                { type: 'g2d:setVelocity', spriteVar: 'lumi', vx: n(0.35), vy: n(0) },
                { type: 'g2d:applyVelocity', spriteVar: 'lumi' },
                {
                  type: 'if',
                  cond: binary('>', { type: 'g2d:spriteX', spriteVar: 'lumi' }, n(220)),
                  then: [{ type: 'g2d:setPosition', spriteVar: 'lumi', x: n(18), y: n(192) }],
                },
                { type: 'g2d:drawSprite', ctxVar: 'ctx', spriteVar: 'lumi' },
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(55), color: '#071020' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'REINO ZERO',
                  x: n(128),
                  y: n(55),
                  size: n(3),
                  color: '#ffe058',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'UMA AVENTURA VETORIAL',
                  x: n(128),
                  y: n(91),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'BACKSPACE: 1/2  ENTER: JOGAR',
                  x: n(128),
                  y: n(154),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'JOGADORES',
                  value: variable('jogadores'),
                  x: n(92),
                  y: n(177),
                  color: '#f7cf45',
                  size: n(11),
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'select' },
                  then: [
                    {
                      type: 'if',
                      cond: equals(variable('jogadores'), 1),
                      then: [
                        { type: 'assign', name: 'jogadores', value: n(2) },
                        { type: 'assign', name: 'vidas2', value: n(3) },
                      ],
                      else: [
                        { type: 'assign', name: 'jogadores', value: n(1) },
                        { type: 'assign', name: 'vidas2', value: n(0) },
                      ],
                    },
                    { type: 'g2d:playFx', fx: 'coin' },
                  ],
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [
                    { type: 'g2d:setPosition', spriteVar: 'lumi', x: n(32), y: n(192) },
                    { type: 'g2d:setScene', name: 'jogando' },
                  ],
                },
              ],
            },
            { type: 'if', cond: { type: 'g2d:sceneIs', name: 'jogando' }, then: playingBody },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'continua' },
              then: [
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(100), color: '#090b18' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'CONTINUAR?',
                  x: n(128),
                  y: n(78),
                  size: n(3),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'START RECOMECA O MUNDO',
                  x: n(128),
                  y: n(132),
                  size: n(1),
                  color: '#f7cf45',
                  align: 'center',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [
                    {
                      type: 'assign',
                      name: 'fase',
                      value: binary(
                        '+',
                        binary('*', binary('-', variable('mundo'), n(1)), n(4)),
                        n(1),
                      ),
                    },
                    { type: 'assign', name: 'vidas1', value: n(3) },
                    {
                      type: 'assign',
                      name: 'vidas2',
                      value: {
                        type: 'ternary',
                        condition: equals(variable('jogadores'), 2),
                        whenTrue: n(3),
                        whenFalse: n(0),
                      },
                    },
                    loadActiveLevel(),
                    { type: 'g2d:setScene', name: 'jogando' },
                  ],
                },
              ],
            },
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'final' },
              then: [
                { type: 'g2d:drawFade', ctxVar: 'ctx', percent: n(100), color: '#090b18' },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'REINO SALVO!',
                  x: n(128),
                  y: n(66),
                  size: n(3),
                  color: '#ffe058',
                  align: 'center',
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: '32 FASES X 2 JORNADAS',
                  x: n(128),
                  y: n(116),
                  size: n(1),
                  color: '#ffffff',
                  align: 'center',
                },
                {
                  type: 'g2d:drawScore',
                  ctxVar: 'ctx',
                  label: 'PONTOS',
                  value: variable('pontos'),
                  x: n(88),
                  y: n(145),
                  color: '#ffffff',
                  size: n(12),
                },
                {
                  type: 'g2d:drawPixelText',
                  ctxVar: 'ctx',
                  text: 'START PARA VOLTAR',
                  x: n(128),
                  y: n(188),
                  size: n(1),
                  color: '#f7cf45',
                  align: 'center',
                },
                {
                  type: 'if',
                  cond: { type: 'g2d:actionPressed', action: 'start' },
                  then: [{ type: 'g2d:restart' }],
                },
              ],
            },
          ],
        },
        {
          type: 'g2d:everyFrames',
          n: n(60),
          body: [
            {
              type: 'if',
              cond: { type: 'g2d:sceneIs', name: 'jogando' },
              then: [
                { type: 'assign', name: 'tempo', value: binary('-', variable('tempo'), n(1)) },
              ],
            },
          ],
        },
      ],
    },
    extensions: [{ extensionId: 'game-2d' }],
  },
})

export const reinoZeroLevelNames = Array.from({ length: LAST_LEVEL }, (_, index) =>
  levelName(index + 1),
)
