import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { reinoZeroProStages } from '../examples/reinoZeroProLevels'
import type { GameKitCampaignStage, GameKitEntity } from '../runtimeContract'
import { type CampaignRun, chaoCorrido, faseDeTeste, playCampaign } from './campaignHarness'

/**
 * O motor da campanha, JOGADO.
 *
 * ⭐⭐ A razão de este arquivo existir: o Reino Zero Pro é o carro-chefe da
 * extensão (32 fases) e não tinha UM teste que jogasse. O `reinoZeroProExample`
 * é estático, o `proCampaign.test.ts` roda quadros num quarto sintético 16×8 que
 * só empresta o id, e o e2e atravessa as fases por TELEPORTE. É a mesma raiz que
 * o irmão g2d pagou em 12/08 — os testes asseriam que a bala NASCEU, nunca que
 * ela ACERTOU — e aqui ela é mais larga: a régua declarada do exemplo é
 * "réplica autoral do Super Mario", e nenhum inimigo dele foi jamais exercido.
 *
 * ⚠️ As fases daqui são SINTÉTICAS de propósito: chão corrido e uma peça de cada
 * vez. Assim o que falhar aponta o MOTOR, não a planta da fase. A geometria das
 * 32 plantas tem rede própria.
 */

const CHAO = 9 // a última linha de `chaoCorrido(_, 10)`
const CHAO_TOPO = CHAO * 16 // 144

function fase(
  entities: GameKitCampaignStage['entities'],
  paredes: ReadonlyArray<{ row: number; col: number; tile: string }> = [],
): GameKitCampaignStage {
  return faseDeTeste(chaoCorrido(40, 10, paredes), entities)
}

/**
 * Sobe a aventura de UMA fase — a forma que todos os casos daqui usam.
 *
 * Ela mesma guarda a corrida em `corrida` para o `afterEach` desmontar o espião
 * do canvas: o registro de módulos do bun não é isolado por arquivo, e um espião
 * deixado para trás contamina o arquivo seguinte.
 */
async function jogar(
  entities: GameKitCampaignStage['entities'],
  paredes?: ReadonlyArray<{ row: number; col: number; tile: string }>,
): Promise<CampaignRun> {
  corrida = await playCampaign({
    build: (api) => {
      api.defineCampaign({ id: 'teste', version: 1, firstStage: '1-1' })
      api.defineCampaignStage(fase(entities, paredes))
      api.startCampaign('1-1')
    },
  })
  return corrida
}

const heroi = (x: number, y: number) => ({ kind: 'hero' as const, id: 'lumi', x, y })

let corrida: CampaignRun | null = null

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  corrida?.dispose()
  corrida = null
})

describe('campanha da gk — o inimigo de CHÃO', () => {
  it('⭐⭐ cai até o chão quando nasce no ar', async () => {
    // Não é caso de laboratório: as entidades da fase nascem alinhadas ao TILE,
    // e o bicho tem 14px de altura numa célula de 16 — ele nunca nasce apoiado.
    const r = await jogar([heroi(2, 8), { kind: 'walker', id: 'bicho', x: 10, y: 5 }])

    expect(r.entity('bicho').y).toBe(80)
    r.run(60)

    const pousado = r.entity('bicho')
    expect(pousado.y).toBeGreaterThan(80)
    expect(pousado.y + pousado.h).toBeGreaterThanOrEqual(CHAO_TOPO - 2)
    expect(pousado.y + pousado.h).toBeLessThanOrEqual(CHAO_TOPO + 2)
  })

  it('⭐⭐ ANDA em vez de vibrar no lugar', async () => {
    // A sonda de beirada olha `y + h + 2`. Com o bicho pendurado no ar, isso cai
    // em espaço vazio a cada quadro: ele inverte a direção sessenta vezes por
    // segundo e treme parado. Em jogo, é o inimigo que não vem para cima de você.
    const r = await jogar([heroi(2, 8), { kind: 'walker', id: 'bicho', x: 10, y: 7 }])

    r.run(60)

    const bicho = r.entity('bicho')
    expect(Math.abs(bicho.x - 160)).toBeGreaterThan(20)
    // Anti-vácuo: ele andou E não virou. Só a distância deixaria passar um bicho
    // que corre para um lado e volta; só a direção deixaria passar um bicho parado.
    expect(bicho.direction).toBe(-1)
  })

  it('⭐ não atravessa TIJOLO (a sonda de parede só conhecia "#")', async () => {
    // O tilemap declara `#`, `B` e `?` sólidos (`proBuildTilemap`), e o herói é
    // barrado pelos três. A sonda do inimigo compara com `'#'` na unha.
    const r = await jogar(
      [heroi(2, 8), { kind: 'walker', id: 'bicho', x: 10, y: 8 }],
      [{ row: 8, col: 8, tile: 'B' }],
    )

    expect(r.entity('bicho').direction).toBe(-1)
    r.run(90)

    const bicho = r.entity('bicho')
    expect(bicho.x).toBeGreaterThan(140)
    expect(bicho.direction).toBe(1)
  })
})

