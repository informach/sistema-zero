import { describe, expect, it } from 'bun:test'
import { reinoZeroExample, reinoZeroLevelGrids, reinoZeroLevelNames } from '../examples'

/**
 * ⭐ A REDE QUE FALTAVA — geometria. O `reinoZeroExample.test.ts` conta linhas,
 * colunas e unicidade das grades, mas nunca pergunta ONDE as coisas ficam. Foi por
 * isso que cano enterrado no chão, cano flutuando sobre poço, gema dentro de tijolo
 * e poço largo demais para o pulo passaram batido nas 32 fases.
 *
 * Estes testes leem a IR que de fato sai (não uma reimplementação do gerador) e
 * checam as invariantes de jogabilidade fase a fase.
 */

const TILE = 16
const ROWS = 15
const EXPECTED_WIDTHS = [
  72, 74, 76, 73, 74, 76, 78, 75, 76, 78, 74, 77, 73, 77, 75, 78, 75, 78, 76, 77, 76, 78, 75, 77,
  77, 76, 78, 74, 78, 77, 76, 78,
] as const

/** Linhas de chão. A superfície pisável é o TOPO da linha 13 -> y = 208. */
const GROUND_ROWS = [13, 14] as const
const SURFACE_Y = 13 * TILE

/** Índices do tileset, na ordem de `mapDeclarations()`. */
const CHAO = 0
const TIJOLO = 1
const PREMIO = 2
const CANO_TOPO = 3
const PLATAFORMA = 4
const CEU = 5
const PERIGO = 6
const CANO_CORPO = 7
const MOEDA = 8

const SOLID = new Set<number>([CHAO, TIJOLO, PREMIO, CANO_TOPO, CANO_CORPO])
const PIPE = new Set<number>([CANO_TOPO, CANO_CORPO])

/**
 * ⚠️ Estes três números eram COPIADOS do exemplo à mão. Um teste que copia a
 * premissa que deveria checar mede a si mesmo: mudar a gravidade em
 * `examples/…/reinoZero.ts` deixava esta auditoria verde com a conta velha, e o
 * "todo poço é transponível" passava a falar de uma física que não existe mais.
 * Agora saem da MESMA IR que as grades.
 */
function numeroLiteral(value: unknown, campo: string): number {
  if (value && typeof value === 'object' && (value as { type?: string }).type === 'num') {
    return (value as { value: number }).value
  }
  if (typeof value === 'number') return value
  throw new Error(`${campo}: esperava um número literal na IR`)
}

function lerGravidade(): number {
  const statement = reinoZeroExample.ir.behavior.start.find(
    (item) => item.type === 'g2d:setGravity',
  )
  if (statement?.type !== 'g2d:setGravity') throw new Error('o exemplo não declara a gravidade')
  return numeroLiteral(statement.value, 'gravidade')
}

function lerVelocidadeBase(): number {
  const statement = reinoZeroExample.ir.behavior.start.find(
    (item) => item.type === 'var' && item.name === 'velocidade',
  )
  if (statement?.type !== 'var') throw new Error('o exemplo não declara a velocidade')
  return numeroLiteral(statement.value, 'velocidade')
}

/** O impulso do pulo vive no `classicPlatformer`, lá dentro do laço do quadro. */
function lerImpulsoDoPulo(): number {
  let encontrado: number | null = null
  const visitar = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) visitar(item)
      return
    }
    if (!value || typeof value !== 'object') return
    const node = value as Record<string, unknown>
    if (node.type === 'g2d:classicPlatformer') encontrado = numeroLiteral(node.jump, 'pulo')
    for (const child of Object.values(node)) visitar(child)
  }
  visitar(reinoZeroExample.ir.behavior.loops)
  if (encontrado === null) throw new Error('o exemplo não usa a plataforma clássica')
  return encontrado
}

const GRAVITY = lerGravidade()
const JUMP = lerImpulsoDoPulo()
const RUN_SPEED = lerVelocidadeBase()
const AIR_FRAMES = (2 * JUMP) / GRAVITY
const JUMP_REACH_PX = RUN_SPEED * AIR_FRAMES

