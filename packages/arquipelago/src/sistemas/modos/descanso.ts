import type { LugarDeDescanso } from '../../estado/contexto'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento } from './tipos'
import { mudarModo } from './trocas'

/**
 * Sentado no banco ou deitado na cama (fase2-13, `sistemas/descanso.ts`). O corpo do Rapier vai
 * até o lugar de ficar de pé (`lugar.corpo`, fora do móvel, pelo controlador do chão: o que estiver
 * no caminho segura) e fica; o desenho vai para o assento ou o colchão (`personagem.tsx`). Andar,
 * pular ou usar levanta, depois de um instante (o mesmo E que sentou não levanta na hora).
 */
export const DESCANSO = {
  /** Quanto o corpo leva para chegar ao lugar de ficar (s). */
  encaixe: 0.35,
  /** Antes disto (s) nada levanta: o toque que sentou ainda está acontecendo. */
  levantaDepois: 0.5,
  /** O quanto o direcional precisa ser empurrado para levantar. */
  pedidoParaLevantar: 0.3,
} as const

export function sentarOuDeitar(
  c: EstadoDoCorpo,
  lugar: LugarDeDescanso,
  de: { x: number; y: number; z: number },
  agora: number,
  aviso: AvisoDeModo,
): void {
  c.inicio.x = de.x
  c.inicio.y = de.y
  c.inicio.z = de.z
  c.descanso = lugar
  c.direcao = lugar.giro
  c.velY = 0
  c.embalo.x = c.embalo.y = c.embalo.z = 0
  mudarModo(c, 'descanso', agora, aviso)
}

export function levantar(c: EstadoDoCorpo, agora: number, aviso: AvisoDeModo): void {
  mudarModo(c, 'chao', agora, aviso)
}

export const MODO_DESCANSO: ModoDeMovimento = {
  id: 'descanso',
  valendo: (c) => c.descanso !== null,
  passo(c, e) {
    const l = c.descanso
    c.vel.x = c.vel.z = 0
    c.velPedida = 0
    if (!l) return 'chao'
    c.direcao = l.giro
    // Vai até o lugar de ficar em `encaixe` segundos; depois só se mantém nele, colado no chão.
    const t = Math.min(1, c.noModo / DESCANSO.encaixe)
    const alvoX = c.inicio.x + (l.corpo.x - c.inicio.x) * t
    const alvoZ = c.inicio.z + (l.corpo.z - c.inicio.z) * t
    c.desloc.x = alvoX - e.p.x
    c.desloc.y = -0.05
    c.desloc.z = alvoZ - e.p.z
    return 'chao'
  },
  depois(c, e, _mundo, mov, pisou, aviso) {
    c.noChao = pisou
    if (mov) {
      c.prox.x = e.p.x + mov.x
      c.prox.y = e.p.y + mov.y
      c.prox.z = e.p.z + mov.z
    }
    c.velY = 0
    if (c.noModo < DESCANSO.levantaDepois || e.parado) return false
    const andou = Math.hypot(e.ix, e.iz) > DESCANSO.pedidoParaLevantar
    if (andou || e.pulou || e.usou) {
      levantar(c, e.agora, aviso)
      return e.usou
    }
    return false
  },
}
