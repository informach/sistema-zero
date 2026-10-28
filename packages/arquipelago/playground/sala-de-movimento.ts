import { GRAVIDADE } from '../src/mundo/medidas'
import {
  alcanceDoPulo,
  alcanceMaximoDoPulo,
  alturaDoPulo,
  beiradaMaximaDoPulo,
  CORPO,
} from '../src/sistemas/corpo'
import { RITMO } from '../src/sistemas/necessidades'

/**
 * A sala de testes do movimento (controlador universal, parte 4): o chão plano com um obstáculo de
 * cada tipo, medido pelos números do corpo (`sistemas/corpo.ts`). Cada estação tem um que passa e
 * um que não passa, então mudar um número do corpo mexe na sala junto e o teste
 * (`tests/sala-de-movimento.test.ts`) confere que a divisa continua no meio.
 *
 * Coordenadas da sala: o meio do chão em (0, 0, 0), o chão em y = 0, frente em +z. Ela fica longe
 * da casa e acima do mar (`ALTURA_DA_SALA`), então o personagem só nada no laguinho.
 */

export const ALTURA_DA_SALA = 2
/** O meio da sala no mundo, longe da casa (o jogo acha que está dentro dela perto da origem). */
export const MEIO_DA_SALA = { x: 60, z: 0 } as const
export const METADE_DA_SALA = 24

export interface Bloco {
  centro: readonly [number, number, number]
  /** Meias medidas da caixa. */
  meio: readonly [number, number, number]
  giro?: readonly [number, number, number]
  cor: string
  /** Chão quadriculado (1 m por quadrado), para ver a velocidade e a distância. */
  quadriculado?: boolean
  /** Só desenho (as faixas da pista, a copa da árvore). */
  semColisao?: boolean
}

const arredondar = (m: number) => Math.round(m * 10) / 10

/** Uma caixa de canto a canto (x0..x1, y0..y1, z0..z1). */
function caixa(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  cor: string,
  extra: Partial<Bloco> = {},
): Bloco {
  return {
    centro: [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
    meio: [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2],
    cor,
    ...extra,
  }
}

const ESPESSURA_DA_RAMPA = 0.3

/** Rampa que sobe para +z a partir de (x, 0, z0): a face de cima começa rente ao chão. */
function rampaQueSobe(x: number, z0: number, graus: number, comprimento: number, largura: number) {
  const a = (graus * Math.PI) / 180
  const t = ESPESSURA_DA_RAMPA
  const bloco: Bloco = {
    centro: [
      x,
      (comprimento / 2) * Math.sin(a) - (t / 2) * Math.cos(a),
      z0 + (comprimento / 2) * Math.cos(a) + (t / 2) * Math.sin(a),
    ],
    meio: [largura / 2, t / 2, comprimento / 2],
    giro: [-a, 0, 0],
    cor: '#f2b880',
  }
  return { bloco, fimZ: z0 + comprimento * Math.cos(a), altura: comprimento * Math.sin(a) }
}

/** Rampa que desce para +x a partir de (x0, 0, z), até `fundo` abaixo do chão. */
function rampaQueDesce(x0: number, z: number, corrida: number, fundo: number, largura: number) {
  const b = Math.atan2(fundo, corrida)
  const comprimento = Math.hypot(corrida, fundo)
  const t = ESPESSURA_DA_RAMPA
  return {
    centro: [
      x0 - (t / 2) * Math.sin(b) + (comprimento / 2) * Math.cos(b),
      -(t / 2) * Math.cos(b) - (comprimento / 2) * Math.sin(b),
      z,
    ],
    meio: [comprimento / 2, t / 2, largura / 2],
    giro: [0, 0, -b],
    cor: '#d9c9a3',
  } satisfies Bloco
}

/**
 * Degraus soltos: três que o corpo sobe sozinho e um acima do degrau automático. De frente, ele
 * sobe uns 2 cm a menos que `CORPO.degrau` (medido aqui: 0,42 sobe, 0,44 não), por isso o último
 * que sobe fica 5 cm abaixo.
 */
export const DEGRAUS = [
  0.2,
  0.35,
  arredondar(CORPO.degrau - 0.05),
  arredondar(CORPO.degrau + 0.05),
] as const
/** Rampas: uma suave, uma perto do limite e uma acima dele (não sobe nem escorrega). */
export const RAMPAS = [25, CORPO.sobeAte - 10, CORPO.sobeAte + 3] as const
/**
 * Beiradas: uma que o pulo alcança sozinho, uma que só alcança porque o degrau automático também
 * vale no ar (medido aqui: 2,0 m sobe, 2,2 m não) e uma alta demais. Esse empurrão no ar é uma
 * ajuda escondida; o modo "agarrar a borda" vai trocá-lo por uma ajuda à vista
 * (`docs/specs/2026-10-28-arquipelago-modos-de-movimento.md`).
 */
export const BEIRADAS = [
  arredondar(alturaDoPulo(GRAVIDADE) * 0.8),
  arredondar(beiradaMaximaDoPulo(GRAVIDADE) - 0.05),
  arredondar(beiradaMaximaDoPulo(GRAVIDADE) + 0.4),
] as const
/** A velocidade mais rápida de cada jeito (com o humor ótimo, `RITMO`). */
const ANDANDO = CORPO.andar * RITMO.otimo
const CORRENDO = CORPO.correr * RITMO.otimo
/**
 * Vãos entre plataformas: um que se pula andando, um que só se pula correndo (mais largo que o
 * máximo andando, com as ajudas, e mais curto que o pulo correndo sem elas) e um que nem correndo
 * dá (mais largo que o máximo correndo).
 */
export const VAOS = [
  arredondar(alcanceDoPulo(CORPO.andar, GRAVIDADE) * 0.75),
  arredondar(
    (alcanceMaximoDoPulo(ANDANDO, GRAVIDADE) + alcanceDoPulo(CORPO.correr, GRAVIDADE)) / 2,
  ),
  arredondar(alcanceMaximoDoPulo(CORRENDO, GRAVIDADE) + 0.5),
] as const
export const ALTURA_DAS_PLATAFORMAS = 1.5

/**
 * O tronco caído (modo de equilíbrio): estreito (o tampo bem menor que 0,5 m) e baixo, para subir
 * pela ponta andando. O eixo vai de `a` a `b` no meio do tampo.
 */
export const TRONCO_CAIDO = { x: 6.5, z0: -3, z1: 2.5, altura: 0.36, largura: 0.3 } as const
export const EIXO_DO_TRONCO_CAIDO = {
  id: 'tronco-caido-da-sala',
  a: { x: TRONCO_CAIDO.x, y: TRONCO_CAIDO.altura, z: TRONCO_CAIDO.z0 },
  b: { x: TRONCO_CAIDO.x, y: TRONCO_CAIDO.altura, z: TRONCO_CAIDO.z1 },
} as const

/** O laguinho: buraco no chão com a água a 15 cm da borda e uma rampa de entrada a oeste. */
export const LAGUINHO = { x0: 9, x1: 21, z0: 6, z1: 16, fundo: 1.2, agua: -0.15 } as const

/** Uma placa com a medida, em cima do obstáculo. */
export interface Rotulo {
  texto: string
  x: number
  y: number
  z: number
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })

