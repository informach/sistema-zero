import type { Salvamento } from '@sistemazero/arquipelago-contracts'
import { todosOsNinhosCuidados } from './vale'

/**
 * A montaria do Vale (fase4-04): o parassaurolofo de sela (`dino-montaria.glb`) espera perto do
 * vulcão e, depois que a criança cuidou dos três ninhos, deixa ela subir. Montada, anda e pula pelo
 * Vale com o passo dele; descer é o mesmo E / Usar. Nada vai para o salvamento: o lugar onde ele
 * fica volta ao começo quando a ilha monta de novo.
 */
export const MONTARIA = {
  /** A escala do desenho: o modelo tem 2,35 m de altura e 4,3 de comprimento; assim, 2 e 3,65. */
  escala: 0.85,
  /** A sela (o vazio `sela` do GLB, a 1,512 na escala 1), acima do chão. */
  sela: 1.512 * 0.85,
  /** Velocidades do passo e da corrida (m/s), com peso para começar e parar. */
  velocidade: 3.6,
  correndo: 6,
  aceleracao: 7,
  freio: 9,
  /** A velocidade de subida do pulo (m/s): um pouco mais que a da criança (`CORPO.pulo`, 8,5). */
  pulo: 9,
  /**
   * O colisor de quem vai montado (a criança mais o dino), uma cápsula de pé com o pé no mesmo
   * lugar que o da criança. O raio cobre a largura do corpo dele (1,17 m nesta escala); a cabeça e a
   * cauda passam das bordas (a cápsula não gira com ele).
   */
  raio: 0.6,
  meiaAltura: 0.35,
  /** De onde se monta (como os moradores) e a folga para o colisor dele voltar depois de descer. */
  alcance: 2.2,
  folgaParaVoltar: 0.4,
  /**
   * O pulinho de descer (m/s): para o lado esquerdo dele e para cima. No ar 1/3 de segundo, a
   * criança cai a uns 1,1 m do meio do dino, fora do corpo dele (meia largura 0,59 mais o raio dela).
   */
  descida: { lado: 3.2, subida: 4 },
  /**
   * Montada, o desenho da criança sobe até a sela no clipe "Sentar" (a bacia dele fica a 0,53 da
   * origem, o assento do banco, e 18 cm atrás dela, `BANCO.baciaAtras`).
   */
  subidaDoDesenho: 1.512 * 0.85 - 0.53,
} as const

/**
 * Onde o dino espera no Vale, no referencial do `vale-dos-dinos.glb`: chão plano e largo entre o
 * vulcão e a chegada (o teste confere o corpo inteiro dele livre), olhando para quem vem da ponte.
 */
export const MONTARIA_NO_VALE = { x: 8, z: 1.2, giro: Math.PI / 2 } as const

export const FALAS_DA_MONTARIA = {
  antes: 'O dino ainda não conhece você. Cuide dos três ninhos do Vale e ele vai confiar.',
  subiu: 'Você subiu na sela. Use o mesmo botão para descer.',
  agua: 'O dino não entra na água. Ele prefere a terra do Vale.',
  limite: 'O dino não sai do Vale. Ele gosta daqui.',
} as const

/** Onde o passo montado parou: na beira da água, no limite do Vale, ou em nada. */
export type BeiraDaMontaria = 'agua' | 'limite' | null

/** O Vale em que o dino anda: até `RAIO_DA_MONTARIA` do meio da ilha (a ponte começa a 11,5). */
export const RAIO_DA_MONTARIA = 10.8

export function foraDoLimite(dino: MontariaViva, x: number, z: number): boolean {
  return Math.hypot(x - dino.limite.x, z - dino.limite.z) > dino.limite.raio
}

/** Pode montar? Com os três ninhos cuidados o dino confia na criança. */
export function podeMontar(s: Salvamento): boolean {
  return todosOsNinhosCuidados(s)
}

/** Onde o dino espera, e para onde olha. Montado, `montada` liga e o desenho segue a criança. */
export interface MontariaViva {
  x: number
  y: number
  z: number
  giro: number
  montada: boolean
  /** Até onde ele anda: o meio da ilha no mundo e o raio. */
  limite: { x: number; z: number; raio: number }
}

/**
 * A distância (do centro de quem desceu ao do dino parado) para o colisor do dino parado voltar:
 * descer deixa a criança em cima do lugar dele, e ela precisa sair antes de ele segurar o corpo.
 */
export function longeParaVoltar(raioDaCrianca: number): number {
  return MONTARIA.raio + raioDaCrianca + MONTARIA.folgaParaVoltar
}
