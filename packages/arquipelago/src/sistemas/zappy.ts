/**
 * Como o Zappy acompanha o personagem: onde voa, para onde olha e quanto inclina nas curvas.
 *
 * Convenção de giro (a mesma do avatar e do modelo, que nasce virado para +z): giro `d` olha para
 * `(sin d, cos d)` no chão. A direita de quem olha para `d` fica em `(-cos d, sin d)`.
 */

/** Distância para a direita do personagem (no ombro, sem ficar na frente do rosto). */
export const LADO_DO_ZAPPY = 0.75
/** Um pouco para trás, para a câmera de trás ver os dois e o rosto dela ficar livre. */
export const ATRAS_DO_ZAPPY = 0.35
/** Altura acima do centro do corpo (perto do ombro). */
export const ALTURA_DO_ZAPPY = 1.3
/** Abaixo disso (m/s) o personagem conta como parado. */
export const VELOCIDADE_DE_ANDAR = 0.3
/** Tempo parado (s) antes de o Zappy deixar de olhar o caminho e virar para ela. */
export const ESPERA_PARA_OLHAR_PARA_ELA = 0.6
/** Parado, ele espia a câmera de vez em quando: a primeira vez, de quanto em quanto e por quanto. */
export const PRIMEIRA_ESPIADA = 3.5
export const PERIODO_DA_ESPIADA = 7
export const DURACAO_DA_ESPIADA = 1.4
/** Quão rápido (1/s) o lugar dele em volta dela acompanha uma virada: dá a volta, não atravessa. */
export const RAPIDEZ_EM_VOLTA = 3.5
/** Inclinação nas curvas: radianos por radiano/segundo de giro, com teto. */
export const GANHO_DA_INCLINACAO = 0.16
export const INCLINACAO_MAXIMA = 0.5
/** Inclinação para a frente quando ela anda (no máximo, correndo). */
export const MERGULHO_MAXIMO = 0.22

export interface Ponto2 {
  x: number
  z: number
}

/** A menor diferença de `de` para `para`, entre -π e π. */
export function diferencaDeAngulo(de: number, para: number): number {
  const d = (((para - de + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
  return d - Math.PI
}

/** Aproxima um ângulo de outro pelo caminho mais curto, com suavização exponencial. */
export function suavizarAngulo(atual: number, alvo: number, rapidez: number, dt: number): number {
  return atual + diferencaDeAngulo(atual, alvo) * (1 - Math.exp(-rapidez * dt))
}

/** O lugar do Zappy em volta de quem está em `centro` olhando para `giro`: à direita e atrás. */
export function lugarAoLado(centro: Ponto2, giro: number): Ponto2 {
  const fx = Math.sin(giro)
  const fz = Math.cos(giro)
  return {
    x: centro.x - Math.cos(giro) * LADO_DO_ZAPPY - fx * ATRAS_DO_ZAPPY,
    z: centro.z + Math.sin(giro) * LADO_DO_ZAPPY - fz * ATRAS_DO_ZAPPY,
  }
}

/** O giro de quem está em `de` para olhar `para`. */
export function giroPara(de: Ponto2, para: Ponto2): number {
  return Math.atan2(para.x - de.x, para.z - de.z)
}

export type Olhar = 'caminho' | 'ela' | 'camera'

/**
 * Para onde o Zappy olha: andando, para onde ela vai; parada, para ela, com uma espiada na
 * câmera de tempos em tempos.
 */
export function paraOndeOlhar(velocidade: number, tempoParado: number): Olhar {
  if (velocidade > VELOCIDADE_DE_ANDAR || tempoParado < ESPERA_PARA_OLHAR_PARA_ELA) return 'caminho'
  const desde = tempoParado - PRIMEIRA_ESPIADA
  if (desde >= 0 && desde % PERIODO_DA_ESPIADA < DURACAO_DA_ESPIADA) return 'camera'
  return 'ela'
}

/** Quanto inclinar (rotação em z do modelo) virando a `velocidadeAngular` rad/s: para dentro. */
export function inclinacaoNaCurva(velocidadeAngular: number): number {
  const r = -velocidadeAngular * GANHO_DA_INCLINACAO
  return Math.max(-INCLINACAO_MAXIMA, Math.min(INCLINACAO_MAXIMA, r))
}

/** Quanto mergulhar para a frente, de 0 (parada) até o máximo na `velocidadeMaxima`. */
export function mergulho(velocidade: number, velocidadeMaxima: number): number {
  if (velocidadeMaxima <= 0) return 0
  return Math.min(1, Math.max(0, velocidade / velocidadeMaxima)) * MERGULHO_MAXIMO
}
