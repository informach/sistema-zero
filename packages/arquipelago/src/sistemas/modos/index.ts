import type { ModoDoCorpo, Movimento } from '../../estado/contexto'
import type { Ponto } from '../cipo'
import { MODO_CHAO } from './chao'
import { MODO_CIPO, pegarCipo } from './cipo'
import { MODO_EQUILIBRIO } from './equilibrio'
import { MODO_ESCADA } from './escada'
import { agarrarTronco, MODO_ESCALADA } from './escalada'
import { MODO_ESCORREGAR } from './escorregar'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento, MundoDoMovimento } from './tipos'

export { MODO_CHAO } from './chao'
export { MODO_CIPO } from './cipo'
export { MODO_EQUILIBRIO } from './equilibrio'
export { MODO_ESCADA } from './escada'
export { MODO_ESCALADA } from './escalada'
export { MODO_ESCORREGAR } from './escorregar'
export * from './tipos'
export { mudarModo } from './trocas'

/** Os modos do corpo. Ilha nova com modo novo (escada, borda, escorregar) entra aqui. */
export const MODOS: Readonly<Record<ModoDoCorpo, ModoDeMovimento>> = {
  chao: MODO_CHAO,
  cipo: MODO_CIPO,
  escalada: MODO_ESCALADA,
  equilibrio: MODO_EQUILIBRIO,
  escada: MODO_ESCADA,
  escorregar: MODO_ESCORREGAR,
}

/**
 * O pedido de um interativo ("Pegar o cipó", "Escalar o tronco"), atendido no passo seguinte e só
 * no chão: entra no modo do objeto pedido, parado (sem embalo).
 */
export function atenderPedido(
  c: EstadoDoCorpo,
  pedido: NonNullable<Movimento['pedido']>,
  mundo: MundoDoMovimento,
  de: Ponto,
  agora: number,
  aviso: AvisoDeModo,
): void {
  if (c.modo !== 'chao') return
  if (pedido.tipo === 'cipo') {
    for (const cipo of mundo.cipos) {
      if (cipo.id === pedido.id && !cipo.seguro)
        pegarCipo(c, cipo, de, 0, 0, 0, agora, mundo, aviso)
    }
  } else {
    for (const t of mundo.troncos) {
      if (t.id === pedido.id) agarrarTronco(c, t, de, agora, aviso)
    }
  }
}
