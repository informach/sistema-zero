import type { GameKitCampaignStage } from '../campaignSchema'

/**
 * As 32 fases do Reino Zero Pro, ESCRITAS À MÃO.
 *
 * ⭐⭐ Antes elas saíam de resto de divisão (`col += 14 + order`, poço quando
 * `world === 3`, prêmio quando `col % 2 === 0`): ninguém tinha escolhido um
 * poço, um cano ou uma fileira de moeda em fase nenhuma, e a única conferência
 * de geometria era "a gema não está dentro de sólido", numa célula só. A régua
 * declarada do exemplo é "réplica autoral do Super Mario", e planta sorteada não
 * chega perto disso.
 *
 * ⭐⭐ O TEMA sai do TIPO da fase, não do mundo. Era o mundo que decidia, então
 * 1-1, 1-2, 1-3 e 1-4 dividiam o mesmo céu — o mesmo defeito que o irmão g2d
 * corrigiu em 12/08. São os MESMOS oito nomes de tema de antes (quatro tipos ×
 * duas metades da jornada), então a IR não cresce um byte.
 *
 * ⚠️ O `y` de TODA entidade de chão é DERIVADO (`groundRowAt`), nunca autorado.
 * É o maior anteparo contra a classe de defeito que a planta sorteada tinha:
 * bicho nascendo dentro da rocha, moeda dentro do cano, prêmio no meio do poço.
 *
 * ⚠️ A ORDEM do desenho é a segunda defesa: chão primeiro, e nada depois ocupa
 * coluna de poço nem célula já escrita. No irmão clássico a plataforma da etapa
 * 3 APAGAVA prêmios — medido: 6 dos 9 sumiam.
 */

/** O que a fase É. O tema, a peça do fundo do poço e a espessura do chão saem daqui. */
export type ProStageKind = 'superficie' | 'subterraneo' | 'agua' | 'castelo'

export interface StagePlan {
  kind: ProStageKind
  /** Em células. O palco tem 16 linhas em todas as fases. */
  largura: number
  /** Uma frase do que esta fase ensina — vira a dica da primeira etapa do mundo. */
  ideia: string
  /** `[coluna, largura]` de cada poço. */
  pocos?: ReadonlyArray<readonly [number, number]>
  /**
   * `[coluna, largura, altura]` do terreno elevado (o cano, o degrau, a muralha).
   *
   * ⚠️ `altura` vai até `DEGRAU_MAXIMO`: um degrau mais alto que o pulo é uma
   * PAREDE, e a checagem de alcance reprova a fase inteira — foi assim que a
   * primeira leva destas plantas caiu, 30 de 32.
   */
  degraus?: ReadonlyArray<readonly [number, number, number]>
  /**
   * `[coluna, largura]` das plataformas de atravessar por baixo.
   *
   * ⚠️ A ALTURA não é autorada: ela é sempre `ALTURA_DA_PLATAFORMA` acima do chão
   * DAQUELA coluna. O pátio vertical de um jogo de plataforma é curto — o pulo
   * sobe 2,5 células — e altura escrita à mão é exatamente como nasce a
   * plataforma que a criança vê e nunca alcança. Quer um andar mais alto? Ponha
   * a plataforma em cima de um DEGRAU: ela sobe junto, e continua alcançável.
   */
  plataformas?: ReadonlyArray<readonly [number, number]>
  /** `[coluna, peça]` — `?` dá prêmio, `B` é tijolo. A altura é a da cabeçada. */
  premios?: ReadonlyArray<readonly [number, '?' | 'B']>
  /**
   * `[coluna, quantas, altura acima do chão]`. Duas alturas só:
   * `MOEDA_NO_CHAO` (pega andando) e `MOEDA_NO_ALTO` (só de cima da plataforma).
   */
  moedas?: ReadonlyArray<readonly [number, number, number]>
  /** `[coluna, tipo]`. A altura vem do chão daquela coluna. */
  inimigos?: ReadonlyArray<readonly [number, 'walker' | 'spiky' | 'shell' | 'flyer']>
  /** `[coluna, alcance em células]` das plataformas móveis — é o que abre poço largo. */
  moveis?: ReadonlyArray<readonly [number, number]>
  /** Coluna da escada de mão. */
  escada?: number
  /** Coluna do cogumelo, quando a fase dá um. */
  poder?: number
  /** Coluna do checkpoint. Sempre autorada: ela é o meio JOGÁVEL, não o meio aritmético. */
  checkpoint: number
}

/** 16 linhas em todas as fases: a matemática de altura fica uma só. */
export const PRO_STAGE_HEIGHT = 16

/**
 * Profundidade das piscinas. O chão das fases aquáticas tem a mesma espessura,
 * então a superfície da água fica alinhada ao piso das margens.
 */
export const PROFUNDIDADE_DA_AGUA = 4

/**
 * As alturas que o pulo permite, em células acima do chão da coluna.
 *
 * ⭐⭐ Elas não são gosto, e não são UMA só: o pulo sobe 205²/(2·520) = 40 px, ou
 * 2,5 células, e **o PÉ e a CABEÇA têm alcances diferentes**.
 *
 * - Para POUSAR, o pé precisa subir a altura inteira: 2 células dá, 3 não dá.
 *   Medido em cima do motor, com o pulo segurado até o topo: plataforma a 2
 *   células → pousa; a 3 e a 4 → nunca pousa.
 * - Para dar CABEÇADA basta a cabeça varrer a face de baixo do bloco, e ela
 *   varre os 40 px inteiros — por isso o prêmio pode ficar uma célula mais alto
 *   que a plataforma.
 *
 * ⚠️⚠️ A primeira versão deste arquivo usava UMA constante em 3 para as duas
 * coisas, e o resultado foi que **a camada vertical inteira das 32 fases virou
 * decoração**: nenhuma plataforma era alcançável, nenhuma moeda de cima era
 * pegável, e nas três fases de poço largo o piloto automático morria com 0
 * vidas dentro do buraco. A invariante da época aprovava, porque media o
 * alcance do CORPO (que serve a moeda) e nunca o do PÉ (que serve a plataforma).
 */