/**
 * Largura máxima de poço aceita. Fica com folga confortável sob o alcance real
 * para que a travessia não dependa de partir do pixel exato da borda.
 */
const MAX_PIT_TILES = 3

type Grid = number[][]

function parseGrids(): Grid[] {
  expect(reinoZeroLevelGrids).toHaveLength(reinoZeroLevelNames.length)
  return reinoZeroLevelGrids.map((grid) =>
    grid.split(';').map((row) => row.split(' ').map((cell) => Number(cell))),
  )
}

/**
 * Colunas em que NÃO HÁ ONDE PISAR — os vãos de verdade.
 *
 * ⚠️ Não basta olhar as linhas de chão. Desde que as fases passaram a ser desenhadas
 * à mão, o castelo é lava com PLATAFORMA por cima: as linhas 13/14 não têm chão, e
 * mesmo assim dá para atravessar andando em cima. Contar essas colunas como buraco
 * media o cenário errado e reprovava justamente a travessia que existe.
 */
function pitColumns(grid: Grid): number[] {
  const columns: number[] = []
  const width = grid[0]?.length ?? 0
  for (let col = 0; col < width; col += 1) {
    const hasGround = GROUND_ROWS.some((row) => SOLID.has(grid[row]![col]!))
    let hasPerch = false
    for (let row = 0; row < GROUND_ROWS[0]; row += 1) {
      const tile = grid[row]![col]!
      if (SOLID.has(tile) || tile === PLATAFORMA) hasPerch = true
    }
    if (!hasGround && !hasPerch) columns.push(col)
  }
  return columns
}

/** Colunas sem chão nas duas linhas de piso, com ou sem plataforma por cima. */
function gapColumns(grid: Grid): Set<number> {
  const gaps = new Set<number>()
  const width = grid[0]?.length ?? 0
  for (let col = 0; col < width; col += 1) {
    if (!GROUND_ROWS.some((row) => SOLID.has(grid[row]![col]!))) gaps.add(col)
  }
  return gaps
}

/** Maiores sequências contíguas de uma lista de colunas. */
function longestRun(columns: number[]): number {
  let longest = 0
  let run = 0
  let previous = Number.NEGATIVE_INFINITY
  for (const col of columns) {
    run = col === previous + 1 ? run + 1 : 1
    previous = col
    if (run > longest) longest = run
  }
  return longest
}

const GRIDS = parseGrids()
const LEVELS = GRIDS.map((grid, index) => ({
  grid,
  name: reinoZeroLevelNames[index]!,
}))