describe('campanha da gk — o ESPINHO', () => {
  it('⭐⭐ machuca quem encosta nele', async () => {
    // `spiky` simplesmente não está no bloco de contato: hoje o espinho é um
    // enfeite. A guarda de baixo (`stomp && kind !== "spiky"`) é código morto.
    const r = await jogar([heroi(10, 8), { kind: 'spiky', id: 'espinho', x: 10, y: 8 }])

    expect(r.lives()).toBe(5)
    r.run(1)

    expect(r.lives()).toBe(4)
  })

  it('⭐ machuca TAMBÉM quando pisado, e sobrevive à pisada', async () => {
    // Quatro evidências dizem que essa é a intenção: o rótulo do catálogo, a
    // guarda morta, a cor da peça de perigo e o irmão clássico.
    const r = await jogar([heroi(10, 6), { kind: 'spiky', id: 'espinho', x: 10, y: 8 }])

    r.run(40)

    expect(r.lives()).toBeLessThan(5)
    expect(r.entity('espinho').active).toBe(true)
  })
})

describe('campanha da gk — o CASCO', () => {
  it('⭐⭐ pisar RECOLHE o casco; ele não sai disparado', async () => {
    // Hoje é o inverso: a pisada dispara (fase 2, 130 px/s) e a segunda pisada
    // mata. É exatamente o defeito que o irmão g2d corrigiu em 13/08.
    const r = await jogar([heroi(10, 6), { kind: 'shell', id: 'casco', x: 10, y: 8 }])

    r.until('a pisada no casco', () => r.entity('casco').phase !== 1, 60)
    const parado = r.entity('casco').x
    r.run(30)

    expect(Math.abs(r.entity('casco').x - parado)).toBeLessThan(3)
  })

  it('⭐⭐ pisar duas vezes NÃO apaga o casco', async () => {
    // As paredes seguram o casco num corredor de um tile e meio, para a segunda
    // pisada acontecer sem depender de o herói correr atrás dele.
    const r = await jogar(
      [heroi(10, 6), { kind: 'shell', id: 'casco', x: 10, y: 8 }],
      [
        { row: 8, col: 9, tile: '#' },
        { row: 8, col: 12, tile: '#' },
      ],
    )

    r.until('a primeira pisada', () => r.entity('casco').phase !== 1, 60)
    r.run(90)

    expect(r.entity('casco').active).toBe(true)
  })
})