export const ALTURA_DA_PLATAFORMA = 2
export const ALTURA_DO_PREMIO = 3
export const DEGRAU_MAXIMO = 2
/**
 * Moeda na altura da CABEÇA de quem anda. Uma célula, e não duas: com duas ela
 * cai exatamente na linha do prêmio, e aí a mesma célula tem moeda e tijolo —
 * defeito que a I7 pegou nas primeiras plantas.
 */
export const MOEDA_NO_CHAO = 1
/** Só faz sentido em coluna que TEM plataforma: uma célula acima de quem está nela. */
export const MOEDA_NO_ALTO = 3

/** Quantas linhas de chão maciço cada tipo tem embaixo. */
const ESPESSURA_DO_CHAO: Readonly<Record<ProStageKind, number>> = {
  superficie: 1,
  subterraneo: 2,
  agua: PROFUNDIDADE_DA_AGUA,
  castelo: 2,
}

/** O que fica no FUNDO do poço. É a diferença entre cair e nadar. */
const FUNDO_DO_POCO: Readonly<Record<ProStageKind, string>> = {
  superficie: '.',
  subterraneo: '.',
  agua: '~',
  castelo: '^',
}

/**
 * O tema sai do TIPO e da METADE da jornada — nunca do mundo.
 *
 * ⚠️ São exatamente os oito nomes que `proThemeColors` conhece. Um nome novo
 * aqui cai no `campo` em silêncio, e é por isso que existe drift cruzando as
 * duas listas.
 */
const TEMA: Readonly<Record<ProStageKind, readonly [string, string]>> = {
  superficie: ['campo', 'deserto'],
  subterraneo: ['caverna', 'vulcao'],
  agua: ['agua', 'neve'],
  castelo: ['castelo', 'ceu'],
}

export function proStageTheme(kind: ProStageKind, world: number): string {
  const par = TEMA[kind]
  return world <= 4 ? par[0] : par[1]
}

export function stageId(world: number, order: number): string {
  return `${world}-${order}`
}

/** A grade de ALTURA do chão, coluna a coluna: 0 = poço, 1+ = quantas linhas maciças. */
function alturaDoChao(plan: StagePlan): number[] {
  const base = ESPESSURA_DO_CHAO[plan.kind]
  const alturas = Array.from({ length: plan.largura }, () => base)
  for (const [col, largura] of plan.pocos ?? []) {
    for (let c = col; c < col + largura; c += 1) if (c >= 0 && c < plan.largura) alturas[c] = 0
  }
  for (const [col, largura, altura] of plan.degraus ?? []) {
    for (let c = col; c < col + largura; c += 1) {
      // Degrau NÃO tapa poço: se a planta pediu as duas coisas na mesma coluna,
      // o poço vence e a invariante de alcance cobra a passagem.
      if (c >= 0 && c < plan.largura && (alturas[c] ?? 0) > 0) alturas[c] = base + altura
    }
  }
  return alturas
}

/** A LINHA da primeira célula sólida daquela coluna. Poço devolve o piso do palco. */
export function groundRowAt(alturas: readonly number[], col: number): number {
  const altura = alturas[col] ?? 0
  return altura > 0 ? PRO_STAGE_HEIGHT - altura : PRO_STAGE_HEIGHT
}

/** A coluna com chão mais perto desta — é dela que o herói salta para a móvel. */
export function beiradaMaisProxima(alturas: readonly number[], col: number): number {
  for (let passo = 0; passo < alturas.length; passo += 1) {
    if ((alturas[col - passo] ?? 0) > 0) return col - passo
    if ((alturas[col + passo] ?? 0) > 0) return col + passo
  }
  return col
}

/** Onde um personagem daquela coluna FICA DE PÉ. Nenhum `y` de chão é autorado. */
function linhaDePe(alturas: readonly number[], col: number): number {
  return groundRowAt(alturas, col) - 1
}

