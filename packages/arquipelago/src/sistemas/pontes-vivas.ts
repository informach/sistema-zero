/** Ponte controlada: a carga cede a superfície, a mola devolve sem lançar quem passa. */
export const PONTE_VIVA = {
  afundar: 0.1,
  balancar: 0.025,
  mola: 32,
  amortecer: 9,
  velocidade: 0.3,
} as const
export interface EstadoDaPonte {
  y: number
  vy: number
  lado: number
  vl: number
}
export function criarPonte(): EstadoDaPonte {
  return { y: 0, vy: 0, lado: 0, vl: 0 }
}
export function passoDaPonte(p: EstadoDaPonte, carga: number, lateral: number, dt: number): void {
  const h = Math.min(Math.max(dt, 0), 1 / 60)
  const alvo = -PONTE_VIVA.afundar * Math.max(0, Math.min(1, carga))
  p.vy += ((alvo - p.y) * PONTE_VIVA.mola - p.vy * PONTE_VIVA.amortecer) * h
  p.vl +=
    ((Math.max(-1, Math.min(1, lateral)) * PONTE_VIVA.balancar * carga - p.lado) * PONTE_VIVA.mola -
      p.vl * PONTE_VIVA.amortecer) *
    h
  p.vy = Math.max(-PONTE_VIVA.velocidade, Math.min(PONTE_VIVA.velocidade, p.vy))
  p.y = Math.max(-PONTE_VIVA.afundar, Math.min(0.015, p.y + p.vy * h))
  p.lado = Math.max(-PONTE_VIVA.balancar, Math.min(PONTE_VIVA.balancar, p.lado + p.vl * h))
}
/** Pontas fixas e derivada nula: não abre degrau ao chegar ao deque. */
export function pesoNaPonte(t: number): number {
  return t <= 0 || t >= 1 ? 0 : Math.sin(Math.PI * t) ** 2
}
