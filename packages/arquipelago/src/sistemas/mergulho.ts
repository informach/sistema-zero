import type { Ponto } from './cipo'

/** Metros e segundos. A água não cobra fôlego nem muda a cápsula. */
export const MERGULHO = {
  horizontal: 2.6,
  carregar: 55,
  ativar: 51,
  focoDaCamera: 0.15,
  sondaAbaixo: 0.25,
  vertical: 1.4,
  raio: 48,
  corrente: 1.2,
  faixaDaCorrente: 3,
  alcance: 1.5,
  navio: { x: 18, y: 0, z: -30 },
  labirinto: { x: -1, y: 0, z: 27 },
} as const

/** Sensor registrado apenas depois de todos os colisores estarem prontos. */
export interface VolumeDeMergulho {
  id: string
  x: number
  z: number
  raio: number
  superficie: number
  fundo: number
  entrada: Ponto
  ativo: boolean
}

export function contemMergulho(v: VolumeDeMergulho, p: Ponto): boolean {
  return (
    v.ativo &&
    p.y >= v.fundo &&
    p.y <= v.superficie + 1 &&
    Math.hypot(p.x - v.x, p.z - v.z) < v.raio + 1
  )
}

export function podeMergulhar(v: VolumeDeMergulho, p: Ponto): boolean {
  return (
    contemMergulho(v, p) && Math.hypot(p.x - v.entrada.x, p.z - v.entrada.z) <= MERGULHO.alcance
  )
}

/** Corrente na borda interna. Saída reutilizada, sem alocação por passo. */
export function correnteDoMergulho(
  v: VolumeDeMergulho,
  p: Ponto,
  saida: { x: number; z: number },
): void {
  const dx = v.x - p.x,
    dz = v.z - p.z
  const d = Math.hypot(dx, dz)
  const t = Math.max(
    0,
    Math.min(1, (d - v.raio + MERGULHO.faixaDaCorrente) / MERGULHO.faixaDaCorrente),
  )
  const forca = t * t * (3 - 2 * t) * MERGULHO.corrente
  saida.x = d > 0 && forca > 0 ? (dx / d) * forca : 0
  saida.z = d > 0 && forca > 0 ? (dz / d) * forca : 0
}

/** Visão próxima em passagens estreitas. A folga evita piscar na mesma distância. */
export function mostrarAvatarNoMergulho(distancia: number, estavaVisivel: boolean): boolean {
  return distancia >= (estavaVisivel ? 1.4 : 1.65)
}
