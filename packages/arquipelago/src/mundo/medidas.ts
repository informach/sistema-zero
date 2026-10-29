import { type Ilha, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { CONTORNO_DO_MERGULHO, MERGULHO } from '../sistemas/mergulho'

/**
 * As medidas do mundo (1 unidade = 1 célula do quarto, mais ou menos 1 metro). Tudo o que é
 * forma de terreno sai daqui: o desenho, a colisão e os testes usam as mesmas funções.
 */
export const NIVEL_DA_AGUA = 0
/**
 * A física anda em passos fixos deste tamanho (s), com o desenho suavizado entre um passo e outro
 * (`<Physics timeStep interpolate>`): o mesmo comportamento a 30, 60 ou 144 quadros por segundo.
 * O movimento do personagem e do bicho é calculado em cada passo (`useBeforePhysicsStep`).
 */
export const PASSO_DA_FISICA = 1 / 60
/** A gravidade do jogo (m/s², para baixo): mais forte que a de verdade, para o pulo ser ágil. */
export const GRAVIDADE = 24
export const ALTURA_DA_TERRA = 1
export const FUNDO_DO_MAR = -3.5

export const RAIO_DO_GRAMADO = 24
export const RAIO_DA_PRAIA = 29
export const RAIO_DO_RASO = 36

/** O quarto da plataforma (12 × 8) é o primeiro cômodo da casa. Centro do quarto no mundo: */
export const CENTRO_DA_CASA = { x: 0, z: -4 } as const
export const QUARTO = { largura: 12, fundo: 8, altura: 4 } as const
/** A porta nova fica na parede da frente do quarto (a que a plataforma não desenha). */
export const PORTA = { x: 2.5, largura: 2.2, altura: 3 } as const

export const HORTA = { x: 10.5, z: 1, colunas: 3, linhas: 2, passo: 1.7 } as const
export const BANCADA = { x: 10, z: -7 } as const
export const FAROL = { x: -12, z: -13 } as const
export const PIER = { x: -5, z: 27, comprimento: 10 } as const

export const RAIO_DO_ANEL = 82
export const RAIO_DA_ILHA_DO_ANEL = 13
/** Boca da caverna (21,3), aproximação por fora (2) e folga do corpo, sem criar chão no mar. */
export const RAIO_VISITAVEL_DO_RECIFE = 24
/** col-terreno do Vale chega a 15,614 m; 16 inclui a borda e o raio de 0,35 m do corpo. */
export const RAIO_VISITAVEL_DO_VALE = 16
/**
 * A caverna de cristal do Pico (fase3-07, `arte/ilhas-b/pico.py`): atrás da montanha, no −x do
 * modelo, com a boca a 14,2 m do meio e o fundo do morro a 28,5 m, por cima do mar. Dentro desta
 * abertura (para cada lado do −x) a espera pelo chão vai até `raio`.
 */
export const CAVERNA_DO_PICO = {
  meiaAbertura: (25 * Math.PI) / 180,
  raio: 28,
  fundo: 28.5,
} as const

/** O ponto (x, z) do modelo do Pico fica na direção da caverna? */
export function naDirecaoDaCavernaDoPico(x: number, z: number): boolean {
  return x < 0 && Math.abs(Math.atan2(z, -x)) < CAVERNA_DO_PICO.meiaAbertura
}

/** Até onde esperar os colisores ao abrir o jogo, incluindo a caverna fora da ilha leve. */
export function raioDaEsperaDaIlha(ilha: Ilha, x: number, z: number): number {
  if (ilha.id === 'vale-dos-dinos') return RAIO_VISITAVEL_DO_VALE
  if (ilha.id === 'pico' && naDirecaoDaCavernaDoPico(x, z)) return CAVERNA_DO_PICO.raio
  return ilha.id === 'recife' ? RAIO_VISITAVEL_DO_RECIFE : raioDoChaoDaIlha(ilha, x, z)
}

/**
 * O Bosque cresce para o lado de fora (o -x do modelo, longe da chegada da ponte): a ponta de campo
 * onde fica o lote da cabana. Os mesmos números de `LOBO_DO_BOSQUE` em `arte/mundo/ilhas_anel.py`:
 * o ângulo é o do chão do Blender (x do modelo, -z do modelo), e lá o raio vai a `1 + quanto` vezes.
 */
export const LOBO_DO_BOSQUE = { angulo: Math.PI, quanto: 0.55, meiaAbertura: (70 * Math.PI) / 180 }
/** A semente do contorno do Bosque (`SEMENTE` de `arte/ilhas/bosque.py`). */
const SEMENTE_DO_BOSQUE = 1.0 * 1.7 * 2

/** Quanto o raio do contorno vale no ângulo `a` (o `fator_do_contorno` de `ilhas_anel.py`). */
export function fatorDoContorno(
  a: number,
  semente: number,
  amp: readonly [number, number],
  lobo: typeof LOBO_DO_BOSQUE | null,
): number {
  let k = 1 + amp[0] * Math.sin(3 * a + semente) + amp[1] * Math.sin(5 * a + semente * 2)
  if (lobo) {
    const d = Math.atan2(Math.sin(a - lobo.angulo), Math.cos(a - lobo.angulo))
    if (Math.abs(d) < lobo.meiaAbertura)
      k *= 1 + lobo.quanto * Math.cos(((d / lobo.meiaAbertura) * Math.PI) / 2) ** 2
  }
  return k
}

/**
 * Até onde vai o chão de uma ilha do anel, a contar do centro, no rumo de (x, z) do modelo: o
 * barranco (`ilhas_anel.base`, raio + 1,4), a última coisa que se pisa antes do mar.
 */
export function raioDoChaoDaIlha(ilha: Ilha, x: number, z: number): number {
  if (ilha.id !== 'bosque') return RAIO_DA_ILHA_DO_ANEL + 1.4
  const a = Math.atan2(-z, x)
  return (
    (RAIO_DA_ILHA_DO_ANEL + 1.4) *
    fatorDoContorno(a, SEMENTE_DO_BOSQUE + 0.4, [0.06, 0.03], LOBO_DO_BOSQUE)
  )
}

/**
 * Um deslocamento do mundo (a partir do centro da ilha) levado para o referencial do modelo: o
 * contrário do giro de `paraOMundo` (`mundo/bosque.ts`).
 */
export function noModelo(dx: number, dz: number, giro: number): { x: number; z: number } {
  const c = Math.cos(giro)
  const s = Math.sin(giro)
  return { x: dx * c - dz * s, z: dx * s + dz * c }
}

const raiosMaximos = new Map<string, number>()

/** O maior raio do chão de uma ilha do anel (o Bosque, no meio da ponta de campo). */
export function raioMaximoDaIlha(ilha: Ilha): number {
  const guardado = raiosMaximos.get(ilha.id)
  if (guardado !== undefined) return guardado
  let maior = 0
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180
    maior = Math.max(maior, raioDoChaoDaIlha(ilha, Math.cos(a), -Math.sin(a)))
  }
  raiosMaximos.set(ilha.id, maior)
  return maior
}

