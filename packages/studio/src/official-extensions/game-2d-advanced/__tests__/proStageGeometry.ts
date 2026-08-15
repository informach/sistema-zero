import { CAMPAIGN_PHYSICS } from '../campaignPhysics'
import type { GameKitCampaignStage } from '../campaignSchema'

/**
 * As invariantes de GEOMETRIA de uma fase da campanha.
 *
 * ⚠️ A régua NUNCA copia um número da física: ela LÊ o `CAMPAIGN_PHYSICS`. Um
 * teste que copia a premissa que deveria checar mede a si mesmo — foi por isso
 * que o `reinoZeroGeometry` do irmão g2d parou de copiar em 12/08.
 *
 * ⚠️ E ela é DELIBERADAMENTE conservadora: o alcance real do pulo correndo é
 * ~5,8 células, e a invariante cobra folga. Fase que passa raspando é fase que
 * a criança não consegue passar, porque ela não chega na beirada em velocidade
 * máxima nem solta o pulo no pixel certo.
 */

const CELULA = 16

/** Sólido de verdade: o que empurra. É a MESMA lista que o runtime usa. */
const EMPURRA = new Set(['#', 'B', '?'])
/** O que cobra vida ao encostar. */
const MACHUCA = new Set(['^'])

export interface Alcance {
  /** Quantas células o herói vence num pulo correndo, sem margem. */
  bruto: number
  /** O que a invariante cobra: o bruto com folga. */
  cobrado: number
  /** Quantas células ele sobe num pulo. */
  altura: number
}

/**
 * O alcance DERIVADO da física. Tempo de voo = 2·v/g (sobe e volta ao mesmo
 * nível); distância = tempo × velocidade de corrida.
 */
/**
 * A parte da física que o alcance usa — só ela, para o teste poder variar UMA.
 *
 * ⚠️ Os campos são `number` e não os literais do `as const`: com `Pick` o tipo
 * herda `205` e o anti-vácuo (que dobra o pulo) não compila.
 */
export interface FisicaDoPulo {
  pulo: number
  gravidade: number
  correr: number
}

export function alcanceDoPulo(fisica: FisicaDoPulo = CAMPAIGN_PHYSICS): Alcance {
  const tempoDeVoo = (2 * fisica.pulo) / fisica.gravidade
  const bruto = (fisica.correr * tempoDeVoo) / CELULA
  const altura = fisica.pulo ** 2 / (2 * fisica.gravidade) / CELULA
  // A folga e UMA CELULA INTEIRA, e nao uma porcentagem arbitraria: a crianca
  // nao chega na beirada em velocidade maxima nem solta o pulo no pixel certo.
  return { bruto, cobrado: Math.floor(bruto - 1), altura: Math.floor(altura) }
}

export interface Achado {
  /** Onde: `1-3 coluna 42`. */
  onde: string
  /** O quê, em uma frase. */
  o_que: string
}

function celula(stage: GameKitCampaignStage, row: number, col: number): string {
  return stage.tiles[row]?.charAt(col) ?? '.'
}

/**
 * A LINHA em que se fica DE PÉ nesta coluna, ou a altura do palco se não há piso.
 *
 * ⚠️ Ela sobe a partir do PISO do palco, e não desce do topo. A primeira versão
 * descia, e um bloco de prêmio flutuando quatro linhas acima do chão passava a
 * ser "o chão daquela coluna": todo degrau virava um paredão e a checagem de
 * alcance reprovou as 32 fases de uma vez. Prêmio empurra, mas não é piso.
 */
export function linhaDoChao(stage: GameKitCampaignStage, col: number): number {
  let row = stage.height - 1
  if (EMPURRA.has(celula(stage, row, col))) {
    while (row >= 0 && EMPURRA.has(celula(stage, row, col))) row -= 1
    return row + 1
  }
  // Sem chão maciço, a plataforma mais BAIXA da coluna é o piso.
  for (let r = stage.height - 1; r >= 0; r -= 1) if (celula(stage, r, col) === '=') return r
  return stage.height
}