describe('Reino Zero — geometria das 32 fases', () => {
  it('a física lida da IR é a que o exemplo declara', () => {
    // Se alguém afinar o pulo em `reinoZero.ts`, é AQUI que a divergência aparece,
    // em vez de a auditoria seguir verde raciocinando com números fantasmas.
    expect(GRAVITY).toBeGreaterThan(0)
    expect(JUMP).toBeGreaterThan(0)
    expect(RUN_SPEED).toBeGreaterThan(0)
    expect({ GRAVITY, JUMP, RUN_SPEED }).toEqual({ GRAVITY: 0.42, JUMP: 7.2, RUN_SPEED: 2.35 })
  })

  it('o alcance do pulo cobre a largura máxima de poço permitida', () => {
    // Não é sobre o mapa: é a premissa que torna MAX_PIT_TILES defensável.
    // ⚠️ É um LIMITE ARITMÉTICO, e limite não é prova: quem prova a travessia com o
    // integrador de verdade (aceleração, atrito, varredura de tiles) é o
    // `reinoZeroPlaythrough.test.ts`, que joga as 32 fases.
    expect(JUMP_REACH_PX).toBeGreaterThan(MAX_PIT_TILES * TILE)
  })

  it('todo poço é transponível com um pulo', () => {
    const offenders = LEVELS.filter(({ grid }) => longestRun(pitColumns(grid)) > MAX_PIT_TILES).map(
      ({ name, grid }) => `${name}: ${longestRun(pitColumns(grid))} tiles`,
    )
    expect(offenders).toEqual([])
  })

  it('⭐ nenhum tijolo, prêmio ou moeda fica PAIRANDO sobre um vão', () => {
    // ⚠️ Esta invariante não existia, e foi por isso que a 6-2 shippou com um bloco
    // de prêmio suspenso bem no meio do vão: o herói pulava, batia a cabeça nele e
    // caía dentro. Quem achou foi a SIMULAÇÃO do playthrough, não esta auditoria —
    // ela olhava poço, cano e chão, e nunca onde prêmio e perigo ficam.
    // ⚠️ A régua é a FAIXA DO ARCO, não a coluna inteira: o teto do subterrâneo passa
    // por cima dos vãos de propósito, e reprová-lo seria acusar quem está certo. Com
    // apoio em 184 e apex por volta de 123, a cabeça do herói cruza as linhas 7 a 12.
    const ARCO = { de: 6, ate: GROUND_ROWS[0] - 1 }
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const gaps = gapColumns(grid)
      for (let row = ARCO.de; row <= ARCO.ate; row += 1) {
        for (const col of gaps) {
          const tile = grid[row]![col]!
          if (tile === TIJOLO || tile === PREMIO || tile === MOEDA) {
            offenders.push(`${name}: peça ${tile} na linha ${row}, coluna ${col} (sobre o vão)`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('⭐ toda fase FORA do castelo entrega ao menos um bloco de prêmio', () => {
    // A plataforma da etapa 3 APAGAVA prêmios já colocados: medido na versão antiga,
    // as etapas 3 dos mundos 1, 4 e 7 ficavam com UM prêmio na fase inteira, porque
    // a guarda só protegia coluna de cano e não célula já escrita.
    // O castelo fica de fora de propósito: lá não há bloco de prêmio, como no jogo de
    // referência — o que a fase entrega é a luta.
    const semPremio = LEVELS.filter(
      ({ name, grid }) => !name.endsWith('-4') && !grid.some((row) => row.includes(PREMIO)),
    ).map(({ name }) => name)
    expect(semPremio).toEqual([])
  })

  it('⭐ o tema sai do TIPO da fase, e as quatro famílias existem', () => {
    // Fase subterrânea tem TETO; castelo tem lava nas duas linhas de piso do vão;
    // água não tem vão nenhum. É o que separa visualmente 1-1 de 1-2, 1-3 e 1-4 —
    // antes as quatro dividiam o mesmo céu, porque o tema era do MUNDO.
    const comTeto = LEVELS.filter(({ grid }) => SOLID.has(grid[0]![10]!)).map(({ name }) => name)
    expect(comTeto).toEqual(['1-2', '3-2', '4-2', '5-2', '6-2', '8-2'])
    const aquaticas = LEVELS.filter(({ grid }) => gapColumns(grid).size === 0).map(
      ({ name }) => name,
    )
    expect(aquaticas).toEqual(['2-2', '7-2'])
    const castelos = LEVELS.filter(
      ({ name, grid }) => name.endsWith('-4') && grid[GROUND_ROWS[0]]!.includes(PERIGO),
    ).map(({ name }) => name)
    expect(castelos).toHaveLength(8)
  })

  it('nenhum cano invade as linhas de chão', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      for (const row of GROUND_ROWS) {
        for (let col = 0; col < (grid[0]?.length ?? 0); col += 1) {
          if (PIPE.has(grid[row]![col]!)) offenders.push(`${name}: linha ${row} col ${col}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('nenhum cano paira sobre poço', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pits = new Set(pitColumns(grid))
      for (let col = 0; col < (grid[0]?.length ?? 0); col += 1) {
        const isPipeColumn = grid.some((row) => PIPE.has(row[col]!))
        if (isPipeColumn && pits.has(col)) offenders.push(`${name}: col ${col}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('todo cano tem 2 colunas, boca única no topo e ao menos 2 tiles acima do chão', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pipeColumns = new Set<number>()
      for (let col = 0; col < (grid[0]?.length ?? 0); col += 1) {
        if (grid.some((row) => PIPE.has(row[col]!))) pipeColumns.add(col)
      }
      const sorted = [...pipeColumns].sort((a, b) => a - b)
      // Agrupa colunas contíguas: cada grupo deve ter exatamente 2 colunas.
      const groups: number[][] = []
      for (const col of sorted) {
        const last = groups[groups.length - 1]
        if (last && col === last[last.length - 1]! + 1) last.push(col)
        else groups.push([col])
      }
      for (const group of groups) {
        if (group.length !== 2) {
          offenders.push(`${name}: cano de ${group.length} coluna(s) em ${group.join(',')}`)
          continue
        }
        for (const col of group) {
          const rows = grid.map((row, index) => ({ index, tile: row[col]! }))
          const body = rows.filter((cell) => PIPE.has(cell.tile))
          if (body.length < 2) {
            offenders.push(`${name}: col ${col} tem só ${body.length} tile de cano`)
          }
          const tops = body.filter((cell) => cell.tile === CANO_TOPO)
          if (tops.length !== 1) {
            offenders.push(`${name}: col ${col} tem ${tops.length} bocas (esperado 1)`)
          }
          const highest = Math.min(...body.map((cell) => cell.index))
          if (tops[0] && tops[0].index !== highest) {
            offenders.push(`${name}: col ${col} tem a boca fora do topo`)
          }
          // O tile mais baixo do cano precisa encostar na linha logo acima do chão.
          const lowest = Math.max(...body.map((cell) => cell.index))
          if (lowest !== GROUND_ROWS[0] - 1) {
            offenders.push(`${name}: col ${col} não assenta no chão (base na linha ${lowest})`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('as linhas de chão são sólidas fora dos vãos', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      // ⚠️ Aqui a régua é o VÃO cru (sem chão nas linhas 13/14), e não o "poço" — o
      // castelo tem lava nessas linhas com plataforma por cima, e é vão de propósito.
      const pits = gapColumns(grid)
      for (let col = 0; col < (grid[0]?.length ?? 0); col += 1) {
        if (pits.has(col)) continue
        const isPipeColumn = grid.some((row) => PIPE.has(row[col]!))
        if (isPipeColumn) continue
        for (const row of GROUND_ROWS) {
          if (grid[row]![col]! !== CHAO) offenders.push(`${name}: linha ${row} col ${col}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('as bordas de entrada e saída são chão firme', () => {
    const offenders: string[] = []
    for (const { name, grid } of LEVELS) {
      const pits = new Set(pitColumns(grid))
      const width = grid[0]?.length ?? 0
      for (let col = 0; col < 8; col += 1) {
        if (pits.has(col)) offenders.push(`${name}: entrada col ${col}`)
      }
      for (let col = width - 8; col < width; col += 1) {
        if (pits.has(col)) offenders.push(`${name}: saída col ${col}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it('a grade tem as dimensões declaradas e só índices conhecidos', () => {
    const known = new Set([
      CHAO,
      TIJOLO,
      PREMIO,
      CANO_TOPO,
      PLATAFORMA,
      CEU,
      PERIGO,
      CANO_CORPO,
      MOEDA,
    ])
    for (const [index, { name, grid }] of LEVELS.entries()) {
      expect(grid, name).toHaveLength(ROWS)
      const expectedWidth = EXPECTED_WIDTHS[index]
      if (expectedWidth === undefined) throw new Error(`${name}: largura autoral ausente`)
      for (const row of grid) {
        expect(row, name).toHaveLength(expectedWidth)
        for (const tile of row) expect(known.has(tile), `${name}: tile ${tile}`).toBe(true)
      }
    }
  })

  it('a superfície do chão é a referência de altura documentada', () => {
    // Guarda-trilho: se alguém mexer nas linhas de chão, os spawns têm que acompanhar.
    expect(SURFACE_Y).toBe(208)
  })
})
