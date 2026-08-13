/**
 * O Reino Zero JOGADO, quadro a quadro.
 *
 * ⚠️ Por que este arquivo existe: até 12/08/2026 a campanha carro-chefe (8 mundos,
 * 32 fases) aparecia em DOIS testes, os dois estáticos — `JSON.stringify(ir)
 * .toContain(...)` e uma auditoria da grade. Nenhum deles apertava uma tecla.
 * Vinte e cinco dos outros exemplos do Jogo 2D já tinham playthrough; justo o maior
 * não tinha. Quatro rodadas de conserto passaram por cima disso, e os defeitos que a
 * dona do produto achou JOGANDO (pisada atrasada, câmera perdida no respawn, cano
 * enterrado) eram todos invisíveis para a suíte.
 *
 * É a mesma lição já catalogada aqui: *os testes asseriam que a bala NASCEU, nunca
 * que ACERTOU*. Todo caso deste arquivo afere RESULTADO.
 */
import { describe, expect, it } from 'bun:test'
import { reinoZeroExample, reinoZeroLevelGrids } from '../examples'
import { type ExampleHarness, exampleHarness } from './examplePlaythroughHarness'

const TILE = 16
const GROUND_TOP_ROW = 13
const SURFACE_Y = GROUND_TOP_ROW * TILE // 208
const HERO_H = 24
const HERO_STANDING_Y = SURFACE_Y - HERO_H // 184
const T_PREMIO = 2
const T_CANO_TOPO = 3
const T_PERIGO = 6
const T_MOEDA = 8
const SOLID = new Set([0, 1, 2, 3, 7])

/**
 * Ordem em que os tipos nascem na área 🧩 Meus moldes. É a mesma ordem que o
 * `reinoZeroExample.test.ts` já trava na IR, então índice aqui é seguro — mas o
 * teste confere a contagem antes de indexar, para não medir o tipo errado em
 * silêncio se alguém inserir um no meio.
 */
const TIPO = {
  brasas: 0,
  cascos: 1,
  espinhos: 2,
  asas: 3,
  plantas: 4,
  guardioes: 5,
  saltadores: 6,
  investidas: 7,
} as const

/** As grades como elas de fato saem na IR — a mesma fonte da auditoria de geometria. */
function levelGrid(level: number): number[][] {
  const grid = reinoZeroLevelGrids[level - 1]
  if (!grid) throw new Error(`fase ${level} sem mapa`)
  return grid.split(';').map((row) => row.split(' ').map(Number))
}

/** Coluna com as duas linhas de piso firmes. */
function firmColumn(grid: number[][], col: number): boolean {
  return SOLID.has(grid[GROUND_TOP_ROW]?.[col] ?? -1) && SOLID.has(grid[14]?.[col] ?? -1)
}

/**
 * Um bloco `?` que dá para cabecear PARTINDO DO CHÃO logo abaixo dele: chão firme na
 * coluna e nada sólido no caminho. Sem esse cuidado o teste poderia escolher um bloco
 * inalcançável e passar a medir o próprio cenário, não a mecânica.
 */
function reachableTile(grid: number[][], tile: number): { row: number; col: number } {
  for (let col = 2; col < (grid[0]?.length ?? 0) - 2; col += 1) {
    if (!firmColumn(grid, col)) continue
    for (let row = 8; row <= 11; row += 1) {
      if (grid[row]?.[col] !== tile) continue
      let livre = true
      for (let between = row + 1; between < GROUND_TOP_ROW; between += 1) {
        if (SOLID.has(grid[between]?.[col] ?? -1)) livre = false
      }
      if (livre) return { row, col }
    }
  }
  throw new Error(`nenhum tile ${tile} alcançável na fase`)
}

function reachablePrize(grid: number[][]): { row: number; col: number } {
  return reachableTile(grid, T_PREMIO)
}

function nomeDaFase(level: number): string {
  return `${Math.floor((level - 1) / 4) + 1}-${((level - 1) % 4) + 1}`
}

/** A maior sequência contígua de colunas sem chão nenhum — o pior salto da fase. */
function maiorPoco(grid: number[][]): { inicio: number; fim: number } | null {
  const largura = grid[0]?.length ?? 0
  let melhor: { inicio: number; fim: number } | null = null
  let inicio = -1
  for (let col = 0; col <= largura; col += 1) {
    const vazio = col < largura && !firmColumn(grid, col)
    if (vazio && inicio < 0) inicio = col
    if (!vazio && inicio >= 0) {
      const candidato = { inicio, fim: col - 1 }
      if (!melhor || candidato.fim - candidato.inicio > melhor.fim - melhor.inicio) {
        melhor = candidato
      }
      inicio = -1
    }
  }
  return melhor
}

/** Linhas que o CORPO do herói ocupa em pé (y 184..208, altura 24). */
const BODY_ROWS = [11, 12] as const

/**
 * De onde o herói parte para o salto: uma corrida antes da beirada, porque partir
 * parado do último tile mede a aceleração, não o alcance do pulo.
 *
 * ⚠️ O corredor inteiro precisa estar LIVRE na altura do corpo. A primeira versão
 * só olhava a coluna de partida, e por isso o piloto ia parar de cara num cano no
 * meio do caminho — e o teste acusava a geometria do POÇO por um defeito do próprio
 * piloto. Corredor bloqueado não é caso deste teste: é outro assunto.
 */
function colunaDeImpulso(grid: number[][], bordaDoPoco: number): number | null {
  for (let recuo = 8; recuo >= 3; recuo -= 1) {
    const col = bordaDoPoco - recuo
    if (col < 1) continue
    let livre = true
    for (let entre = col; entre < bordaDoPoco; entre += 1) {
      if (!firmColumn(grid, entre)) livre = false
      for (const row of BODY_ROWS) {
        if (SOLID.has(grid[row]?.[entre] ?? -1)) livre = false
      }
    }
    if (livre) return col
  }
  return null
}

/** Começa a partida: o título só sai com o "start", e ele é lido DENTRO do quadro. */
function comecarPartida(game: ExampleHarness): void {
  expect(game.api.sceneIs('titulo')).toBe(true)
  game.fireKey('Enter')
  game.nextFrame()
  expect(game.api.sceneIs('jogando')).toBe(true)
}

/**
 * A fase que o HUD mostra, no formato do original ("1-1").
 *
 * ⚠️ MUNDO e ETAPA eram dois campos separados no placar; viraram um só, como no jogo
 * de referência. Os testes leem o HUD porque as variáveis do exemplo não são globais.
 */
function faseNoHud(game: ExampleHarness): string {
  return String(game.scores.MUNDO ?? '')
}

function segurar(game: ExampleHarness, tecla: string, quadros: number): void {
  game.fireKey(tecla)
  for (let frame = 0; frame < quadros; frame += 1) game.nextFrame()
  game.fireKey(tecla, 'keyup')
}