export function buildProStage(world: number, order: number, plan: StagePlan): GameKitCampaignStage {
  const largura = plan.largura
  const alturas = alturaDoChao(plan)
  const grade = Array.from({ length: PRO_STAGE_HEIGHT }, () =>
    Array.from({ length: largura }, () => '.'),
  )
  const por = (row: number, col: number, peca: string): void => {
    const linha = grade[row]
    if (linha && col >= 0 && col < largura && row >= 0 && row < PRO_STAGE_HEIGHT) linha[col] = peca
  }
  /** Só escreve em célula VAZIA: é o que impede uma peça de apagar a anterior. */
  const seVazia = (row: number, col: number, peca: string): boolean => {
    if (grade[row]?.[col] !== '.') return false
    por(row, col, peca)
    return true
  }

  // 1) o chão, e o fundo do poço.
  const fundo = FUNDO_DO_POCO[plan.kind]
  for (let col = 0; col < largura; col += 1) {
    const altura = alturas[col] ?? 0
    if (altura === 0) {
      if (fundo === '~') {
        for (let row = PRO_STAGE_HEIGHT - PROFUNDIDADE_DA_AGUA; row < PRO_STAGE_HEIGHT; row += 1) {
          por(row, col, fundo)
        }
      } else if (fundo !== '.') por(PRO_STAGE_HEIGHT - 1, col, fundo)
      continue
    }
    for (let row = PRO_STAGE_HEIGHT - altura; row < PRO_STAGE_HEIGHT; row += 1) por(row, col, '#')
  }

  // 2) plataformas de atravessar por baixo, na altura em que o PÉ chega.
  for (const [col, largura2] of plan.plataformas ?? []) {
    for (let c = col; c < col + largura2; c += 1) {
      seVazia(groundRowAt(alturas, c) - ALTURA_DA_PLATAFORMA, c, '=')
    }
  }

  // 3) prêmios e tijolos, na altura da cabeçada.
  // ⚠️ DEPOIS das plataformas de propósito: com as duas na mesma célula alguém
  // tem que perder, e é melhor perder o PRÊMIO — a I6 conta prêmio e acusa.
  // Plataforma encurtada em silêncio não teria rede nenhuma.
  for (const [col, peca] of plan.premios ?? []) {
    seVazia(groundRowAt(alturas, col) - ALTURA_DO_PREMIO, col, peca)
  }

  // 4) a escada de mão, do chão até o alto.
  if (plan.escada !== undefined) {
    for (let row = groundRowAt(alturas, plan.escada) - 1; row >= 4; row -= 1) {
      seVazia(row, plan.escada, 'H')
    }
  }

  const entities: GameKitCampaignStage['entities'] = [
    { kind: 'hero', id: 'inicio', x: 2, y: linhaDePe(alturas, 2) },
  ]
  const ocupadas = new Set<string>()
  /**
   * Uma entidade por célula. Moeda repetida é descartada em silêncio (é uma que
   * ninguém ia pegar); qualquer OUTRA colisão é erro de planta e LANÇA.
   *
   * ⚠️ O silêncio para todo mundo custou caro na primeira leva: o checkpoint da
   * 1-2 caía na mesma célula de um espinho e sumia — a fase inteira ficava sem
   * ponto de retorno, sem erro nenhum. Dado estático que nasce de uma planta
   * deve gritar na hora de construir, não esperar alguém escrever o teste certo.
   */
  const soltar = (entity: GameKitCampaignStage['entities'][number]): void => {
    const chave = `${entity.x},${entity.y}`
    if (ocupadas.has(chave)) {
      if (entity.kind === 'coin') return
      throw new Error(
        `${stageId(world, order)}: ${entity.kind} "${entity.id}" cai na célula ${chave}, que já está ocupada`,
      )
    }
    ocupadas.add(chave)
    entities.push(entity)
  }

  let moeda = 0
  for (const [col, quantas, altura] of plan.moedas ?? []) {
    for (let c = col; c < col + quantas; c += 1) {
      moeda += 1
      soltar({ kind: 'coin', id: `moeda-${moeda}`, x: c, y: linhaDePe(alturas, c) - altura })
    }
  }

  let bicho = 0
  for (const [col, tipo] of plan.inimigos ?? []) {
    bicho += 1
    // O voador é o único que NÃO pisa: ele vive quatro células acima do chão.
    const y = tipo === 'flyer' ? linhaDePe(alturas, col) - 4 : linhaDePe(alturas, col)
    soltar({
      kind: tipo,
      id: `inimigo-${bicho}`,
      x: col,
      y,
      props: { speed: 24 + world * 3, range: 32 + order * 8 },
    })
  }

  let movel = 0
  for (const [col, alcance] of plan.moveis ?? []) {
    movel += 1
    // ⚠️⚠️ O `y` era a linha FIXA `PRO_STAGE_HEIGHT - 4`, e era isso que punha a
    // móvel fora do alcance: o herói pula da BEIRADA do poço, não do fundo dele.
    // Agora ela sai do chão da beirada mais próxima, na mesma altura de pé que
    // as plataformas fixas.
    soltar({
      kind: 'movingPlatform',
      id: `plataforma-${movel}`,
      x: col,
      y: groundRowAt(alturas, beiradaMaisProxima(alturas, col)) - ALTURA_DA_PLATAFORMA,
      props: { range: alcance * 16, speed: 0.7 + order * 0.12 },
    })
  }

  if (plan.poder !== undefined) {
    soltar({
      kind: 'powerup',
      id: `poder-${world}-${order}`,
      x: plan.poder,
      y: linhaDePe(alturas, plan.poder) - 1,
      variant: 'forte',
    })
  }

  soltar({
    kind: 'checkpoint',
    id: 'meio',
    x: plan.checkpoint,
    y: linhaDePe(alturas, plan.checkpoint),
  })

  if (order === 2) {
    const col = largura - 12
    soltar({ kind: 'secretExit', id: `segredo-${world}`, x: col, y: linhaDePe(alturas, col) })
  }

  if (order === 4) {
    const colDoChefe = largura - 16
    soltar({
      kind: 'boss',
      id: `guardiao-${world}`,
      x: colDoChefe,
      y: linhaDePe(alturas, colDoChefe) - 1,
      props: { health: world === 8 ? 12 : 4 + world, speed: 22 + world * 2 },
    })
    const colDaGema = largura - 9
    soltar({ kind: 'gem', id: `gema-${world}`, x: colDaGema, y: linhaDePe(alturas, colDaGema) - 2 })
  }

  const colDaSaida = largura - 3
  soltar({
    kind: 'exit',
    id: 'saida',
    x: colDaSaida,
    y: linhaDePe(alturas, colDaSaida),
    ...(order === 4 ? { props: { requiresBoss: true } } : {}),
  })

  const proxima =
    world === 8 && order === 4
      ? undefined
      : order < 4
        ? stageId(world, order + 1)
        : stageId(world + 1, 1)

  return {
    schemaVersion: 1,
    id: stageId(world, order),
    world,
    order,
    theme: proStageTheme(plan.kind, world),
    width: largura,
    height: PRO_STAGE_HEIGHT,
    tiles: grade.map((linha) => linha.join('')),
    entities,
    triggers: [
      {
        kind: order === 1 ? 'dica' : 'marco',
        x: 3,
        y: linhaDePe(alturas, 3) - 3,
        w: 5,
        h: 4,
        target: stageId(world, order),
        value: order === 1 ? `Mundo ${world}. ${plan.ideia}` : order,
      },
    ],
    ...(proxima ? { nextStage: proxima } : {}),
    ...(order === 2 ? { secretStage: stageId(world, 4) } : {}),
    timeLimit: Math.max(160, 330 - world * 12 - order * 8),
  }
}