describe('campanha da gk — o GUARDIÃO', () => {
  it('⭐ avisa "guardiao" também quando morre para a forma invencível', async () => {
    // Duas mortes de chefe, um aviso só: quem derruba o guardião com a estrela
    // não dispara o "quando vencer o guardião" que a criança ligou.
    const r = await jogar([
      heroi(10, 8),
      { kind: 'powerup', id: 'estrela', x: 10, y: 8, variant: 'invencivel' },
      { kind: 'boss', id: 'chefe', x: 14, y: 8 },
    ])

    r.run(2)
    expect(r.snap().hero?.form).toBe('invencivel')

    r.hold('direita')
    r.until('o guardião cair', () => !r.entity('chefe').active, 240)

    expect(r.events.map((e) => e.name)).toContain('guardiao')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// As FASES DE VERDADE. Acima o motor foi exercido em quartos sintéticos; aqui é
// o Reino Zero Pro que a criança abre.
// ─────────────────────────────────────────────────────────────────────────────

const faseReal = (id: string): GameKitCampaignStage => {
  const achada = reinoZeroProStages.find((stage) => stage.id === id)
  if (!achada) throw new Error(`a fase ${id} não existe`)
  return achada
}

/** O herói vivo, ou uma falha legível — `campaignHero()` devolve null fora de fase. */
function heroiVivo(r: CampaignRun): GameKitEntity {
  const h = r.api.campaignHero()
  if (!h) throw new Error('a campanha não tem herói')
  return h
}

/** Sobe a campanha REAL, começando na fase pedida. */
async function jogarReal(id: string, fases = [faseReal(id)]): Promise<CampaignRun> {
  corrida = await playCampaign({
    build: (api) => {
      api.defineCampaign({ id: 'reino-zero-pro', version: 2, firstStage: id })
      for (const fase of fases) api.defineCampaignStage(fase)
      api.startCampaign(id)
    },
  })
  return corrida
}

/**
 * O PILOTO AUTOMÁTICO: segura direita + correr e martela o pulo.
 *
 * Não é um jogador bom — é um jogador BURRO de propósito. Se até ele avança, a
 * fase está atravessável; e o gêmeo emparedado logo abaixo é o que prova que
 * "avançou" não é o piloto passando por dentro da parede.
 */
function pilotoAutomatico(r: CampaignRun, passos: number): number {
  r.hold('direita')
  r.hold('correr')
  let maisLonge = r.snap().hero?.x ?? 0
  for (let i = 0; i < passos; i += 8) {
    r.hold('pular')
    r.run(5)
    r.release('pular')
    r.run(3)
    maisLonge = Math.max(maisLonge, r.snap().hero?.x ?? 0)
  }
  r.release('direita')
  r.release('correr')
  return maisLonge
}

describe('Reino Zero Pro — as fases de verdade', () => {
  it('a 1-1 carrega com o céu do campo e o herói apoiado no chão', async () => {
    const r = await jogarReal('1-1')

    const snap = r.snap()
    expect(snap.stageId).toBe('1-1')
    expect(snap.theme).toBe('campo')
    r.run(10)
    // ⚠️ A régua é "está apoiado no piso", e não o `onGround` do quadro: medido,
    // ele PISCA em quem está parado (o herói afunda 0,15 px por quadro e só
    // colide de dois em dois). É inofensivo — o tempo de coiote cobre o pulo —,
    // mas um teste que o lesse direto seria intermitente.
    const heroi = r.snap().hero
    expect(heroi).not.toBeNull()
    expect(Math.abs((heroi?.y ?? 0) + (heroi?.h ?? 0) - 15 * 16)).toBeLessThanOrEqual(1)
    expect(r.events.map((e) => e.name)).toContain('fase')
  })

  it('⭐⭐ o piloto automático ATRAVESSA a 1-1 — e o gêmeo emparedado NÃO', async () => {
    const r = await jogarReal('1-1')
    const chegou = pilotoAutomatico(r, 900)
    // Passar do primeiro poço (colunas 26-27) já é prova de andar, pular e cair
    // em pé. Sem o gêmeo abaixo, isto seria "o corredor bloqueado" de novo.
    expect(chegou).toBeGreaterThan(30 * 16)
    r.dispose()

    const fase = faseReal('1-1')
    const parede = fase.tiles.map((linha) => `${linha.slice(0, 8)}#${linha.slice(9)}`)
    const emparedada = { ...fase, id: '1-1', tiles: parede }
    const gemeo = await jogarReal('1-1', [emparedada])
    expect(pilotoAutomatico(gemeo, 900)).toBeLessThan(8 * 16)
  })

  it('⭐⭐ o primeiro bicho da 1-1 ANDA — na fase de verdade, não num quarto de teste', () => {
    // Esta é a prova que faltava. Nas 32 plantas as entidades nascem alinhadas
    // ao TILE e o bicho tem 14 px numa célula de 16: sem gravidade ele ficava
    // pendurado, a sonda de beirada lia vazio e ele invertia a direção sessenta
    // vezes por segundo. Em jogo: o inimigo que nunca vem para cima de você.
    return jogarReal('1-1').then((r) => {
      const nasceu = r.entity('inimigo-1')
      r.run(120)
      const agora = r.entity('inimigo-1')

      expect(Math.abs(agora.x - nasceu.x)).toBeGreaterThan(20)
      // E ele está apoiado: caiu os 2 px que faltavam e ficou.
      expect(agora.y).toBeGreaterThan(nasceu.y)
      expect(agora.onGround).toBe(true)
    })
  })

  it('⭐ pisar no primeiro bicho da 1-1 o derruba', async () => {
    const r = await jogarReal('1-1')
    const bicho = r.entity('inimigo-1')
    // ⚠️ Aqui o teleporte é legítimo, e a diferença importa: o que este caso
    // mede é a PISADA, não o caminho até ela — o caminho é o piloto automático
    // logo acima. Atravessar a fase por teleporte para depois dizer que ela foi
    // atravessada era o que o e2e fazia.
    r.api.placeCharacter(heroiVivo(r), bicho.x, bicho.y - 40)
    r.until('a pisada derrubar o bicho', () => !r.entity('inimigo-1').active, 120)

    expect(r.entity('inimigo-1').active).toBe(false)
    expect(r.lives()).toBe(5)
  })

  it('⭐ as moedas da 1-1 são colhidas andando', async () => {
    const r = await jogarReal('1-1')
    pilotoAutomatico(r, 600)

    expect(r.snap().progress.coins).toBeGreaterThan(0)
    expect(r.events.filter((e) => e.name === 'coleta').length).toBeGreaterThan(0)
  })

  it('⭐ a saída da 1-4 fica TRANCADA enquanto o guardião estiver vivo', async () => {
    const r = await jogarReal('1-4')
    const fase = faseReal('1-4')
    const saida = fase.entities.find((e) => e.kind === 'exit')
    if (!saida) throw new Error('a 1-4 perdeu a saída')

    // Teleporta o herói para a saída: o que este caso mede é a TRANCA, não o
    // caminho — o caminho é o piloto automático logo acima.
    r.api.placeCharacter(heroiVivo(r), saida.x * 16, (saida.y - 1) * 16)
    r.run(4)

    expect(r.events.map((e) => e.name)).toContain('saida-bloqueada')
    expect(r.snap().stageId).toBe('1-4')
  })

  it('as 32 fases sobem no motor sem um aviso sequer', async () => {
    // O `validateCampaignStage` roda em TS no teste do exemplo; aqui quem
    // valida é o runtime de verdade, que tem a própria cópia da régua.
    const r = await playCampaign({
      build: (api) => {
        api.defineCampaign({ id: 'reino-zero-pro', version: 2, firstStage: '1-1' })
        for (const fase of reinoZeroProStages) {
          expect({ id: fase.id, aceita: api.defineCampaignStage(fase) }).toEqual({
            id: fase.id,
            aceita: true,
          })
        }
        api.startCampaign('1-1')
      },
    })
    corrida = r
    r.run(30)
    expect(r.avisos).toEqual([])
  })
})