/** Toca o mastro e deixa a descida de encerramento terminar. */
function concluirFase(game: ExampleHarness): void {
  const heroi = game.sprites[0]
  const portal = game.sprites[3]
  if (!heroi || !portal) throw new Error('cenário incompleto')
  const anterior = faseNoHud(game)
  heroi.x = portal.x
  heroi.y = portal.y
  game.nextFrame()
  for (let frame = 0; frame < 65 && faseNoHud(game) === anterior; frame += 1) game.nextFrame()
}

/** Avança pela saída real, neutralizando só os inimigos que não são o assunto do caso. */
function avancarAte(game: ExampleHarness, faseAlvo: number): void {
  const heroi = game.sprites[0]
  const portal = game.sprites[3]
  if (!heroi || !portal) throw new Error('cenário incompleto')

  for (let fase = 1; fase < faseAlvo; fase += 1) {
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
    concluirFase(game)
  }
  expect(faseNoHud(game)).toBe(nomeDaFase(faseAlvo))
}

describe('Reino Zero — a campanha JOGADA', () => {
  it('abre no título, o Enter põe o herói em campo e o HUD conta a fase certa', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)

    expect(game.api.sceneIs('titulo')).toBe(true)
    game.nextFrame()
    expect(game.pixelTexts.map((item) => item.text)).toContain('REINO ZERO')

    game.fireKey('Enter')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)

    // O HUD é a única janela para o estado: fase, mundo e tempo não são globais.
    expect(faseNoHud(game)).toBe('1-1')
    expect(game.scores.TEMPO).toBe(292) // 300 - mundo * 8
    expect(game.scores.MOEDAS).toBe(0)
    expect(game.scores.PONTOS).toBe(0)

    const heroi = game.sprites[0]
    expect(heroi?.h).toBe(HERO_H)
    expect(heroi?.y).toBe(HERO_STANDING_Y)
    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })

  it('o Backspace alterna entre um e dois jogadores no título', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    game.nextFrame()
    expect(game.scores.JOGADORES).toBe(1)

    // ⚠️ DOIS quadros: o `drawScore` do título roda ANTES da leitura do "select" no
    // mesmo corpo, então o quadro do aperto ainda desenha o valor velho. Invisível
    // para quem joga (um quadro), mas quem mede pelo HUD precisa saber.
    game.fireKey('Backspace')
    game.nextFrame()
    game.nextFrame()
    expect(game.scores.JOGADORES).toBe(2)

    // A borda do aperto exige soltar antes de apertar de novo — sem o keyup o
    // segundo keydown não conta, e um teste que não solta mediria só o primeiro.
    game.fireKey('Backspace', 'keyup')
    game.fireKey('Backspace')
    game.nextFrame()
    game.nextFrame()
    expect(game.scores.JOGADORES).toBe(1)
    expect(game.errors).toEqual([])
  })

  it('mantém fase, pontos e moedas separados ao alternar os dois jogadores', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    game.nextFrame()
    game.fireKey('Backspace')
    game.nextFrame()
    game.fireKey('Backspace', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()

    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    const grid = levelGrid(1)
    let moeda: { row: number; col: number } | null = null
    for (let row = 0; row < grid.length && !moeda; row += 1) {
      for (let col = 0; col < (grid[row]?.length ?? 0); col += 1) {
        if (grid[row]?.[col] === T_MOEDA) {
          moeda = { row, col }
          break
        }
      }
    }
    if (!moeda) throw new Error('a fase 1-1 não tem moeda no cenário')
    heroi.x = moeda.col * TILE
    heroi.y = moeda.row * TILE
    game.nextFrame()
    expect(game.scores.MOEDAS).toBe(1)

    concluirFase(game)
    const pontosJ1 = Number(game.scores.PONTOS ?? 0)
    expect(faseNoHud(game)).toBe('1-2')
    expect(pontosJ1).toBeGreaterThanOrEqual(1000)

    heroi.y = 300
    game.nextFrame()
    game.nextFrame()
    expect(game.scores['JOG.']).toBe(2)
    expect(faseNoHud(game)).toBe('1-1')
    expect(game.scores.PONTOS).toBe(0)
    expect(game.scores.MOEDAS).toBe(0)
    expect(game.scores.VIDAS).toBe(3)

    heroi.y = 300
    game.nextFrame()
    game.nextFrame()
    expect(game.scores['JOG.']).toBe(1)
    expect(faseNoHud(game)).toBe('1-2')
    expect(game.scores.PONTOS).toBe(pontosJ1)
    expect(game.scores.MOEDAS).toBe(1)
    expect(game.scores.VIDAS).toBe(2)
    expect(game.errors).toEqual([])
  })

  it('continuar reinicia o mundo dos dois jogadores sem ressuscitar estado antigo', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    game.nextFrame()
    game.fireKey('Backspace')
    game.nextFrame()
    game.fireKey('Backspace', 'keyup')
    game.fireKey('Enter')
    game.nextFrame()
    game.fireKey('Enter', 'keyup')

    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
    concluirFase(game)
    expect(faseNoHud(game)).toBe('1-2')

    for (let morte = 0; morte < 6; morte += 1) {
      heroi.y = 300
      game.nextFrame()
    }
    expect(game.api.sceneIs('continua')).toBe(true)

    game.fireKey('Enter')
    game.nextFrame()
    game.fireKey('Enter', 'keyup')
    game.nextFrame()
    expect(game.api.sceneIs('jogando')).toBe(true)
    expect(game.scores['JOG.']).toBe(1)
    expect(faseNoHud(game)).toBe('1-1')
    expect(game.scores.VIDAS).toBe(3)

    heroi.y = 300
    game.nextFrame()
    game.nextFrame()
    expect(game.scores['JOG.']).toBe(2)
    expect(faseNoHud(game)).toBe('1-1')
    expect(game.scores.VIDAS).toBe(3)
    expect(game.errors).toEqual([])
  })

  it('anda para a direita, e CORRER cobre mais chão que andar no mesmo tempo', () => {
    const medir = (correndo: boolean): number => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      const heroi = game.sprites[0]
      if (!heroi) throw new Error('herói ausente')
      const inicio = heroi.x
      if (correndo) game.fireKey('x')
      // 60 quadros (1 segundo): tempo de a inércia do gênero chegar ao teto. Com 40 a
      // medida caía ANTES do teto de caminhada e os dois davam o mesmo número.
      segurar(game, 'ArrowRight', 60)
      if (correndo) game.fireKey('x', 'keyup')
      expect(game.errors).toEqual([])
      return heroi.x - inicio
    }

    const andando = medir(false)
    const correndo = medir(true)
    expect(andando).toBeGreaterThan(0)
    // ⚠️ Anti-vácuo: sem a metade de baixo, um "correr" quebrado que zerasse o
    // movimento inteiro passaria como se a corrida fosse mais lenta de propósito.
    expect(correndo).toBeGreaterThan(andando)
  })

  it('pula, sobe de verdade e volta a pousar na superfície', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    if (!heroi) throw new Error('herói ausente')
    expect(heroi.y).toBe(HERO_STANDING_Y)

    game.fireKey('z')
    let maisAlto = heroi.y
    for (let frame = 0; frame < 10; frame += 1) {
      game.nextFrame()
      maisAlto = Math.min(maisAlto, heroi.y)
    }
    game.fireKey('z', 'keyup')
    expect(maisAlto).toBeLessThan(HERO_STANDING_Y - 20)

    for (let frame = 0; frame < 40; frame += 1) game.nextFrame()
    expect(heroi.y).toBe(HERO_STANDING_Y)
    expect(game.errors).toEqual([])
  })

  it('a pisada derrota o inimigo NO QUADRO do contato, não quando o herói já saiu', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    expect(game.enemyTypes).toHaveLength(8)
    const brasas = game.enemyTypes[TIPO.brasas]
    const alvo = brasas?.items[0]
    if (!heroi || !brasas || !alvo) throw new Error('cenário da pisada incompleto')

    const antes = game.api.countGroup(brasas)
    expect(antes).toBeGreaterThan(0)

    // Encostando por cima e CAINDO — é a régua que o motor cobra.
    heroi.x = alvo.x
    heroi.y = alvo.y - HERO_H + 2
    heroi.vy = 4
    game.nextFrame()

    // UM quadro. Com o atraso de 20 quadros que existia antes, isto reprovava.
    expect(game.api.countGroup(brasas)).toBe(antes - 1)
    expect(game.errors).toEqual([])
  })

  it('o inimigo VOADOR pode ser derrotado com uma pisada', () => {
    // ⚠️ Ele ficava de fora da lista de modos de pisada e sem bloco de pisada, mas
    // DENTRO de "todos os inimigos": machucava ao encostar e não havia como
    // derrotá-lo. Toda etapa 3 tinha um perigo imortal no meio do caminho.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    for (let salto = 0; salto < 2; salto += 1) {
      concluirFase(game)
    }
    expect(faseNoHud(game)).toBe('1-3')

    const asas = game.enemyTypes[TIPO.asas]
    const alvo = asas?.items[0]
    if (!asas || !alvo) throw new Error('o voador não nasceu na etapa 3')
    const antes = game.api.countGroup(asas)
    expect(antes).toBeGreaterThan(0)

    heroi.x = alvo.x
    heroi.y = alvo.y - HERO_H + 2
    heroi.vy = 4
    game.nextFrame()

    expect(game.api.countGroup(asas)).toBe(antes - 1)
    expect(game.errors).toEqual([])
  })

  it('o casco nasce PARADO na pisada, e é o encostão que o lança', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    // Casco só a partir do mundo 2. O portal da etapa 4 exige o chefe derrotado,
    // então ele é recolhido antes do salto — a luta não é o assunto deste caso.
    for (let salto = 0; salto < 4; salto += 1) {
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      concluirFase(game)
    }
    expect(faseNoHud(game)).toBe('2-1')

    const cascos = game.enemyTypes[TIPO.cascos]
    const alvo = cascos?.items[0]
    if (!cascos || !alvo) throw new Error('o casco não nasceu no mundo 2')

    heroi.x = alvo.x
    heroi.y = alvo.y - HERO_H + 2
    heroi.vy = 4
    game.nextFrame()

    expect(alvo._shell).toBe(true)
    expect(alvo._shellMoving).toBe(false)
    // Parado é inofensivo — encostar nele não pode custar vida.
    expect(alvo.dmg).toBe(0)

    // Um casco parado também precisa permanecer fisicamente parado. A gravidade não
    // pode ficar acumulando em `vy` enquanto o atualizador especializado o ignora.
    heroi.x = 0
    const yParado = alvo.y
    for (let frame = 0; frame < 60; frame += 1) game.nextFrame()
    expect(alvo.y).toBe(yParado)
    expect(alvo.vy).toBe(0)
    expect(game.errors).toEqual([])
  })

  it('⭐ o casco recolhido NO AR cai até o chão, em vez de ficar pendurado', () => {
    // ⚠️ Este caso é o par POSITIVO do de cima. A rede escrita para a BUG-004 provou
    // que um casco parado NO CHÃO mantém `y` — o que é certo lá e virou contrato para
    // todo lugar: `updateEnemyType` pula qualquer casco vivo e `updateEnemyShells`
    // pulava os parados, então nada integrava a queda. Pisar num casco no ar (beirada
    // de poço, tijolo que some por baixo) o deixava pendurado para sempre, contra o
    // que o próprio comentário do runtime promete ("o casco CAI").
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    for (let salto = 0; salto < 4; salto += 1) {
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      concluirFase(game)
    }
    expect(faseNoHud(game)).toBe('2-1')

    const cascos = game.enemyTypes[TIPO.cascos]
    const alvo = cascos?.items[0]
    if (!cascos || !alvo) throw new Error('o casco não nasceu no mundo 2')

    // Levanta o bicho e pisa nele lá em cima: é o gesto que o jogo permite e que
    // nenhum teste exercitava.
    const alturaDoAr = SURFACE_Y - 96
    alvo.y = alturaDoAr
    heroi.x = alvo.x
    heroi.y = alvo.y - HERO_H + 2
    heroi.vy = 4
    game.nextFrame()
    expect(alvo._shell).toBe(true)
    expect(alvo._shellMoving).toBe(false)

    // Longe do herói para ninguém chutar o casco sem querer.
    heroi.x = 0
    for (let frame = 0; frame < 90; frame += 1) game.nextFrame()

    expect(alvo.y).toBeGreaterThan(alturaDoAr)
    // Pousou: parou de acelerar com a base assentada no topo de uma peça (pode ser o
    // chão ou uma plataforma no caminho — o que importa é que ele não ficou no ar).
    expect(alvo.vy).toBe(0)
    expect((alvo.y + alvo.h) % TILE).toBe(0)
    expect(alvo.y + alvo.h).toBeLessThanOrEqual(SURFACE_Y)
    expect(game.errors).toEqual([])
  })

  it('nada somente nas fases aquáticas declaradas 2-2 e 7-2', () => {
    const medirSubida = (fase: number): { y: number; vy: number } => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      avancarAte(game, fase)
      const heroi = game.sprites[0]
      if (!heroi) throw new Error('herói ausente')
      heroi.x = 5 * TILE
      heroi.y = 100
      heroi.vx = 0
      heroi.vy = 0
      game.fireKey('ArrowUp')
      game.nextFrame()
      game.fireKey('ArrowUp', 'keyup')
      expect(game.errors).toEqual([])
      return { y: heroi.y, vy: heroi.vy }
    }

    expect(medirSubida(6).y).toBeLessThan(100)
    expect(medirSubida(26).y).toBeLessThan(100)
    const subterranea = medirSubida(10)
    expect(subterranea.y).toBeGreaterThan(100)
    expect(subterranea.vy).toBeGreaterThan(0)
  })

  it('não cria atalho invisível em nenhuma das 18 fases sem cano', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')
    const semCano: string[] = []

    for (let fase = 1; fase <= 32; fase += 1) {
      const nome = nomeDaFase(fase)
      const temCano = levelGrid(fase).some((row) => row.includes(T_CANO_TOPO))
      expect(faseNoHud(game)).toBe(nome)

      if (!temCano) {
        semCano.push(nome)
        // Era a posição de fallback do atalho fantasma. O comando precisa ser
        // inofensivo em toda grade que não declara um cano visível.
        heroi.x = 23 * TILE
        heroi.y = HERO_STANDING_Y
        heroi.vx = 0
        heroi.vy = 0
        game.fireKey('ArrowDown')
        game.nextFrame()
        game.fireKey('ArrowDown', 'keyup')
        expect(faseNoHud(game), nome).toBe(nome)
      }

      if (fase < 32) {
        for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
        concluirFase(game)
      }
    }

    expect(semCano).toEqual([
      '1-3',
      '1-4',
      '2-2',
      '2-3',
      '2-4',
      '3-3',
      '3-4',
      '4-3',
      '4-4',
      '5-3',
      '5-4',
      '6-3',
      '6-4',
      '7-2',
      '7-3',
      '7-4',
      '8-3',
      '8-4',
    ])
    expect(game.errors).toEqual([])
  })

  it('cabecear o bloco ? dá o prêmio e GASTA o bloco — o segundo toque não paga de novo', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    if (!heroi) throw new Error('herói ausente')

    const premio = reachablePrize(levelGrid(1))
    const cabecear = (): void => {
      heroi.x = premio.col * TILE
      heroi.y = HERO_STANDING_Y
      heroi.vx = 0
      heroi.vy = 0
      game.fireKey('z')
      for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
      game.fireKey('z', 'keyup')
      for (let frame = 0; frame < 10; frame += 1) game.nextFrame()
    }

    // O herói agora começa PEQUENO (1 de vida, teto 2), então um encostão o mata: os
    // inimigos saem de cena, porque o que está sob julgamento aqui é o bloco.
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    const vidaAntes = game.api.getHealth(heroi)
    expect(vidaAntes).toBe(1)
    cabecear()
    // ⚠️ O bloco dá uma coisa OU a outra, como no original: o primeiro prêmio da fase
    // é a ESTRELA, e por isso NÃO sai moeda nesta cabeçada. Antes ele pagava os dois,
    // e a economia de "100 moedas = 1 vida" inflava sozinha.
    expect(game.scores.MOEDAS).toBe(0)
    expect(game.scores.PONTOS).toBe(1000) // só a estrela, encostada no mesmo pulo

    // O primeiro bloco solta a ESTRELA, não o cogumelo: a vida segue em 1 e o que
    // muda é a invencibilidade. O ciclo do poder tem teste próprio logo abaixo.
    expect(game.api.getHealth(heroi)).toBe(1)

    // O bloco virou tijolo comum: bater de novo não pode pagar segunda vez.
    cabecear()
    expect(game.scores.MOEDAS).toBe(0)
    expect(game.scores.PONTOS).toBe(1000)
    expect(game.errors).toEqual([])
  })

  it('⭐ a moeda do CENÁRIO é coletada ao passar por dentro, e some', () => {
    // Peça "atravessa e avisa": antes isto era impossível, porque contato de tile só
    // nascia da resolução de colisão — ou seja, só de peça sólida ou plataforma.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    if (!heroi) throw new Error('herói ausente')

    const grid = levelGrid(1)
    let moeda: { row: number; col: number } | null = null
    for (let row = 0; row < grid.length && !moeda; row += 1) {
      for (let col = 0; col < (grid[row]?.length ?? 0); col += 1) {
        if (grid[row]?.[col] === T_MOEDA) {
          moeda = { row, col }
          break
        }
      }
    }
    if (!moeda) throw new Error('a fase 1-1 não tem moeda no cenário')

    const antes = Number(game.scores.MOEDAS ?? 0)
    heroi.x = moeda.col * TILE
    heroi.y = moeda.row * TILE
    heroi.vx = 0
    heroi.vy = 0
    game.nextFrame()
    expect(game.scores.MOEDAS).toBe(antes + 1)

    // Sumiu: voltar ao mesmo lugar não paga de novo.
    heroi.x = moeda.col * TILE
    heroi.y = moeda.row * TILE
    game.nextFrame()
    expect(game.scores.MOEDAS).toBe(antes + 1)
    expect(game.errors).toEqual([])
  })

  it('broto e estrela percorrem o cenário depois que aparecem', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    const estrela = game.sprites[4]
    if (!heroi || !broto || !estrela) throw new Error('poderes ausentes')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
    heroi.x = 0

    broto.x = 96
    broto.y = HERO_STANDING_Y + 8
    broto.vx = 0
    broto.vy = 0
    game.nextFrame()
    expect(broto.x).toBeGreaterThan(96)

    estrela.x = 144
    estrela.y = HERO_STANDING_Y + 8
    estrela.vx = 0
    estrela.vy = 0
    let maisAlta = estrela.y
    for (let frame = 0; frame < 16; frame += 1) {
      game.nextFrame()
      maisAlta = Math.min(maisAlta, estrela.y)
    }
    expect(estrela.x).toBeGreaterThan(144)
    expect(maisAlta).toBeLessThan(HERO_STANDING_Y + 8)
    expect(game.errors).toEqual([])
  })

  it('⭐ o quique da estrela nunca GANHA altura', () => {
    // ⚠️ Rede contra um tripwire de ponto flutuante. O quique dispara com `vy == 0`,
    // e hoje isso só acontece quando o chão para a estrela porque somar 0,42 a −4,8
    // nunca cai exatamente em zero. Um par que divida exato (gravidade 0,5 com quique
    // 6, por exemplo) devolveria um impulso novo NO ÁPICE e a estrela subiria para
    // sempre — sem erro nenhum na tela. Quem retunar esses números tropeça aqui.
    // ⚠️ A primeira versão desta rede acusou um ganho de 284px que NÃO existe: eu
    // tinha estacionado o herói em x=1200, fora de uma fase de 1152px, e ele morreu.
    // A morte recarrega a fase, que guarda a estrela em (−100, −100) — e o −100 virou
    // "altura". Piloto fora do mundo mede o próprio piloto.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const estrela = game.sprites[4]
    if (!heroi || !estrela) throw new Error('cenário incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    // O herói fica onde nasceu (em pé, sem entrada); a estrela vai para uma coluna
    // com chão firme longe dele, para nem ser coletada nem cair num poço.
    const grade = levelGrid(1)
    let coluna = -1
    for (let col = 14; col < 40; col += 1) {
      if (firmColumn(grade, col) && firmColumn(grade, col + 1)) coluna = col
      if (coluna > 0) break
    }
    if (coluna < 0) throw new Error('sem chão firme para a sonda')
    estrela.x = coluna * TILE
    estrela.y = HERO_STANDING_Y
    estrela.vx = 0
    estrela.vy = 0

    let maisAlto = estrela.y
    let maisBaixo = estrela.y
    for (let frame = 0; frame < 120; frame += 1) {
      game.nextFrame()
      // Guardada (coletada ou recarregada) ou fora do mundo: daí em diante o eixo Y
      // não diz mais nada sobre o quique.
      if (estrela.y < 0 || estrela.y > 260) break
      maisAlto = Math.min(maisAlto, estrela.y)
      maisBaixo = Math.max(maisBaixo, estrela.y)
    }

    // Anti-vácuo: ela QUICA mesmo (uma estrela inerte passaria só no teto de cima).
    expect(maisBaixo - maisAlto).toBeGreaterThan(4)
    // Altura de um quique de 4,8 sob gravidade 0,42 é ~25px; o dobro é folga larga.
    expect(maisBaixo - maisAlto).toBeLessThan(56)
    expect(game.errors).toEqual([])
  })

  it('a centésima moeda concede uma vida e reinicia o contador', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const gema = game.sprites[1]
    if (!heroi || !gema) throw new Error('cenário de moedas incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    for (let moeda = 0; moeda < 100; moeda += 1) {
      gema.x = heroi.x
      gema.y = heroi.y
      game.nextFrame()
    }

    expect(game.scores.MOEDAS).toBe(0)
    expect(game.scores.VIDAS).toBe(4)
    expect(game.errors).toEqual([])
  })

  it('o broto torna o herói grande e a flor libera o estado de fogo', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    const flor = game.sprites[6]
    if (!heroi || !broto || !flor) throw new Error('progressão de poderes incompleta')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    expect(game.api.getHealth(heroi)).toBe(1)
    expect(heroi.h).toBe(24)
    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    expect(game.api.getHealth(heroi)).toBe(2)
    expect(heroi.h).toBe(32)

    flor.x = heroi.x
    flor.y = heroi.y
    game.nextFrame()
    expect(game.api.getHealth(heroi)).toBe(3)
    expect(heroi.h).toBe(32)
    expect(game.errors).toEqual([])
  })

  it('o estado de fogo atira uma bola que percorre o mundo e derrota inimigo', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    const flor = game.sprites[6]
    const brasas = game.enemyTypes[TIPO.brasas]
    const alvo = brasas?.items[0]
    const bolas = game.groups[0]
    if (!heroi || !broto || !flor || !brasas || !alvo || !bolas) {
      throw new Error('cenário da bola de fogo incompleto')
    }

    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    flor.x = heroi.x
    flor.y = heroi.y
    game.nextFrame()
    expect(game.api.getHealth(heroi)).toBe(3)

    alvo.x = heroi.x + 72
    alvo.y = SURFACE_Y - alvo.h
    const antes = game.api.countGroup(brasas)
    const pontosAntes = Number(game.scores.PONTOS)
    game.fireKey('x')
    game.nextFrame()
    game.fireKey('x', 'keyup')
    expect(game.api.countGroup(bolas)).toBeGreaterThan(0)
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()

    expect(game.api.countGroup(brasas)).toBe(antes - 1)
    expect(game.api.countGroup(bolas)).toBe(0)
    expect(game.scores.PONTOS).toBe(pontosAntes + 200)
    expect(game.errors).toEqual([])
  })

  it('atira para o último lado encarado, mesmo depois de parar, e limita duas bolas', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    const flor = game.sprites[6]
    const bolas = game.groups[0]
    if (!heroi || !broto || !flor || !bolas) throw new Error('estado de fogo incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    flor.x = heroi.x
    flor.y = heroi.y
    game.nextFrame()
    segurar(game, 'ArrowLeft', 3)
    for (let frame = 0; frame < 30; frame += 1) game.nextFrame()
    expect(Math.abs(heroi.vx ?? 0)).toBeLessThan(0.01)

    for (let tiro = 0; tiro < 3; tiro += 1) {
      game.fireKey('x')
      game.nextFrame()
      game.fireKey('x', 'keyup')
      game.nextFrame()
    }

    expect(game.api.countGroup(bolas)).toBe(2)
    expect(bolas.items.every((bola) => (bola.vx ?? 0) < 0)).toBe(true)
  })

  it('não dá pontos por acertar um inimigo imortal que não foi derrotado', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    avancarAte(game, 13)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    const flor = game.sprites[6]
    const espinhos = game.enemyTypes[TIPO.espinhos]
    const alvo = espinhos?.items[0]
    if (!heroi || !broto || !flor || !espinhos || !alvo) throw new Error('espinho ausente')
    for (const tipo of game.enemyTypes) if (tipo !== espinhos) game.api.clearGroup(tipo)
    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    flor.x = heroi.x
    flor.y = heroi.y
    game.nextFrame()

    alvo.x = heroi.x + 32
    alvo.y = SURFACE_Y - alvo.h
    const pontosAntes = Number(game.scores.PONTOS)
    game.fireKey('x')
    game.nextFrame()
    game.fireKey('x', 'keyup')
    for (let frame = 0; frame < 12; frame += 1) game.nextFrame()

    expect(game.api.countGroup(espinhos)).toBe(1)
    expect(game.scores.PONTOS).toBe(pontosAntes)
  })

  it('cada castelo posiciona sua barra de fogo e os castelos tardios reforçam o chefe', () => {
    const encontro = (fase: number): { barraX: number; chefes: number } => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      avancarAte(game, fase)
      const barra = game.sprites[7]
      const chefes = game.enemyTypes[TIPO.guardioes]
      if (!barra || !chefes) throw new Error('castelo incompleto')
      expect(barra.x).toBeGreaterThan(0)
      expect(game.errors).toEqual([])
      return { barraX: barra.x, chefes: game.api.countGroup(chefes) }
    }

    const primeiro = encontro(4)
    const tardio = encontro(20)
    expect(tardio.barraX).not.toBe(primeiro.barraX)
    expect(tardio.chefes).toBeGreaterThan(primeiro.chefes)
  })

  it('a barra de fogo do castelo causa dano por contato', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    avancarAte(game, 4)
    const heroi = game.sprites[0]
    const barra = game.sprites[7]
    if (!heroi || !barra) throw new Error('barra de fogo ausente')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    heroi.x = barra.x
    heroi.y = barra.y
    game.nextFrame()

    expect(heroi.x).toBeLessThan(64)
    expect(faseNoHud(game)).toBe('1-4')
    expect(game.errors).toEqual([])
  })

  it('a segunda jornada reduz o tempo e troca a composição de inimigos', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('campanha incompleta')
    const cascosPrimeira = game.api.countGroup(game.enemyTypes[TIPO.cascos]!)
    const espinhosPrimeira = game.api.countGroup(game.enemyTypes[TIPO.espinhos]!)

    for (let fase = 1; fase <= 32; fase += 1) {
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      concluirFase(game)
    }

    expect(faseNoHud(game)).toBe('1-1')
    expect(Number(game.scores.TEMPO)).toBeLessThan(292)
    expect(game.api.countGroup(game.enemyTypes[TIPO.cascos]!)).toBeGreaterThan(cascosPrimeira)
    expect(game.api.countGroup(game.enemyTypes[TIPO.espinhos]!)).toBeGreaterThan(espinhosPrimeira)
    expect(game.errors).toEqual([])
  })

  it('o herói grande quebra tijolo ao cabecear, e o espaço fica gasto', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    if (!heroi || !broto) throw new Error('cenário do tijolo incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    const tijolo = reachableTile(levelGrid(1), 1)
    const cabecear = (): void => {
      heroi.x = tijolo.col * TILE
      // Começa um pixel abaixo do bloco e cruza sua face inferior subindo. O salto
      // completo já tem teste próprio; aqui a unidade sob julgamento é o impacto.
      heroi.y = (tijolo.row + 1) * TILE + 1
      heroi.vx = 0
      heroi.vy = -4
      game.nextFrame()
    }

    const pontosAntes = Number(game.scores.PONTOS ?? 0)
    cabecear()
    expect(game.scores.PONTOS).toBe(pontosAntes + 100)
    cabecear()
    expect(game.scores.PONTOS).toBe(pontosAntes + 100)
    expect(game.errors).toEqual([])
  })

  it('⭐ encostar na LAVA do castelo mata — o castelo tem fosso de verdade', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    for (let salto = 0; salto < 3; salto += 1) {
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      concluirFase(game)
    }
    expect(faseNoHud(game)).toBe('1-4')

    const grid = levelGrid(4)
    const colunaDeLava = grid[GROUND_TOP_ROW]?.indexOf(T_PERIGO) ?? -1
    expect(colunaDeLava).toBeGreaterThan(0)

    heroi.x = colunaDeLava * TILE
    heroi.y = GROUND_TOP_ROW * TILE
    heroi.vy = 1
    game.nextFrame()

    // Morreu e voltou ao começo da fase — sem depender de sair da tela por baixo.
    expect(heroi.x).toBeLessThan(64)
    expect(faseNoHud(game)).toBe('1-4')
    expect(game.errors).toEqual([])
  })

  it('⭐ o poder ENCOLHE ao levar dano em vez de matar, e some ao renascer', () => {
    // O ciclo inteiro do cogumelo do original: pequeno aguenta um golpe, grande
    // aguenta dois, e morrer devolve o herói ao tamanho pequeno.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    if (!heroi) throw new Error('herói ausente')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
    expect(game.api.getHealth(heroi)).toBe(1)

    // Pega o broto (o exemplo o teleporta para cima do herói ao abrir um bloco ?).
    const broto = game.sprites[2]
    if (!broto) throw new Error('broto ausente')
    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    expect(game.api.getHealth(heroi)).toBe(2)

    // Um encostão de inimigo tira o poder e NÃO mata.
    const brasas = game.enemyTypes[TIPO.brasas]
    if (!brasas) throw new Error('tipo ausente')
    const xDeVolta = heroi.x
    game.api.spawn(brasas as never, { x: heroi.x, y: heroi.y })
    const bicho = brasas.items[0]
    if (bicho) {
      bicho.x = heroi.x
      bicho.y = heroi.y
    }
    game.nextFrame()
    expect(game.api.getHealth(heroi)).toBe(1)
    // Sobreviveu: não foi devolvido ao começo da fase.
    expect(Math.abs(heroi.x - xDeVolta)).toBeLessThan(32)
    expect(game.errors).toEqual([])
  })

  it('⭐ morrer SEM zerar a vida também devolve o herói pequeno', () => {
    // ⚠️ O título do caso acima promete "e some ao renascer" e nunca chega a matar
    // ninguém. E o renascimento tinha um buraco aritmético: ele soma +2 e tira 1
    // contando começar do zero, mas `changeHealth` SATURA no teto (3). Só a morte
    // por vida zerada passa pelo zero — o tempo acabando e a queda para fora do
    // mundo entram no MESMO ramo com a vida ainda cheia, e o herói renascia GRANDE.
    // Morrer pequeno de tempo chegava a devolvê-lo maior do que ele estava.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const broto = game.sprites[2]
    if (!heroi || !broto) throw new Error('cenário incompleto')
    for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

    broto.x = heroi.x
    broto.y = heroi.y
    game.nextFrame()
    // Anti-vácuo: sem isto o caso passaria com o power-up quebrado.
    expect(game.api.getHealth(heroi)).toBe(2)

    // Queda para fora do mundo: é a única das três causas que dá para provocar num
    // quadro, e as três compartilham exatamente o mesmo ramo.
    heroi.y = 300
    game.nextFrame()

    expect(heroi.x).toBeLessThan(64) // renasceu no começo da fase
    expect(game.api.getHealth(heroi)).toBe(1)
    expect(game.errors).toEqual([])
  })

  it('cair no buraco devolve o herói ao começo da fase COM a câmera', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    if (!heroi) throw new Error('herói ausente')

    // Longe o bastante para a câmera ter andado: ela é 'right', então nunca volta
    // sozinha — foi exatamente esse o relato de "renasce e não dá para jogar".
    heroi.x = 800
    game.nextFrame()
    expect(game.api.cameraX()).toBeGreaterThan(0)

    heroi.y = 300 // abaixo da linha de morte (260)
    game.nextFrame()

    expect(heroi.x).toBeLessThan(64)
    expect(game.api.cameraX()).toBe(0)
    expect(faseNoHud(game)).toBe('1-1') // morrer não avança fase
    expect(game.errors).toEqual([])
  })

  it('encostar no mastro faz a descida antes de trocar e recarregar a fase', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('portal ausente')

    expect(faseNoHud(game)).toBe('1-1')
    heroi.x = portal.x
    heroi.y = portal.y
    game.nextFrame()
    const yNoToque = heroi.y
    expect(faseNoHud(game)).toBe('1-1')
    for (let frame = 0; frame < 20; frame += 1) game.nextFrame()
    expect(faseNoHud(game)).toBe('1-1')
    expect(heroi.y).toBeGreaterThan(yNoToque)
    for (let frame = 0; frame < 45; frame += 1) game.nextFrame()

    expect(faseNoHud(game)).toBe('1-2')
    expect(game.scores.PONTOS).toBeGreaterThanOrEqual(1000)
    // Recarregou: o herói volta ao começo da fase nova, não fica no portal.
    expect(heroi.x).toBeLessThan(64)
    expect(game.errors).toEqual([])
  })

  it('o maior poço de CADA UMA das 32 fases é transponível de verdade', () => {
    // ⚠️ A auditoria de geometria prova isto por ARITMÉTICA (alcance = velocidade ×
    // tempo no ar) sobre constantes que ela mesma carregava. Limite não é prova: o
    // integrador real tem aceleração, atrito, varredura de tiles e encaixe no chão.
    // Aqui o herói ATRAVESSA, correndo e pulando, nas trinta e duas.
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    const reprovadas: string[] = []
    for (let level = 1; level <= 32; level += 1) {
      const grid = levelGrid(level)
      // Inimigo não entra nesta conta: o que está sob julgamento é a GEOMETRIA.
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)

      const poco = maiorPoco(grid)
      // ⚠️ 3-2 é a fase de NATAÇÃO: lá o herói não anda nem pula, e — hoje — nem
      // afunda, então poço não é perigo. Medi-la com a régua do pulo mediria outra
      // coisa. (Que a natação não tenha empuxo é defeito, e mora na etapa das fases.)
      const partida = poco && !(level === 10) ? colunaDeImpulso(grid, poco.inicio) : null
      if (poco && partida !== null) {
        heroi.x = partida * TILE
        heroi.y = HERO_STANDING_Y
        heroi.vx = 0
        heroi.vy = 0
        game.nextFrame()

        game.fireKey('x') // correr
        game.fireKey('ArrowRight')
        let quadrosDePulo = -1
        let travadoHa = 0
        let caiu = false
        let quadrosGastos = 0
        for (let frame = 0; frame < 200; frame += 1) {
          const colunaAFrente = Math.floor((heroi.x + (heroi.w ?? 16) + 2) / TILE)
          // Encostou em cano/tijolo segurando a direita: o gesto humano é pular por
          // cima. Sem isto o piloto ficava preso no obstáculo do meio do caminho e
          // o teste acusava a GEOMETRIA por um defeito do próprio piloto.
          if (heroi.onGround && Math.abs(heroi.vx ?? 0) < 0.05) travadoHa += 1
          else travadoHa = 0

          const querPular = colunaAFrente >= poco.inicio || travadoHa >= 3
          if (quadrosDePulo < 0 && heroi.onGround && querPular) {
            game.fireKey('z')
            quadrosDePulo = 0
            travadoHa = 0
          }
          if (quadrosDePulo >= 0) {
            quadrosDePulo += 1
            // Segurar o botão é o que dá altura; soltar cedo demais encurta o pulo.
            if (quadrosDePulo === 14) game.fireKey('z', 'keyup')
            // Rearma só depois de pousar: pulo novo exige aperto novo.
            if (quadrosDePulo > 14 && heroi.onGround) {
              game.fireKey('z', 'keyup')
              quadrosDePulo = -1
            }
          }
          const xAntes = heroi.x
          game.nextFrame()
          // ⚠️ `y > 260` NUNCA é visível de fora: a regra de morte do exemplo roda no
          // MESMO quadro e já devolve o herói ao começo da fase. O sinal honesto de
          // queda é o RECUO brusco para o nascedouro.
          if (heroi.x < xAntes - TILE * 2) {
            caiu = true
            break
          }
          if (heroi.x > (poco.fim + 1) * TILE && heroi.onGround) break
          quadrosGastos = frame + 1
        }
        game.fireKey('ArrowRight', 'keyup')
        game.fireKey('x', 'keyup')
        game.fireKey('z', 'keyup')

        const largura = poco.fim - poco.inicio + 1
        if (caiu || heroi.x <= poco.fim * TILE) {
          reprovadas.push(
            `${nomeDaFase(level)}: poço de ${largura} tiles nas colunas ` +
              `${poco.inicio}-${poco.fim}, partindo de ${partida} — ` +
              `${caiu ? 'CAIU' : 'parou'} em x=${Math.round(heroi.x)} ` +
              `y=${Math.round(heroi.y)} chao=${heroi.onGround} apos ${quadrosGastos}q`,
          )
        }
      }

      if (level < 32) {
        // O portal da etapa 4 só abre com o chefe derrotado — e ele já foi recolhido
        // pelo `clearGroup` acima, então a passagem fica livre.
        concluirFase(game)
      }
    }

    // ⭐ Zero. Quando esta simulação nasceu, a 6-2 reprovava: havia um bloco de prêmio
    // FLUTUANDO sobre o vão, bem no arco do pulo, e o herói batia a cabeça nele e caía
    // dentro. A auditoria de geometria não enxergava — ela olhava poço, cano e chão, e
    // nunca onde prêmio, perigo e plataforma ficam. Com as 32 fases desenhadas à mão
    // (e a invariante nova na auditoria), a lista tem que continuar vazia.
    expect(reprovadas).toEqual([])

    expect(faseNoHud(game)).toBe('8-4')
    expect(game.errors).toEqual([])
  }, 120_000)

  it('⭐ o MASTRO paga pela ALTURA do toque', () => {
    // O fim de fase era um portal de 32px encostado no chão: chegar em cima ou embaixo
    // dava o mesmo. Agora é um mastro de 9 tiles e a altura vale ponto, que é o gesto
    // que fecha toda fase do jogo de referência.
    const medir = (alturaDoToque: number): number => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      const heroi = game.sprites[0]
      const mastro = game.sprites[3]
      if (!heroi || !mastro) throw new Error('cenário incompleto')
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      heroi.x = mastro.x
      heroi.y = alturaDoToque
      game.nextFrame()
      return Number(game.scores.PONTOS ?? 0)
    }

    const encostandoEmbaixo = medir(HERO_STANDING_Y)
    const encostandoNoAlto = medir(SURFACE_Y - 128)
    expect(encostandoEmbaixo).toBeGreaterThan(0)
    expect(encostandoNoAlto).toBeGreaterThan(encostandoEmbaixo)
  })

  it('⭐ a ESTRELA deixa invencível, e aí o encostão derrota o inimigo', () => {
    // ⚠️ O inimigo tem que ser o que a FASE solta: um sprite criado à mão pelo "criar
    // no grupo" nasce sem vida, e aí o "Mudar a vida" não tem o que zerar — o teste
    // mediria o próprio cenário em vez da mecânica.
    const encostarNoInimigo = (comEstrela: boolean): { vivos: number; morreu: boolean } => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      const heroi = game.sprites[0]
      const estrela = game.sprites[4]
      const brasas = game.enemyTypes[TIPO.brasas]
      const bicho = brasas?.items[0]
      if (!heroi || !estrela || !brasas || !bicho) throw new Error('cenário incompleto')

      if (comEstrela) {
        estrela.x = heroi.x
        estrela.y = heroi.y
        game.nextFrame()
      }

      // ⚠️ Longe do nascedouro ANTES do encontro: o herói nasce em x=32, então
      // "voltou para perto de 32" só distingue vivo de morto se ele tiver saído de lá.
      heroi.x = 300
      heroi.y = HERO_STANDING_Y
      game.nextFrame()

      const antes = game.api.countGroup(brasas)
      bicho.x = heroi.x
      bicho.y = heroi.y
      game.nextFrame()
      // Quem COLHE o morto é o "Atualizar", que roda ANTES do bloco de contato no
      // laço: a baixa aparece no quadro seguinte. (Na pisada não é assim — lá o
      // exemplo põe o "Pisar" antes do "Atualizar" de propósito.)
      game.nextFrame()
      expect(game.errors).toEqual([])
      return { vivos: antes - game.api.countGroup(brasas), morreu: heroi.x < 100 }
    }

    // Sem estrela o herói está pequeno: um encostão o mata e ninguém morre do outro lado.
    const semEstrela = encostarNoInimigo(false)
    expect(semEstrela.morreu).toBe(true)

    // Com estrela é o contrário: o inimigo cai e o herói segue.
    const comEstrela = encostarNoInimigo(true)
    expect(comEstrela.vivos).toBe(1)
    expect(comEstrela.morreu).toBe(false)
  })

  it('⭐ com a estrela o ESPINHO também cai, e não vira fonte infinita de ponto', () => {
    // ⚠️ O caso acima usa a brasa, que é mortal. O espinho é IMORTAL de propósito
    // (`{ immortal: 1 }` na tabela do runtime: a vida volta ao teto antes da poda),
    // então o "Mudar a vida em -99" da estrela era desfeito no update seguinte. E o
    // bloco de contato não tem trava: parar em cima dele com a estrela pagava 200
    // pontos POR QUADRO, para sempre, sem nunca derrotar ninguém.
    const comEstrela = (ligarEstrela: boolean) => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      avancarAte(game, 13) // 4-1: o espinho só nasce a partir do mundo 4
      const heroi = game.sprites[0]
      const estrela = game.sprites[4]
      const espinhos = game.enemyTypes[TIPO.espinhos]
      const bicho = espinhos?.items[0]
      if (!heroi || !estrela || !espinhos || !bicho) {
        throw new Error('o espinho não nasceu no mundo 4')
      }

      if (ligarEstrela) {
        estrela.x = heroi.x
        estrela.y = heroi.y
        game.nextFrame()
      }

      heroi.x = 300
      heroi.y = HERO_STANDING_Y
      game.nextFrame()

      const vivosAntes = game.api.countGroup(espinhos)
      const pontosAntes = Number(game.scores.PONTOS ?? 0)
      for (let frame = 0; frame < 30; frame += 1) {
        bicho.x = heroi.x
        bicho.y = heroi.y
        game.nextFrame()
      }
      expect(game.errors).toEqual([])
      return {
        baixas: vivosAntes - game.api.countGroup(espinhos),
        ganho: Number(game.scores.PONTOS ?? 0) - pontosAntes,
      }
    }

    const ligada = comEstrela(true)
    expect(ligada.baixas).toBe(1)
    // Uma derrota paga uma vez. 30 quadros encostado não podem virar 6.000 pontos.
    expect(ligada.ganho).toBeLessThanOrEqual(400)

    // Anti-vácuo: sem estrela o espinho continua vivo (é o que o comportamento promete).
    expect(comEstrela(false).baixas).toBe(0)
  })

  it('⭐ a estrela também protege da barra de fogo e do tiro do guardião', () => {
    // No jogo de referência a estrela cobre TUDO menos poço, lava e tempo. Aqui a
    // lava já ficava (corretamente) de fora, mas os dois caminhos de dano do castelo
    // — a barra que gira e o disparo do chefe — passavam por cima da invencibilidade,
    // que é justamente onde ela mais importa.
    const noCastelo = (ligarEstrela: boolean, ataque: 'barra' | 'tiro'): number => {
      const game = exampleHarness(reinoZeroExample, () => 0.5)
      comecarPartida(game)
      avancarAte(game, 4)
      const heroi = game.sprites[0]
      const broto = game.sprites[2]
      const estrela = game.sprites[4]
      const barra = game.sprites[7]
      const chefes = game.enemyTypes[TIPO.guardioes]
      if (!heroi || !broto || !estrela || !barra || !chefes) throw new Error('castelo incompleto')

      // ⚠️ O herói tem que estar GRANDE para o dano ser legível: pequeno, um golpe o
      // mata, o renascimento repõe a vida e a conta de "quanto ele perdeu" volta zero
      // — foi assim que a primeira versão deste anti-vácuo se enganou sozinha.
      broto.x = heroi.x
      broto.y = heroi.y
      game.nextFrame()
      expect(game.api.getHealth(heroi)).toBe(2)

      if (ligarEstrela) {
        estrela.x = heroi.x
        estrela.y = heroi.y
        game.nextFrame()
      }
      const vidaAntes = game.api.getHealth(heroi)

      if (ataque === 'barra') {
        for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
        heroi.x = barra.x
        heroi.y = barra.y
      } else {
        // Um disparo do chefe posto na cara do herói: a mira dele é periódica, e
        // esperar o ciclo mediria a cadência em vez da invencibilidade.
        const tiros = (chefes as unknown as { bullets: { items: unknown[] } }).bullets
        game.api.spawn(tiros as never, { x: heroi.x, y: heroi.y, w: 8, h: 8 })
        barra.x = -100
      }
      game.nextFrame()
      expect(game.errors).toEqual([])
      return vidaAntes - game.api.getHealth(heroi)
    }

    // Anti-vácuo: sem estrela os dois ataques cobram vida.
    expect(noCastelo(false, 'barra')).toBeGreaterThan(0)
    expect(noCastelo(false, 'tiro')).toBeGreaterThan(0)

    expect(noCastelo(true, 'barra')).toBe(0)
    expect(noCastelo(true, 'tiro')).toBe(0)
  })

  it('⭐ a PLANTA do cano não aceita pisada', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    const heroi = game.sprites[0]
    const portal = game.sprites[3]
    if (!heroi || !portal) throw new Error('cenário incompleto')

    // A planta aparece a partir do mundo 3.
    for (let salto = 0; salto < 8; salto += 1) {
      for (const tipo of game.enemyTypes) game.api.clearGroup(tipo)
      concluirFase(game)
    }
    expect(faseNoHud(game)).toBe('3-1')

    const plantas = game.enemyTypes[TIPO.plantas]
    const alvo = plantas?.items[0]
    if (!plantas || !alvo) throw new Error('a planta não nasceu no mundo 3')
    const antes = game.api.countGroup(plantas)

    heroi.x = alvo.x
    heroi.y = alvo.y - HERO_H + 2
    heroi.vy = 4
    game.nextFrame()

    // Continua de pé: pisar numa planta é o erro clássico de quem aprende.
    expect(game.api.countGroup(plantas)).toBe(antes)
    expect(game.errors).toEqual([])
  })

  it('atravessa a fase inteira sem um erro e sem um aviso do motor', () => {
    const game = exampleHarness(reinoZeroExample, () => 0.5)
    comecarPartida(game)
    game.fireKey('x')
    segurar(game, 'ArrowRight', 240)
    game.fireKey('x', 'keyup')

    expect(game.errors).toEqual([])
    expect(game.warnings).toEqual([])
  })
})