/** Existe piso pisável nesta coluna (chão maciço OU plataforma)? */
function temApoio(stage: GameKitCampaignStage, col: number): boolean {
  return linhaDoChao(stage, col) < stage.height
}

const local = (stage: GameKitCampaignStage, col: number): string => `${stage.id} coluna ${col}`

/** I1 — o palco cabe no validador e só usa peças conhecidas. */
export function i1FormaDoPalco(stage: GameKitCampaignStage): Achado[] {
  const out: Achado[] = []
  const conhecidas = new Set(['.', '#', '=', 'B', '?', '^', '~', 'H'])
  if (stage.tiles.length !== stage.height) {
    out.push({
      onde: stage.id,
      o_que: `tem ${stage.tiles.length} linhas e diz ter ${stage.height}`,
    })
  }
  stage.tiles.forEach((linha, row) => {
    if (linha.length !== stage.width) {
      out.push({
        onde: `${stage.id} linha ${row}`,
        o_que: `tem ${linha.length} colunas, esperava ${stage.width}`,
      })
    }
    for (const peca of linha) {
      if (!conhecidas.has(peca))
        out.push({ onde: `${stage.id} linha ${row}`, o_que: `peça desconhecida "${peca}"` })
    }
  })
  return out
}

/** I2 — o herói nasce APOIADO, e não dentro da rocha nem no ar. */
export function i2NascimentoDoHeroi(stage: GameKitCampaignStage): Achado[] {
  const heroi = stage.entities.find((e) => e.kind === 'hero')
  if (!heroi) return [{ onde: stage.id, o_que: 'não tem herói' }]
  const out: Achado[] = []
  if (EMPURRA.has(celula(stage, heroi.y, heroi.x))) {
    out.push({ onde: local(stage, heroi.x), o_que: 'o herói nasce DENTRO de um sólido' })
  }
  if (linhaDoChao(stage, heroi.x) !== heroi.y + 1) {
    out.push({
      onde: local(stage, heroi.x),
      o_que: `o herói nasce na linha ${heroi.y} e o chão dali é ${linhaDoChao(stage, heroi.x)}`,
    })
  }
  return out
}

/** I3 — a saída existe, é única, está dentro do palco e apoiada. */
export function i3Saida(stage: GameKitCampaignStage): Achado[] {
  const saidas = stage.entities.filter((e) => e.kind === 'exit')
  if (saidas.length !== 1) return [{ onde: stage.id, o_que: `tem ${saidas.length} saídas` }]
  const saida = saidas[0]
  if (!saida) return []
  if (saida.x < 0 || saida.x >= stage.width) {
    return [{ onde: local(stage, saida.x), o_que: 'a saída está fora do palco' }]
  }
  return temApoio(stage, saida.x)
    ? []
    : [{ onde: local(stage, saida.x), o_que: 'a saída não tem chão embaixo' }]
}

/** I4 — nenhum poço maior do que um pulo, a não ser que uma móvel o cruze. */
export function i4Pocos(stage: GameKitCampaignStage, alcance = alcanceDoPulo()): Achado[] {
  const out: Achado[] = []
  let inicio = -1
  for (let col = 0; col <= stage.width; col += 1) {
    const vazia = col < stage.width && !temApoio(stage, col)
    if (vazia && inicio < 0) inicio = col
    if (!vazia && inicio >= 0) {
      const largura = col - inicio
      if (largura > alcance.cobrado && !movelCobre(stage, inicio, col - 1)) {
        out.push({
          onde: `${stage.id} colunas ${inicio}..${col - 1}`,
          o_que: `poço de ${largura} células sem plataforma móvel (o pulo cobre ${alcance.cobrado})`,
        })
      }
      inicio = -1
    }
  }
  return out
}

/**
 * I5 — DÁ PARA CHEGAR NA SAÍDA. É a mais forte das dez.
 *
 * Modelo por coluna: andar entre vizinhas cujo chão sobe no máximo o que um
 * pulo alcança; atravessar poço cuja largura cabe no pulo, ou que tenha uma
 * plataforma móvel. Descer é sempre possível.
 */