/**
 * O chão de antes da versão leve (enquanto a completa não chega): cilindros no referencial do
 * modelo, com o topo no tampo. Todas as ilhas têm o do meio; o Bosque, mais um na ponta de campo,
 * para quem abre o jogo lá não cair na água antes do chão de verdade.
 */
export function apoiosDaIlhaLeve(ilha: Ilha): readonly { x: number; z: number; raio: number }[] {
  const meio = { x: 0, z: 0, raio: RAIO_DA_ILHA_DO_ANEL - 0.5 }
  if (ilha.id !== 'bosque') return [meio]
  return [meio, { x: Math.cos(LOBO_DO_BOSQUE.angulo) * 15.5, z: 0, raio: 5 }]
}

/**
 * Todas as rodas de nado de uma ilha do anel, no referencial do modelo: a da ilha
 * (`rodaDaIlhaNoModelo`) e, no Recife, uma em volta do navio e outra em volta do labirinto
 * (fase3-02), que saem da água, com a mesma folga de mar. Cada uma encosta na da ilha, então dá
 * para nadar de uma à outra. Uma roda só, grande o bastante para os dois, encostava na roda da sua
 * ilha e abria o mar até o centro sem ponte.
 */
export function rodasDaIlhaNoModelo(
  ilha: Ilha,
  boias: number,
): { x: number; z: number; livre: number }[] {
  const roda = rodaDaIlhaNoModelo(ilha, boias)
  if (ilha.id !== 'recife') return [roda]
  const folga = boias - (RAIO_DA_ILHA_DO_ANEL + 1.4)
  return [
    roda,
    ...(['navio', 'labirinto'] as const).map((nome) => ({
      x: MERGULHO[nome].x + CONTORNO_DO_MERGULHO[nome].x,
      z: MERGULHO[nome].z + CONTORNO_DO_MERGULHO[nome].z,
      livre: CONTORNO_DO_MERGULHO[nome].raio + folga,
    })),
  ]
}