export interface Estacao {
  nome: string
  x: number
  z: number
  /** Onde nascer (em cima do chão da sala). */
  y: number
  /** Para onde a câmera olha ao chegar (giro do `rastro`: π olha para +z). */
  giro: number
}

function montar() {
  const blocos: Bloco[] = []
  const rotulos: Rotulo[] = []
  const M = METADE_DA_SALA
  const L = LAGUINHO
  const PISO = '#dfe6d3'
  const fundoDoPiso = -3
  // Chão em quatro pedaços em volta do laguinho.
  const piso = { quadriculado: true }
  blocos.push(caixa(-M, L.x0, fundoDoPiso, 0, -M, M, PISO, piso))
  blocos.push(caixa(L.x1, M, fundoDoPiso, 0, -M, M, PISO, piso))
  blocos.push(caixa(L.x0, L.x1, fundoDoPiso, 0, -M, L.z0, PISO, piso))
  blocos.push(caixa(L.x0, L.x1, fundoDoPiso, 0, L.z1, M, PISO, piso))
  blocos.push(caixa(L.x0, L.x1, fundoDoPiso, -L.fundo, L.z0, L.z1, '#b9a77f'))
  blocos.push(rampaQueDesce(L.x0, (L.z0 + L.z1) / 2, 4.5, L.fundo, 4))

  // Paredes em volta (também servem para a câmera encostar).
  const PAREDE = '#c3cbe0'
  blocos.push(caixa(-M - 0.5, M + 0.5, 0, 3, -M - 0.5, -M, PAREDE))
  blocos.push(caixa(-M - 0.5, M + 0.5, 0, 3, M, M + 0.5, PAREDE))
  blocos.push(caixa(-M - 0.5, -M, 0, 3, -M, M, PAREDE))
  blocos.push(caixa(M, M + 0.5, 0, 3, -M, M, PAREDE))

  // 1. Pista: faixas a cada 2 m, para ver andar, correr e parar.
  rotulos.push({ texto: 'Pista: faixa a cada 2 m', x: -20, y: 0.6, z: -22 })
  for (let z = -20; z <= 20; z += 2) {
    blocos.push(
      caixa(-22, -18, 0, 0.01, z - 0.05, z + 0.05, z % 10 === 0 ? '#e0524a' : '#ffffff', {
        semColisao: true,
      }),
    )
  }

  // 2. Degraus soltos.
  DEGRAUS.forEach((h, i) => {
    const x = -13 + i * 3.2
    blocos.push(caixa(x - 1, x + 1, 0, h, -16, -14, '#8fb7e8'))
    rotulos.push({ texto: `${fmt(h)} m`, x, y: h + 0.5, z: -15 })
  })

  // 3. Rampas, cada uma com um patamar em cima.
  RAMPAS.forEach((graus, i) => {
    const x = -12 + i * 4
    const r = rampaQueSobe(x, -8, graus, 4.5, 3)
    blocos.push(r.bloco)
    blocos.push(caixa(x - 1.5, x + 1.5, 0, r.altura, r.fimZ, r.fimZ + 2, '#f2b880'))
    rotulos.push({ texto: `${graus}°`, x, y: 1, z: -8.5 })
  })

  // 4. Beiradas para o pulo alcançar (ou não).
  BEIRADAS.forEach((h, i) => {
    const x = -12 + i * 5
    blocos.push(caixa(x - 1.5, x + 1.5, 0, h, 8, 11, '#b9a3e3'))
    rotulos.push({ texto: `${fmt(h)} m`, x, y: h + 0.5, z: 8 })
  })

  // 5. Escada até as plataformas e os vãos.
  const PLATAFORMA = '#9ad3a8'
  const passos = 8
  for (let i = 0; i < passos; i++) {
    const h = (ALTURA_DAS_PLATAFORMAS * (i + 1)) / passos
    blocos.push(caixa(0, 3, 0, h, -20 + i * 0.5, -19.5 + i * 0.5, PLATAFORMA))
  }
  let z = -16
  blocos.push(caixa(0, 3, 0, ALTURA_DAS_PLATAFORMAS, z, z + 4, PLATAFORMA))
  rotulos.push({
    texto: `Vãos: ${VAOS.map(fmt).join(' · ')} m`,
    x: 1.5,
    y: ALTURA_DAS_PLATAFORMAS + 0.8,
    z: -14,
  })
  z += 4
  for (const [i, vao] of VAOS.entries()) {
    z += vao
    const fundo = i === VAOS.length - 1 ? 3 : 2
    blocos.push(caixa(0, 3, 0, ALTURA_DAS_PLATAFORMAS, z, z + fundo, PLATAFORMA))
    z += fundo
  }

  // 6. O tronco caído, para o equilíbrio.
  const T = TRONCO_CAIDO
  blocos.push(caixa(T.x - T.largura / 2, T.x + T.largura / 2, 0, T.altura, T.z0, T.z1, '#a07a52'))
  rotulos.push({ texto: 'Tronco caído', x: T.x, y: T.altura + 0.6, z: T.z0 })

  // 7. Câmera: parede solta, árvore e corredor estreito.
  blocos.push(caixa(8, 16, 0, 4, -12.2, -11.8, PAREDE))
  blocos.push(caixa(11.6, 12.4, 0, 5, -4.4, -3.6, '#8a6a4a'))
  blocos.push(caixa(9.6, 14.4, 4.2, 7.4, -6.4, -1.6, '#6fae5a', { semColisao: true }))
  blocos.push(caixa(18, 18.4, 0, 3, -20, -8, PAREDE))
  blocos.push(caixa(20.8, 21.2, 0, 3, -20, -8, PAREDE))
  rotulos.push({ texto: 'Câmera: parede, árvore, corredor', x: 12, y: 4.6, z: -12 })
  rotulos.push({ texto: 'Laguinho', x: 15, y: 0.6, z: (L.z0 + L.z1) / 2 })
  return { blocos, rotulos, fimDasPlataformas: z }
}