export function i5Alcance(stage: GameKitCampaignStage, alcance = alcanceDoPulo()): Achado[] {
  const heroi = stage.entities.find((e) => e.kind === 'hero')
  const saida = stage.entities.find((e) => e.kind === 'exit')
  if (!heroi || !saida) return []
  const chao = Array.from({ length: stage.width }, (_, col) => linhaDoChao(stage, col))
  const apoio = Array.from({ length: stage.width }, (_, col) => temApoio(stage, col))
  const alcancavel = new Set<number>([heroi.x])
  const fila = [heroi.x]
  const pode = (de: number, para: number): boolean => {
    if (para < 0 || para >= stage.width) return false
    if (apoio[para] !== true) return false
    // Subida: o degrau não pode ser mais alto que o pulo.
    return (chao[de] ?? stage.height) - (chao[para] ?? stage.height) <= alcance.altura
  }
  while (fila.length > 0) {
    const col = fila.pop() as number
    for (const passo of [-1, 1]) {
      // Andar/pular de degrau em degrau, e saltar por cima do vão que vier.
      let alvo = col + passo
      let vao = 0
      while (alvo >= 0 && alvo < stage.width && apoio[alvo] !== true) {
        alvo += passo
        vao += 1
      }
      if (
        vao > alcance.cobrado &&
        !movelCobre(stage, col + (passo > 0 ? 1 : alvo + 1), col + (passo > 0 ? vao : -1))
      )
        continue
      if (pode(col, alvo) && !alcancavel.has(alvo)) {
        alcancavel.add(alvo)
        fila.push(alvo)
      }
    }
  }
  return alcancavel.has(saida.x)
    ? []
    : [
        {
          onde: local(stage, saida.x),
          o_que: `a saída não é alcançável a partir da coluna ${heroi.x}`,
        },
      ]
}

/** I6 — nada foi APAGADO: o que a planta pediu está no palco. */
export function i6NadaFoiApagado(
  stage: GameKitCampaignStage,
  pedidas: { premios: number; moedas: number; inimigos: number },
): Achado[] {
  const out: Achado[] = []
  const premios = stage.tiles
    .join('')
    .split('')
    .filter((p) => p === '?' || p === 'B').length
  const moedas = stage.entities.filter((e) => e.kind === 'coin').length
  const inimigos = stage.entities.filter((e) =>
    ['walker', 'spiky', 'shell', 'flyer'].includes(e.kind),
  ).length
  if (premios !== pedidas.premios)
    out.push({
      onde: stage.id,
      o_que: `a planta pediu ${pedidas.premios} prêmios e o palco tem ${premios}`,
    })
  if (moedas !== pedidas.moedas)
    out.push({
      onde: stage.id,
      o_que: `a planta pediu ${pedidas.moedas} moedas e o palco tem ${moedas}`,
    })
  if (inimigos !== pedidas.inimigos)
    out.push({
      onde: stage.id,
      o_que: `a planta pediu ${pedidas.inimigos} inimigos e o palco tem ${inimigos}`,
    })
  return out
}

/** I7 — nenhuma entidade dentro de sólido, nem em cima de lava. */
export function i7EntidadesLivres(stage: GameKitCampaignStage): Achado[] {
  const out: Achado[] = []
  for (const e of stage.entities) {
    const peca = celula(stage, e.y, e.x)
    if (EMPURRA.has(peca))
      out.push({ onde: `${stage.id} ${e.kind} ${e.id}`, o_que: `está dentro de "${peca}"` })
    if (MACHUCA.has(peca))
      out.push({ onde: `${stage.id} ${e.kind} ${e.id}`, o_que: 'está em cima do espeto' })
  }
  return out
}