/**
 * A roda de boias de uma ilha do anel, no referencial do modelo: o meio e o raio. Nas ilhas
 * redondas, no centro com `BOIAS_DA_ILHA_DO_ANEL`; no Bosque o meio vai para o lado da ponta de
 * campo, e o raio deixa a mesma folga de mar até as boias em volta da ilha inteira.
 */
export function rodaDaIlhaNoModelo(
  ilha: Ilha,
  boias: number,
): { x: number; z: number; livre: number } {
  if (ilha.id === 'recife') {
    const folga = boias - (RAIO_DA_ILHA_DO_ANEL + 1.4)
    return { x: 0, z: 0, livre: RAIO_VISITAVEL_DO_RECIFE + folga }
  }
  if (ilha.id === 'pico') {
    // O meio vai para o lado da caverna: a roda cobre a ilha e o morro dela com a mesma folga.
    const folga = boias - (RAIO_DA_ILHA_DO_ANEL + 1.4)
    const borda = RAIO_DA_ILHA_DO_ANEL + 1.4
    return {
      x: -(CAVERNA_DO_PICO.fundo - borda) / 2,
      z: 0,
      livre: (CAVERNA_DO_PICO.fundo + borda) / 2 + folga,
    }
  }
  if (ilha.id !== 'bosque') return { x: 0, z: 0, livre: boias }
  const folga = boias - (RAIO_DA_ILHA_DO_ANEL + 1.4)
  const lado = Math.cos(LOBO_DO_BOSQUE.angulo)
  const recuo = (raioMaximoDaIlha(ilha) - (RAIO_DA_ILHA_DO_ANEL + 1.4)) / 2
  const meio = { x: lado * recuo, z: 0 }
  let livre = 0
  for (let i = 0; i < 360; i++) {
    const a = (i * Math.PI) / 180
    const x = Math.cos(a)
    const z = -Math.sin(a)
    const r = raioDoChaoDaIlha(ilha, x, z)
    livre = Math.max(livre, Math.hypot(x * r - meio.x, z * r - meio.z) + folga)
  }
  return { ...meio, livre }
}

/** A névoa começa e fecha nestas distâncias da câmera: depois do fim tudo tem a cor do céu. */
export const NEVOA = { comeco: 70, fim: 210 } as const
/** As estrelas ficam numa casca deste raio em volta do centro da ilha central. */
export const RAIO_DAS_ESTRELAS = 320

/**
 * Os planos de corte da câmera. A precisão do teste de profundidade vem quase toda do `near`: com
 * 24 bits, duas faces a uma distância z só ficam separadas se estiverem a mais de ~z² / (near ·
 * 2²⁴) uma da outra. Subir de 0,1 para 0,25 dá 2,5 vezes mais folga contra o pisca-pisca de faces
 * quase coplanares (a 60 m, de ~2 mm para ~0,9 mm). O canto do plano de corte fica a ~0,4 da
 * câmera, dentro da bolinha de `RAIO_DA_SONDA_DA_CAMERA` que já a mantém longe do que é sólido,
 * então ela não corta parede nem tronco. O `far` quase não mexe na precisão; ele só precisa
 * alcançar as estrelas vistas da ilha mais longe (e a câmera a até ~20 do personagem). Além do fim
 * da névoa o mar já tem a cor do céu, então cortar ali não muda nada na tela.
 * `logarithmicDepthBuffer` ficou de fora: custa caro no celular e não precisamos dele.
 */
