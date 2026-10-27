import { type Ilha, ilhasDoAnel } from '@sistemazero/arquipelago-contracts'

/**
 * As medidas do mundo (1 unidade = 1 célula do quarto, mais ou menos 1 metro). Tudo o que é
 * forma de terreno sai daqui: o desenho, a colisão e os testes usam as mesmas funções.
 */
export const NIVEL_DA_AGUA = 0
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