/** I8 — quem ANDA no chão tem chão embaixo. Voador e móvel ficam de fora. */
export function i8InimigosApoiados(stage: GameKitCampaignStage): Achado[] {
  const out: Achado[] = []
  for (const e of stage.entities) {
    if (!['walker', 'spiky', 'shell'].includes(e.kind)) continue
    if (!temApoio(stage, e.x))
      out.push({ onde: `${stage.id} ${e.kind} ${e.id}`, o_que: 'nasce sobre um poço' })
    if (linhaDoChao(stage, e.x) !== e.y + 1) {
      out.push({
        onde: `${stage.id} ${e.kind} ${e.id}`,
        o_que: `nasce na linha ${e.y} e o chão dali é ${linhaDoChao(stage, e.x)}`,
      })
    }
  }
  return out
}

/** I9 — as etapas de um MESMO mundo não repetem o céu. */
export function i9TemasDoMundo(fases: readonly GameKitCampaignStage[]): Achado[] {
  const porMundo = new Map<number, string[]>()
  for (const fase of fases) {
    const lista = porMundo.get(fase.world) ?? []
    lista.push(fase.theme)
    porMundo.set(fase.world, lista)
  }
  const out: Achado[] = []
  for (const [mundo, temas] of porMundo) {
    if (new Set(temas).size < 2)
      out.push({
        onde: `mundo ${mundo}`,
        o_que: `as ${temas.length} etapas dividem o tema "${temas[0]}"`,
      })
  }
  return out
}

/** I10 — todo tema usado tem cor. Sem isto, a fase cai no `campo` em silêncio. */
export function i10TemasComCor(
  fases: readonly GameKitCampaignStage[],
  conhecidos: ReadonlySet<string>,
): Achado[] {
  return [...new Set(fases.map((f) => f.theme))]
    .filter((tema) => !conhecidos.has(tema))
    .map((tema) => ({ onde: 'tema', o_que: `"${tema}" não está em proThemeColors` }))
}

/** Toda linha em que se pode ficar de PE nesta coluna: o chao e cada plataforma. */
function superficies(stage: GameKitCampaignStage, col: number): number[] {
  const linhas: number[] = []
  const chao = linhaDoChao(stage, col)
  if (chao < stage.height) linhas.push(chao)
  for (let row = 0; row < stage.height; row += 1) {
    if (celula(stage, row, col) === '=') linhas.push(row)
  }
  return linhas
}

/**
 * I11 - todo premio e toda moeda estao ao ALCANCE de alguma superficie.
 *
 * E a rede do defeito mais frustrante que um jogo de plataforma pode ter: a
 * coisa boa que a crianca ve e nunca pega. O pulo sobe 2,5 celulas, entao a
 * regra e "no maximo `altura + 1` linhas acima dos pes".
 *
 * ⚠️ Coluna SEM superficie fica de fora, e nao por descuido: moeda sobre poco
 * e pega em pleno voo, e e um dos gestos mais classicos do genero.
 */
export function i11ItensAlcancaveis(
  stage: GameKitCampaignStage,
  alcance = alcanceDoPulo(),
): Achado[] {
  const out: Achado[] = []
  const teto = alcance.altura + 1
  const conferir = (col: number, row: number, oQue: string): void => {
    const pisos = superficies(stage, col)
    if (pisos.length === 0) return
    const perto = pisos.filter((piso) => piso > row)
    if (perto.length === 0) return
    const distancia = Math.min(...perto.map((piso) => piso - 1 - row))
    if (distancia > teto) {
      out.push({
        onde: `${stage.id} ${oQue}`,
        o_que: `esta ${distancia} celulas acima do pe mais proximo (o pulo alcanca ${teto})`,
      })
    }
  }
  for (const e of stage.entities)
    if (e.kind === 'coin' || e.kind === 'gem') conferir(e.x, e.y, `${e.kind} ${e.id}`)
  stage.tiles.forEach((linha, row) => {
    for (let col = 0; col < stage.width; col += 1) {
      const peca = linha.charAt(col)
      if (peca === '?' || peca === 'B') conferir(col, row, `premio na coluna ${col}`)
    }
  })
  return out
}