const SALA = montar()
export const BLOCOS: readonly Bloco[] = SALA.blocos
export const ROTULOS: readonly Rotulo[] = SALA.rotulos
export const FIM_DAS_PLATAFORMAS = SALA.fimDasPlataformas

export const ESTACOES: readonly Estacao[] = [
  { nome: 'Pista', x: -20, z: -20, y: 0, giro: Math.PI },
  { nome: 'Degraus', x: -8, z: -19, y: 0, giro: Math.PI },
  { nome: 'Rampas', x: -8, z: -11, y: 0, giro: Math.PI },
  { nome: 'Beiradas', x: -10, z: 4, y: 0, giro: Math.PI },
  { nome: 'Plataformas', x: 1.5, z: -22, y: 0, giro: Math.PI },
  { nome: 'Tronco caído', x: 6.5, z: -4.6, y: 0, giro: Math.PI },
  { nome: 'Câmera', x: 12, z: -16, y: 0, giro: Math.PI },
  { nome: 'Laguinho', x: 5, z: 11, y: 0, giro: -Math.PI / 2 },
]

/** Do referencial da sala para o mundo. */
export function naSala(x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x: MEIO_DA_SALA.x + x, y: ALTURA_DA_SALA + y, z: MEIO_DA_SALA.z + z }
}