/**
 * As 32 plantas, mundo a mundo. Cada uma tem UMA ideia, e a dificuldade cresce
 * pelo que ela pede — não por um número que sobe.
 */
export const PRO_STAGE_PLANS: ReadonlyArray<ReadonlyArray<StagePlan>> = [
  // ── Mundo 1 — aprender a andar, pular e pisar ────────────────────────────
  [
    {
      kind: 'superficie',
      largura: 64,
      ideia: 'Ande, pule e pise nos bichos. O bloco com "?" guarda coisa boa.',
      pocos: [
        [26, 2],
        [44, 3],
      ],
      degraus: [
        [16, 2, 1],
        [52, 3, 2],
      ],
      plataformas: [[34, 5]],
      premios: [
        [10, '?'],
        [22, 'B'],
        [23, '?'],
        [40, '?'],
      ],
      moedas: [
        [11, 4, MOEDA_NO_CHAO],
        [26, 2, MOEDA_NO_CHAO],
        [34, 5, MOEDA_NO_ALTO],
        [56, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [18, 'walker'],
        [31, 'walker'],
        [48, 'shell'],
      ],
      poder: 8,
      checkpoint: 32,
    },
    {
      kind: 'subterraneo',
      largura: 68,
      ideia: 'Lá embaixo o teto é baixo: use as plataformas e olhe onde pisa.',
      pocos: [[30, 3]],
      degraus: [
        [12, 3, 1],
        [46, 4, 2],
      ],
      plataformas: [
        [20, 5],
        [36, 6],
        [56, 4],
      ],
      premios: [
        [26, '?'],
        [43, 'B'],
        [44, '?'],
      ],
      moedas: [
        [20, 5, MOEDA_NO_ALTO],
        [36, 6, MOEDA_NO_ALTO],
        [56, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [16, 'walker'],
        [34, 'spiky'],
        [52, 'walker'],
        [62, 'shell'],
      ],
      checkpoint: 28,
    },
    {
      kind: 'superficie',
      largura: 72,
      ideia: 'Poços mais largos. Corra antes de pular: correndo você vai mais longe.',
      pocos: [
        [18, 3],
        [32, 4],
        [50, 4],
      ],
      degraus: [
        [26, 3, 1],
        [42, 4, 2],
        [62, 3, 2],
      ],
      plataformas: [[36, 4]],
      premios: [
        [14, '?'],
        [46, '?'],
        [47, 'B'],
      ],
      moedas: [
        [18, 3, MOEDA_NO_CHAO],
        [36, 4, MOEDA_NO_ALTO],
        [50, 4, MOEDA_NO_CHAO],
        [66, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [22, 'walker'],
        [41, 'flyer'],
        [56, 'walker'],
        [68, 'shell'],
      ],
      checkpoint: 40,
    },
    {
      kind: 'castelo',
      largura: 76,
      ideia: 'O castelo do guardião: lava embaixo e um espinho que não se pisa.',
      pocos: [
        [22, 3],
        [40, 3],
        [54, 2],
      ],
      degraus: [
        [14, 3, 1],
        [32, 3, 2],
        [64, 4, 1],
      ],
      plataformas: [
        [26, 5],
        [44, 5],
      ],
      premios: [
        [18, '?'],
        [50, 'B'],
      ],
      moedas: [
        [26, 5, MOEDA_NO_ALTO],
        [44, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [20, 'spiky'],
        [36, 'walker'],
        [51, 'flyer'],
        [58, 'spiky'],
      ],
      poder: 12,
      checkpoint: 38,
    },
  ],
  // ── Mundo 2 — a escada e o caminho de cima ───────────────────────────────
  [
    {
      kind: 'superficie',
      largura: 68,
      ideia: 'Tem um caminho lá em cima. A escada de mão leva você até ele.',
      pocos: [
        [28, 3],
        [48, 3],
      ],
      degraus: [
        [18, 3, 1],
        [58, 3, 2],
      ],
      plataformas: [
        [34, 6],
        [42, 4],
      ],
      premios: [
        [13, '?'],
        [24, 'B'],
        [25, '?'],
      ],
      moedas: [
        [34, 6, MOEDA_NO_ALTO],
        [42, 4, MOEDA_NO_ALTO],
        [63, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [22, 'walker'],
        [41, 'flyer'],
        [54, 'shell'],
      ],
      escada: 47,
      poder: 8,
      checkpoint: 33,
    },
    {
      kind: 'agua',
      largura: 70,
      ideia: 'Na água você nada devagar e cai devagar. Segure para cima para subir.',
      pocos: [
        [20, 4],
        [38, 4],
        [56, 4],
      ],
      degraus: [
        [30, 4, 1],
        [50, 3, 1],
      ],
      plataformas: [
        [24, 4],
        [42, 5],
      ],
      premios: [
        [16, '?'],
        [53, '?'],
      ],
      moedas: [
        [20, 4, MOEDA_NO_CHAO],
        [38, 4, MOEDA_NO_CHAO],
        [56, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [28, 'flyer'],
        [46, 'flyer'],
        [62, 'walker'],
      ],
      checkpoint: 34,
    },
    {
      kind: 'subterraneo',
      largura: 74,
      ideia: 'Caverna com casco: pise para recolher e encoste para chutar.',
      pocos: [[34, 3]],
      degraus: [
        [16, 4, 1],
        [46, 5, 2],
        [64, 3, 1],
      ],
      plataformas: [
        [26, 5],
        [54, 5],
      ],
      premios: [
        [20, 'B'],
        [21, '?'],
        [60, '?'],
      ],
      moedas: [
        [26, 5, MOEDA_NO_ALTO],
        [54, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [24, 'shell'],
        [40, 'shell'],
        [52, 'walker'],
        [68, 'spiky'],
      ],
      checkpoint: 38,
    },
    {
      kind: 'castelo',
      largura: 78,
      ideia: 'Segundo guardião. A estrela deixa você invencível por dez segundos.',
      pocos: [
        [24, 3],
        [42, 4],
        [58, 3],
      ],
      degraus: [
        [16, 3, 2],
        [34, 4, 1],
        [66, 4, 2],
      ],
      plataformas: [
        [28, 5],
        [47, 6],
      ],
      premios: [
        [20, '?'],
        [53, 'B'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [47, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [22, 'spiky'],
        [38, 'walker'],
        [55, 'flyer'],
        [62, 'shell'],
      ],
      poder: 12,
      checkpoint: 40,
    },
  ],
  // ── Mundo 3 — água por toda parte ────────────────────────────────────────
  [
    {
      kind: 'agua',
      largura: 72,
      ideia: 'O mundo da água. Nadar é diferente de pular: teste antes de correr.',
      pocos: [
        [18, 4],
        [34, 4],
        [54, 4],
      ],
      degraus: [
        [28, 4, 1],
        [46, 4, 1],
      ],
      plataformas: [
        [24, 4],
        [40, 5],
        [60, 4],
      ],
      premios: [
        [14, '?'],
        [50, '?'],
      ],
      moedas: [
        [18, 4, MOEDA_NO_CHAO],
        [34, 4, MOEDA_NO_CHAO],
        [60, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [30, 'flyer'],
        [44, 'walker'],
        [66, 'flyer'],
      ],
      poder: 10,
      checkpoint: 32,
    },
    {
      kind: 'superficie',
      largura: 76,
      ideia: 'Ilhas: a plataforma que anda sozinha atravessa o que o pulo não alcança.',
      pocos: [
        [20, 8],
        [40, 9],
        [60, 6],
      ],
      degraus: [
        [32, 4, 1],
        [52, 4, 1],
      ],
      moveis: [
        [24, 3],
        [44, 4],
        [63, 2],
      ],
      premios: [
        [16, '?'],
        [36, 'B'],
        [37, '?'],
      ],
      moedas: [
        [32, 4, MOEDA_NO_CHAO],
        [52, 4, MOEDA_NO_CHAO],
        [70, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [34, 'walker'],
        [53, 'shell'],
        [70, 'walker'],
      ],
      checkpoint: 33,
    },
    {
      kind: 'agua',
      largura: 78,
      ideia: 'Fundo do lago. Os voadores não param nunca, então escolha a hora.',
      pocos: [
        [16, 4],
        [32, 4],
        [52, 4],
        [68, 4],
      ],
      degraus: [
        [26, 4, 1],
        [44, 5, 1],
        [62, 4, 1],
      ],
      plataformas: [
        [20, 4],
        [36, 5],
        [56, 4],
      ],
      premios: [
        [12, '?'],
        [49, '?'],
      ],
      moedas: [
        [20, 4, MOEDA_NO_ALTO],
        [36, 5, MOEDA_NO_ALTO],
        [56, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [28, 'flyer'],
        [42, 'flyer'],
        [60, 'flyer'],
        [74, 'walker'],
      ],
      checkpoint: 44,
    },
    {
      kind: 'castelo',
      largura: 80,
      ideia: 'Guardião das águas. O espinho fica no corredor estreito: desvie.',
      pocos: [
        [26, 4],
        [44, 4],
        [60, 3],
      ],
      degraus: [
        [18, 4, 1],
        [36, 4, 2],
        [68, 4, 1],
      ],
      plataformas: [
        [30, 5],
        [49, 6],
      ],
      premios: [
        [22, 'B'],
        [23, '?'],
        [56, '?'],
      ],
      moedas: [
        [30, 5, MOEDA_NO_ALTO],
        [49, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [24, 'spiky'],
        [40, 'shell'],
        [57, 'flyer'],
        [64, 'spiky'],
      ],
      poder: 14,
      checkpoint: 42,
    },
  ],
  // ── Mundo 4 — a metade da jornada, o deserto começa ──────────────────────
  [
    {
      kind: 'superficie',
      largura: 78,
      ideia: 'Metade do caminho. Agora os bichos vêm em dupla.',
      pocos: [
        [24, 4],
        [44, 4],
        [64, 3],
      ],
      degraus: [
        [16, 4, 1],
        [34, 4, 2],
        [54, 4, 1],
      ],
      plataformas: [[28, 5]],
      premios: [
        [12, '?'],
        [39, 'B'],
        [40, '?'],
        [59, '?'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [48, 5, MOEDA_NO_CHAO],
        [70, 5, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [20, 'walker'],
        [21, 'walker'],
        [50, 'shell'],
        [52, 'walker'],
        [68, 'flyer'],
      ],
      poder: 10,
      checkpoint: 40,
    },
    {
      kind: 'subterraneo',
      largura: 80,
      ideia: 'Caverna funda. Os prêmios de cima pedem plataforma e paciência.',
      pocos: [[36, 4]],
      degraus: [
        [14, 4, 2],
        [50, 5, 2],
        [70, 4, 1],
      ],
      plataformas: [
        [22, 6],
        [42, 5],
        [60, 5],
      ],
      premios: [
        [29, '?'],
        [30, 'B'],
        [47, '?'],
        [66, '?'],
      ],
      moedas: [
        [22, 6, MOEDA_NO_ALTO],
        [42, 5, MOEDA_NO_ALTO],
        [60, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [18, 'spiky'],
        [33, 'walker'],
        [52, 'shell'],
        [66, 'walker'],
        [76, 'spiky'],
      ],
      checkpoint: 42,
    },
    {
      kind: 'agua',
      largura: 82,
      ideia: 'Correnteza: poços largos, plataformas curtas, nada de pressa.',
      pocos: [
        [18, 4],
        [34, 4],
        [52, 4],
        [70, 4],
      ],
      degraus: [
        [28, 4, 1],
        [46, 4, 1],
        [62, 4, 1],
      ],
      plataformas: [
        [22, 4],
        [38, 4],
        [56, 4],
      ],
      premios: [
        [14, '?'],
        [43, 'B'],
        [67, '?'],
      ],
      moedas: [
        [22, 4, MOEDA_NO_ALTO],
        [38, 4, MOEDA_NO_ALTO],
        [56, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [30, 'flyer'],
        [47, 'walker'],
        [64, 'flyer'],
        [78, 'shell'],
      ],
      checkpoint: 46,
    },
    {
      kind: 'castelo',
      largura: 84,
      ideia: 'Quarto guardião, o mais duro da primeira metade. Guarde a estrela.',
      pocos: [
        [24, 4],
        [42, 4],
        [60, 4],
      ],
      degraus: [
        [16, 4, 2],
        [34, 4, 1],
        [70, 5, 2],
      ],
      plataformas: [
        [28, 5],
        [48, 6],
      ],
      premios: [
        [20, '?'],
        [55, 'B'],
        [56, '?'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [48, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [22, 'spiky'],
        [38, 'shell'],
        [57, 'flyer'],
        [66, 'spiky'],
        [67, 'walker'],
      ],
      poder: 12,
      checkpoint: 47,
    },
  ],
  // ── Mundo 5 — o deserto, e o caminho de cima vira regra ──────────────────
  [
    {
      kind: 'superficie',
      largura: 80,
      ideia: 'Areia quente. O caminho de cima é mais rápido e tem mais moeda.',
      pocos: [
        [22, 4],
        [40, 4],
        [62, 4],
      ],
      degraus: [
        [14, 4, 1],
        [32, 4, 2],
        [52, 5, 2],
      ],
      plataformas: [
        [26, 6],
        [46, 5],
        [68, 5],
      ],
      premios: [
        [18, '?'],
        [37, 'B'],
        [38, '?'],
      ],
      moedas: [
        [26, 6, MOEDA_NO_ALTO],
        [46, 5, MOEDA_NO_ALTO],
        [68, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [20, 'walker'],
        [46, 'shell'],
        [58, 'walker'],
        [74, 'flyer'],
      ],
      poder: 12,
      checkpoint: 45,
    },
    {
      kind: 'subterraneo',
      largura: 82,
      ideia: 'Vulcão adormecido. Espinhos em fila: pisar neles não resolve.',
      pocos: [
        [30, 4],
        [58, 4],
      ],
      degraus: [
        [16, 4, 2],
        [44, 5, 2],
        [70, 5, 1],
      ],
      plataformas: [
        [24, 5],
        [50, 5],
      ],
      premios: [
        [21, '?'],
        [56, 'B'],
        [57, '?'],
      ],
      moedas: [
        [24, 5, MOEDA_NO_ALTO],
        [50, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [22, 'spiky'],
        [23, 'spiky'],
        [40, 'walker'],
        [64, 'shell'],
        [78, 'spiky'],
      ],
      escada: 36,
      checkpoint: 44,
    },
    {
      kind: 'agua',
      largura: 84,
      ideia: 'Lago gelado. A água aqui é a mesma: devagar sobe, devagar desce.',
      pocos: [
        [18, 4],
        [36, 4],
        [56, 4],
        [74, 4],
      ],
      degraus: [
        [28, 4, 1],
        [48, 4, 2],
        [66, 4, 1],
      ],
      plataformas: [
        [22, 4],
        [40, 5],
        [60, 4],
      ],
      premios: [
        [14, '?'],
        [45, '?'],
      ],
      moedas: [
        [22, 4, MOEDA_NO_ALTO],
        [40, 5, MOEDA_NO_ALTO],
        [60, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [32, 'flyer'],
        [45, 'flyer'],
        [70, 'walker'],
        [80, 'shell'],
      ],
      checkpoint: 52,
    },
    {
      kind: 'castelo',
      largura: 86,
      ideia: 'Castelo nas nuvens. Cair aqui é cair para valer.',
      pocos: [
        [26, 4],
        [46, 4],
        [64, 4],
      ],
      degraus: [
        [18, 4, 2],
        [36, 4, 2],
        [72, 5, 1],
      ],
      plataformas: [
        [30, 5],
        [52, 6],
      ],
      premios: [
        [22, 'B'],
        [23, '?'],
        [58, '?'],
      ],
      moedas: [
        [30, 5, MOEDA_NO_ALTO],
        [52, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [24, 'spiky'],
        [42, 'shell'],
        [61, 'flyer'],
        [68, 'walker'],
        [78, 'spiky'],
      ],
      poder: 14,
      checkpoint: 51,
    },
  ],
  // ── Mundo 6 — a escada de novo, agora obrigatória ────────────────────────
  [
    {
      kind: 'superficie',
      largura: 82,
      ideia: 'A escada não é atalho: aqui ela é o caminho.',
      pocos: [
        [24, 4],
        [44, 4],
        [66, 4],
      ],
      degraus: [
        [16, 4, 2],
        [34, 5, 2],
        [56, 4, 1],
      ],
      plataformas: [
        [28, 5],
        [50, 5],
        [72, 5],
      ],
      premios: [
        [20, '?'],
        [39, '?'],
        [61, 'B'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [50, 5, MOEDA_NO_ALTO],
        [72, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [22, 'walker'],
        [40, 'shell'],
        [62, 'flyer'],
        [78, 'walker'],
      ],
      escada: 49,
      poder: 12,
      checkpoint: 49,
    },
    {
      kind: 'subterraneo',
      largura: 84,
      ideia: 'Poço fundo. A plataforma que anda sozinha é a única saída.',
      pocos: [
        [22, 9],
        [46, 8],
        [68, 6],
      ],
      degraus: [
        [36, 5, 2],
        [58, 4, 1],
      ],
      moveis: [
        [26, 4],
        [50, 4],
        [71, 3],
      ],
      premios: [
        [18, '?'],
        [40, 'B'],
        [41, '?'],
      ],
      moedas: [
        [36, 5, MOEDA_NO_CHAO],
        [58, 4, MOEDA_NO_CHAO],
        [78, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [38, 'spiky'],
        [56, 'walker'],
        [76, 'shell'],
        [80, 'walker'],
      ],
      checkpoint: 40,
    },
    {
      kind: 'agua',
      largura: 86,
      ideia: 'Nadar com companhia. Os voadores da água vêm de dois lados.',
      pocos: [
        [18, 4],
        [38, 4],
        [60, 4],
        [78, 4],
      ],
      degraus: [
        [30, 4, 1],
        [50, 5, 2],
        [70, 4, 1],
      ],
      plataformas: [
        [22, 4],
        [42, 5],
        [64, 4],
      ],
      premios: [
        [14, '?'],
        [56, '?'],
      ],
      moedas: [
        [22, 4, MOEDA_NO_ALTO],
        [42, 5, MOEDA_NO_ALTO],
        [64, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [32, 'flyer'],
        [48, 'flyer'],
        [72, 'flyer'],
        [84, 'shell'],
      ],
      checkpoint: 54,
    },
    {
      kind: 'castelo',
      largura: 88,
      ideia: 'Sexto guardião. Ele bate mais forte quando está quase caindo.',
      pocos: [
        [26, 4],
        [48, 4],
        [68, 4],
      ],
      degraus: [
        [18, 5, 2],
        [38, 4, 2],
        [76, 5, 2],
      ],
      plataformas: [
        [32, 5],
        [54, 6],
      ],
      premios: [
        [24, '?'],
        [60, 'B'],
        [61, '?'],
      ],
      moedas: [
        [32, 5, MOEDA_NO_ALTO],
        [54, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [24, 'spiky'],
        [44, 'shell'],
        [64, 'flyer'],
        [72, 'spiky'],
        [73, 'walker'],
      ],
      poder: 14,
      checkpoint: 53,
    },
  ],
  // ── Mundo 7 — o vulcão: tudo machuca ─────────────────────────────────────
  [
    {
      kind: 'superficie',
      largura: 84,
      ideia: 'Perto do vulcão. Fique em cima: embaixo é tudo espinho.',
      pocos: [
        [24, 4],
        [46, 4],
        [70, 4],
      ],
      degraus: [
        [16, 4, 2],
        [36, 5, 1],
        [58, 5, 2],
      ],
      plataformas: [
        [28, 6],
        [52, 5],
        [76, 5],
      ],
      premios: [
        [20, '?'],
        [42, 'B'],
        [43, '?'],
        [65, '?'],
      ],
      moedas: [
        [28, 6, MOEDA_NO_ALTO],
        [52, 5, MOEDA_NO_ALTO],
        [76, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [22, 'spiky'],
        [40, 'walker'],
        [56, 'shell'],
        [68, 'spiky'],
        [82, 'flyer'],
      ],
      poder: 12,
      checkpoint: 51,
    },
    {
      kind: 'subterraneo',
      largura: 86,
      ideia: 'Dentro do vulcão. Um erro custa a vida: vá devagar.',
      pocos: [
        [20, 4],
        [42, 4],
        [64, 4],
      ],
      degraus: [
        [14, 4, 2],
        [32, 5, 2],
        [54, 5, 2],
        [74, 5, 1],
      ],
      plataformas: [
        [26, 5],
        [48, 5],
        [70, 4],
      ],
      premios: [
        [18, '?'],
        [39, 'B'],
        [40, '?'],
        [61, '?'],
      ],
      moedas: [
        [26, 5, MOEDA_NO_ALTO],
        [48, 5, MOEDA_NO_ALTO],
        [70, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [25, 'spiky'],
        [37, 'shell'],
        [53, 'spiky'],
        [69, 'walker'],
        [82, 'spiky'],
      ],
      escada: 60,
      checkpoint: 47,
    },
    {
      kind: 'agua',
      largura: 88,
      ideia: 'Água fervendo. Descanse nas ilhas e escolha cada pulo.',
      pocos: [
        [18, 4],
        [40, 4],
        [62, 4],
        [80, 4],
      ],
      degraus: [
        [30, 5, 2],
        [52, 5, 2],
        [72, 5, 1],
      ],
      plataformas: [
        [22, 4],
        [44, 5],
        [66, 4],
      ],
      premios: [
        [14, '?'],
        [57, '?'],
      ],
      moedas: [
        [22, 4, MOEDA_NO_ALTO],
        [44, 5, MOEDA_NO_ALTO],
        [66, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [34, 'flyer'],
        [50, 'flyer'],
        [76, 'walker'],
        [86, 'shell'],
      ],
      checkpoint: 55,
    },
    {
      kind: 'castelo',
      largura: 90,
      ideia: 'Sétimo guardião. A gema está atrás dele, e ela é obrigatória.',
      pocos: [
        [28, 4],
        [50, 4],
        [70, 4],
      ],
      degraus: [
        [18, 5, 2],
        [40, 5, 2],
        [78, 5, 2],
      ],
      plataformas: [
        [34, 5],
        [56, 6],
      ],
      premios: [
        [24, 'B'],
        [25, '?'],
        [63, '?'],
      ],
      moedas: [
        [34, 5, MOEDA_NO_ALTO],
        [56, 6, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [26, 'spiky'],
        [46, 'shell'],
        [65, 'flyer'],
        [74, 'spiky'],
        [75, 'walker'],
      ],
      poder: 14,
      checkpoint: 55,
    },
  ],
  // ── Mundo 8 — tudo o que a criança aprendeu, de uma vez ──────────────────
  [
    {
      kind: 'superficie',
      largura: 88,
      ideia: 'O último mundo. Tudo o que você aprendeu vem junto agora.',
      pocos: [
        [22, 4],
        [44, 4],
        [68, 4],
      ],
      degraus: [
        [16, 4, 2],
        [34, 5, 2],
        [56, 5, 1],
        [78, 5, 2],
      ],
      plataformas: [
        [28, 5],
        [50, 5],
        [72, 4],
      ],
      premios: [
        [20, '?'],
        [40, 'B'],
        [41, '?'],
        [63, '?'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [50, 5, MOEDA_NO_ALTO],
        [84, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [26, 'walker'],
        [39, 'shell'],
        [57, 'spiky'],
        [66, 'flyer'],
        [83, 'walker'],
      ],
      poder: 12,
      checkpoint: 49,
    },
    {
      kind: 'subterraneo',
      largura: 90,
      ideia: 'A última caverna. Casco recolhido também é arma: use com cuidado.',
      pocos: [
        [24, 4],
        [48, 4],
        [72, 4],
      ],
      degraus: [
        [14, 5, 2],
        [36, 5, 2],
        [60, 5, 2],
        [80, 5, 1],
      ],
      plataformas: [
        [28, 5],
        [52, 5],
        [76, 4],
      ],
      premios: [
        [21, '?'],
        [43, 'B'],
        [44, '?'],
        [67, '?'],
      ],
      moedas: [
        [28, 5, MOEDA_NO_ALTO],
        [52, 5, MOEDA_NO_ALTO],
        [76, 4, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [29, 'shell'],
        [41, 'shell'],
        [58, 'spiky'],
        [70, 'walker'],
        [86, 'shell'],
      ],
      escada: 64,
      checkpoint: 53,
    },
    {
      kind: 'agua',
      largura: 92,
      ideia: 'O mar do fim. Poços largos, plataformas que andam, respire fundo.',
      pocos: [
        [18, 9],
        [42, 10],
        [66, 9],
        [84, 4],
      ],
      degraus: [
        [32, 5, 2],
        [56, 5, 2],
        [78, 4, 1],
      ],
      moveis: [
        [22, 4],
        [47, 5],
        [70, 4],
      ],
      premios: [
        [14, '?'],
        [61, '?'],
      ],
      moedas: [
        [32, 5, MOEDA_NO_CHAO],
        [56, 5, MOEDA_NO_CHAO],
        [78, 4, MOEDA_NO_CHAO],
      ],
      inimigos: [
        [36, 'flyer'],
        [54, 'flyer'],
        [80, 'walker'],
        [90, 'shell'],
      ],
      checkpoint: 58,
    },
    {
      kind: 'castelo',
      largura: 96,
      ideia: 'O último guardião, com doze de vida. Boa sorte.',
      pocos: [
        [26, 4],
        [48, 4],
        [70, 4],
      ],
      degraus: [
        [18, 5, 2],
        [38, 5, 2],
        [60, 5, 2],
        [84, 5, 2],
      ],
      plataformas: [
        [32, 5],
        [54, 5],
        [76, 5],
      ],
      premios: [
        [23, 'B'],
        [24, '?'],
        [45, '?'],
        [67, '?'],
      ],
      moedas: [
        [32, 5, MOEDA_NO_ALTO],
        [54, 5, MOEDA_NO_ALTO],
        [76, 5, MOEDA_NO_ALTO],
      ],
      inimigos: [
        [30, 'spiky'],
        [43, 'shell'],
        [59, 'flyer'],
        [65, 'spiky'],
        [81, 'walker'],
      ],
      poder: 14,
      checkpoint: 57,
    },
  ],
]

export const reinoZeroProStages: GameKitCampaignStage[] = PRO_STAGE_PLANS.flatMap(
  (mundo, indiceDoMundo) =>
    mundo.map((plan, indiceDaEtapa) => buildProStage(indiceDoMundo + 1, indiceDaEtapa + 1, plan)),
)