/**
 * I12 - toda PLATAFORMA esta ao alcance do PE, e toda movel CRUZA o poco dela.
 *
 * ⭐⭐ Esta e a rede que faltava, e a falta dela custou caro: a I11 media o
 * alcance do CORPO (que serve a moeda, colhida de passagem) e nunca o do PE
 * (que serve a plataforma, em que se POUSA). Com uma constante so, em 3, a
 * camada vertical inteira das 32 fases virou decoracao e as tres fases de poco
 * largo ficaram INTRANSPONIVEIS - o piloto automatico morria com 0 vidas dentro
 * do buraco, e a I4 e a I5 aprovavam, porque bastava uma movel ter sido
 * DECLARADA perto do poco.
 *
 * Medido no motor: plataforma a 2 celulas do chao -> pousa; a 3 e a 4 -> nunca.
 */
export function i12PlataformasAlcancaveis(
  stage: GameKitCampaignStage,
  alcance = alcanceDoPulo(),
): Achado[] {
  const out: Achado[] = []
  /** Todas as linhas em que se fica de pe nesta coluna, de baixo para cima. */
  const pisos = (col: number): number[] => {
    const linhas: number[] = []
    const chao = linhaDoChao(stage, col)
    if (chao < stage.height) linhas.push(chao)
    for (let row = 0; row < stage.height; row += 1) {
      if (celula(stage, row, col) === '=') linhas.push(row)
    }
    return linhas.sort((a, b) => b - a)
  }
  const alcancavelDe = (col: number, row: number, vizinhanca: number): boolean => {
    for (let c = col - vizinhanca; c <= col + vizinhanca; c += 1) {
      if (c < 0 || c >= stage.width) continue
      for (const piso of pisos(c)) {
        if (piso > row && piso - row <= alcance.altura) return true
      }
    }
    return false
  }

  stage.tiles.forEach((linha, row) => {
    for (let col = 0; col < stage.width; col += 1) {
      if (linha.charAt(col) !== '=') continue
      if (!alcancavelDe(col, row, 1)) {
        out.push({
          onde: local(stage, col),
          o_que: `a plataforma da linha ${row} esta alta demais para o pe (o pulo sobe ${alcance.altura})`,
        })
      }
    }
  })

  for (const m of stage.entities) {
    if (m.kind !== 'movingPlatform') continue
    const raio = Math.round(Number((m.props as { range?: number } | undefined)?.range ?? 0) / 16)
    // Ela nasce sobre o poco, entao a beirada de onde se salta pode estar longe.
    if (!alcancavelDe(m.x, m.y, raio + 2)) {
      out.push({
        onde: `${stage.id} ${m.id}`,
        o_que: `a plataforma movel da linha ${m.y} esta alta demais para o pe`,
      })
    }
    if (raio <= 0)
      out.push({ onde: `${stage.id} ${m.id}`, o_que: 'a plataforma movel nao anda (alcance zero)' })
  }
  return out
}

/**
 * A movel cobre este poco? Regua UNICA, usada pela I4 e pela I5.
 *
 * ⚠️ As duas tinham a PROPRIA conta - a I4 comparava `x ± range` com o
 * intervalo do poco e a I5 usava `|x - col| <= vao + 4`. Mesma pergunta, duas
 * respostas: e assim que uma delas passa a aprovar o que a outra reprovaria.
 */
export function movelCobre(stage: GameKitCampaignStage, inicio: number, fim: number): boolean {
  return stage.entities.some((m) => {
    if (m.kind !== 'movingPlatform') return false
    const raio = Number((m.props as { range?: number } | undefined)?.range ?? 0) / CELULA
    return m.x + raio >= inicio - 1 && m.x - raio <= fim + 1
  })
}

/** Formata os achados para a mensagem do teste dizer QUEM quebrou. */
export function relatar(achados: readonly Achado[]): string {
  return achados.map((a) => `${a.onde}: ${a.o_que}`).join('\n')
}