export const PERTO_DA_CAMERA = 0.25
export const LONGE_DA_CAMERA = 450

/** Onde a pessoa aparece quando entra no jogo pela primeira vez: no quarto. */
export const INICIO = { x: 0, z: -2.2 } as const

function suave(a: number, b: number, t: number): number {
  const x = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

function irregularidade(angulo: number): number {
  return 1 + 0.06 * Math.sin(angulo * 3 + 1) + 0.04 * Math.sin(angulo * 7 + 2)
}

/** Distância "efetiva" do centro: a borda da ilha não é um círculo perfeito. */
function raioEfetivo(x: number, z: number): number {
  return Math.hypot(x, z) / irregularidade(Math.atan2(z, x))
}

/** Perto da casa, da horta e da bancada o chão é plano (dá para construir e andar sem tropeço). */
function pesoDoPlano(x: number, z: number): number {
  const casa = Math.max(Math.abs(x - CENTRO_DA_CASA.x) - 9, Math.abs(z - CENTRO_DA_CASA.z) - 8, 0)
  const horta = Math.hypot(x - HORTA.x, z - HORTA.z) - 5
  const bancada = Math.hypot(x - BANCADA.x, z - BANCADA.z) - 3
  const d = Math.min(casa, Math.max(horta, 0), Math.max(bancada, 0))
  return 1 - suave(0, 4, d)
}

/** Altura do chão da sua ilha em (x, z). */
export function alturaDaIlha(x: number, z: number): number {
  const r = raioEfetivo(x, z)
  if (r < RAIO_DO_GRAMADO) {
    const ondulado = ALTURA_DA_TERRA + 0.35 * Math.sin(x * 0.23) * Math.cos(z * 0.19)
    const p = pesoDoPlano(x, z)
    const alto = ondulado * (1 - p) + ALTURA_DA_TERRA * p
    return alto + (ALTURA_DA_TERRA * 0.15 - 0.15) * suave(RAIO_DO_GRAMADO - 3, RAIO_DO_GRAMADO, r)
  }
  if (r < RAIO_DA_PRAIA) {
    return ALTURA_DA_TERRA + (0.25 - ALTURA_DA_TERRA) * suave(RAIO_DO_GRAMADO, RAIO_DA_PRAIA, r)
  }
  if (r < RAIO_DO_RASO) return 0.25 + (FUNDO_DO_MAR - 0.25) * suave(RAIO_DA_PRAIA, RAIO_DO_RASO, r)
  return FUNDO_DO_MAR
}

export type TipoDeChao = 'grama' | 'areia' | 'areia-molhada'

export function chaoEm(x: number, z: number): TipoDeChao {
  const r = raioEfetivo(x, z)
  if (r < RAIO_DO_GRAMADO - 0.5) return 'grama'
  return alturaDaIlha(x, z) < 0.05 ? 'areia-molhada' : 'areia'
}

/** O giro que vira a chegada da ponte (+x do modelo) para a ilha central. */
export function giroDaIlha(ilha: Ilha): number {
  return Math.PI - ((ilha.angulo ?? 0) * Math.PI) / 180
}

/** Centro de uma ilha do anel no mundo. */
export function centroNoAnel(ilha: Ilha): { x: number; z: number } {
  const a = ((ilha.angulo ?? 0) * Math.PI) / 180
  return { x: Math.cos(a) * RAIO_DO_ANEL, z: Math.sin(a) * RAIO_DO_ANEL }
}

export function ilhasEmVolta(): { ilha: Ilha; centro: { x: number; z: number } }[] {
  return ilhasDoAnel().map((ilha) => ({ ilha, centro: centroNoAnel(ilha) }))
}

export interface PontoDaPonte {
  x: number
  y: number
  z: number
}

/** A ponte sai da praia da sua ilha e chega na borda da ilha do anel, num arco suave. */
/** Quanto da ponte fechada já existe (o pedaço do lado da sua ilha, com a placa no fim). */
export const TRECHO_QUEBRADO = 0.25

/**
 * Quanto da ponte está montado: fechada, o trecho quebrado; abrindo, ela cresce do fim do trecho
 * quebrado até a ilha conforme a `chegada` (0 a 1), sem sumir o que já estava lá. As tábuas e o
 * chão que segura o corpo seguem a mesma conta, então quem está em cima não cai no meio da montagem.
 */
export function fracaoMontada(inteira: boolean, chegada: number): number {
  if (!inteira) return TRECHO_QUEBRADO
  const c = Math.min(1, Math.max(0, chegada))
  return TRECHO_QUEBRADO + (1 - TRECHO_QUEBRADO) * c
}

export function trajetoDaPonte(ilha: Ilha, pedacos = 24): PontoDaPonte[] {
  const a = ((ilha.angulo ?? 0) * Math.PI) / 180
  const dx = Math.cos(a)
  const dz = Math.sin(a)
  const inicio = RAIO_DA_PRAIA - 2.5
  const fim = RAIO_DO_ANEL - RAIO_DA_ILHA_DO_ANEL + 1
  const y0 = alturaDaIlha(dx * inicio, dz * inicio) + 0.12
  const y1 = ALTURA_DA_TERRA + 0.12
  return Array.from({ length: pedacos + 1 }, (_, i) => {
    const t = i / pedacos
    const r = inicio + (fim - inicio) * t
    return { x: dx * r, y: y0 + (y1 - y0) * t + 1.6 * Math.sin(Math.PI * t), z: dz * r }
  })
}

/** Qual versão de uma ilha mostrar pela distância (a base do carregar por partes). */
export type NivelDeDetalhe = 'silhueta' | 'media' | 'completa'

export function nivelDeDetalhe(distancia: number, naPonte: boolean): NivelDeDetalhe {
  if (distancia < RAIO_DA_ILHA_DO_ANEL + 4) return 'completa'
  if (naPonte || distancia < RAIO_DA_ILHA_DO_ANEL + 30) return 'media'
  return 'silhueta'
}

/** A posição está dentro do quarto (para tirar o telhado e abrir a vista)? */
export function dentroDaCasa(x: number, z: number): boolean {
  return (
    Math.abs(x - CENTRO_DA_CASA.x) < QUARTO.largura / 2 &&
    Math.abs(z - CENTRO_DA_CASA.z) < QUARTO.fundo / 2
  )
}

/**
 * A faixa que conta como "na ponte" para buscar a ilha completa: um pouco mais larga que a ponte e
 * começando antes dela (na praia da sua ilha), para o arquivo já estar lido quando a pessoa chegar.
 */
export const BUSCA_NA_PONTE = {
  meiaLargura: 3,
  antesDaPonte: 4,
  depoisDaPonte: 2,
} as const

/**
 * A completa toma o lugar da leve no meio da ponte (a 17 da borda da ilha): de longe a troca
 * esmaecida mal se nota e o arquivo teve a primeira metade da ponte para ser lido.
 */
export const DISTANCIA_DA_TROCA = RAIO_DA_ILHA_DO_ANEL + 17
/** Segundos do esmaecer entre a leve e a completa (curto, mas sem estalo). */
export const DURACAO_DA_TROCA = 0.8
/** Até onde, além da borda da ilha, o personagem espera no ar o chão da completa chegar. */
export const MARGEM_DA_ESPERA_PELO_CHAO = 1
/**
 * Raio das bordas arredondadas dos colisores das ilhas completas: o personagem escorrega pela
 * quina de um degrau ou deque em vez de enganchar nela.
 */
export const BORDA_DOS_COLISORES = 0.03

/**
 * Copa, tronco ou telhado que fica entre a câmera e o personagem esmaece (transparência suave) até
 * esta opacidade e volta quando sai da frente, no tempo de `DURACAO_DO_ESMAECER_DA_COPA` segundos.
 */
export const OPACIDADE_DA_COPA_NA_FRENTE = 0.25
export const DURACAO_DO_ESMAECER_DA_COPA = 0.3

/**
 * A câmera nunca atravessa o que é sólido: um raio do personagem até ela para `FOLGA_DA_CAMERA`
 * antes da parede (o plano de corte não entra nela). Ela encosta na hora e só se afasta de novo
 * aos poucos (`VOLTA_DA_CAMERA`, por segundo), sem tranco.
 */
export const FOLGA_DA_CAMERA = 0.35
/**
 * O raio da bolinha que a câmera lança até ela: mais grossa que um raio, cobre a meia largura do
 * avatar e a casca do tronco, que é mais grossa que o colisor dele.
 */
export const RAIO_DA_SONDA_DA_CAMERA = 0.45
/** Mais perto que isto a câmera entraria na cabeça do avatar. */
export const DISTANCIA_MINIMA_DA_CAMERA = 0.4
export const VOLTA_DA_CAMERA = 3

/**
 * O que a pessoa controla na câmera (como no The Sims): arrastar gira em volta do avatar e sobe ou
 * desce o ângulo; a roda, a pinça de dois dedos e as teclas + e - aproximam e afastam, com
 * suavidade; dois cliques (ou dois toques), a tecla C ou o clique no analógico direito põem a câmera
 * de volta nas costas do avatar; o analógico direito do controle físico gira e inclina.
 */
export const CONTROLE_DA_CAMERA = {
  /** Radianos por pixel arrastado (de lado gira; para cima e para baixo muda o ângulo). */
  giroPorPixel: 0.006,
  inclinacaoPorPixel: 0.004,
  /** Radianos por segundo com o analógico direito do controle físico todo empurrado. */
  giroDoAnalogico: 2.6,
  inclinacaoDoAnalogico: 1.4,
  /** Do quase rente ao chão (7°) até quase de cima (72°). */
  inclinacaoMinima: 0.12,
  inclinacaoMaxima: 1.25,
  /** A inclinação de quando a câmera volta para as costas. */
  inclinacaoDeVolta: 0.5,
  distanciaMinima: 4,
  distanciaMaxima: 18,
  /** Metros por pixel de roda e por toque nas teclas + e -. */
  rodaPorPixel: 0.01,
  passoDaTecla: 1.5,
  /** O zoom chega ao pedido com esta rapidez (por segundo): sem tranco. */
  suavizarZoom: 10,
  /** A volta para as costas, por segundo. */
  voltaParaAsCostas: 6,
  /** Dois toques/cliques valem como "voltar" se vierem neste tempo e quase no mesmo lugar. */
  doisToquesMs: 320,
  doisToquesPixels: 24,
  /** A dica do Zappy sobre a câmera aparece depois deste tempo, uma vez, se ninguém mexeu nela. */
  dicaDepoisDeMs: 9000,
} as const

/**
 * Quando o raio bate perto (menos de `tapada` da distância), a câmera gira para o lado livre e, sem
 * lado livre, sobe estes ângulos (por cima do ombro), ficando com o que der mais espaço se ganhar
 * pelo menos `ganhoMinimo`.
 */
export const GRUA_DA_CAMERA = {
  tapada: 0.6,
  /** Giros para o lado que a câmera testa primeiro, e quanto livre basta para ir por ali. */
  giros: [0.5, 1.0],
  basta: 0.9,
  giroPorSegundo: 1.5,
  subidas: [0.45, 0.9],
  inclinacaoMaxima: 1.25,
  ganhoMinimo: 0.5,
} as const

/**
 * Lá no alto (deques e pontes), a câmera desce o ângulo e chega mais perto: mostra o caminho à
 * frente por baixo das copas em vez de olhar de cima através delas.
 */
export const CAMERA_NO_ALTO = {
  /** Quanto acima do tampo da ilha o personagem precisa estar. */
  acimaDoChao: 2.5,
  inclinacaoMaxima: 0.3,
  distanciaMaxima: 6.5,
} as const

/** A posição está em cima da ponte desta ilha (do fim da praia até a borda da ilha do anel)? */
export function naPonteDa(ilha: Ilha, x: number, z: number): boolean {
  const a = ((ilha.angulo ?? 0) * Math.PI) / 180
  const ao = x * Math.cos(a) + z * Math.sin(a)
  const deLado = Math.abs(-x * Math.sin(a) + z * Math.cos(a))
  return (
    deLado < BUSCA_NA_PONTE.meiaLargura &&
    ao > RAIO_DA_PRAIA - BUSCA_NA_PONTE.antesDaPonte &&
    ao < RAIO_DO_ANEL - RAIO_DA_ILHA_DO_ANEL + BUSCA_NA_PONTE.depoisDaPonte
  )
}
