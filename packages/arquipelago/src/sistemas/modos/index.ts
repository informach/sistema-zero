import type { ModoDoCorpo, Movimento } from '../../estado/contexto'
import { BARCO } from '../barco'
import type { Ponto } from '../cipo'
import { podeMergulhar } from '../mergulho'
import { podeDescerDeTreno } from '../treno'
import { MODO_BARCO } from './barco'
import { MODO_BORDA } from './borda'
import { MODO_CHAO } from './chao'
import { MODO_CIPO, pegarCipo } from './cipo'
import { levantar, MODO_DESCANSO, sentarOuDeitar } from './descanso'
import { MODO_EQUILIBRIO } from './equilibrio'
import { MODO_ESCADA } from './escada'
import { agarrarTronco, MODO_ESCALADA } from './escalada'
import { entrarNoEscorregador, MODO_ESCORREGAR } from './escorregar'
import { MODO_MERGULHO } from './mergulho'
import { MODO_PLANAR } from './planar'
import type { AvisoDeModo, EstadoDoCorpo, ModoDeMovimento, MundoDoMovimento } from './tipos'
import { mudarModo } from './trocas'

export { MODO_BORDA } from './borda'
export { MODO_CHAO } from './chao'
export { MODO_CIPO } from './cipo'
export { MODO_DESCANSO } from './descanso'
export { MODO_EQUILIBRIO } from './equilibrio'
export { MODO_ESCADA } from './escada'
export { MODO_ESCALADA } from './escalada'
export { MODO_ESCORREGAR } from './escorregar'
export { MODO_PLANAR } from './planar'
export * from './tipos'
export { mudarModo } from './trocas'

/** Os modos do corpo. Ilha nova com modo novo (escada, borda, escorregar) entra aqui. */
export const MODOS: Readonly<Record<ModoDoCorpo, ModoDeMovimento>> = {
  barco: MODO_BARCO,
  mergulho: MODO_MERGULHO,
  chao: MODO_CHAO,
  cipo: MODO_CIPO,
  escalada: MODO_ESCALADA,
  equilibrio: MODO_EQUILIBRIO,
  escada: MODO_ESCADA,
  escorregar: MODO_ESCORREGAR,
  borda: MODO_BORDA,
  descanso: MODO_DESCANSO,
  planar: MODO_PLANAR,
}

/**
 * O pedido de um interativo ("Pegar o cipó", "Escalar o tronco", "Sentar no banco", "Deitar na
 * cama", "Descer de trenó"), atendido no passo seguinte e só no chão: entra no modo do objeto
 * pedido, parado (sem embalo). "Levantar" (a soneca acabou) só vale descansando.
 */
export function atenderPedido(
  c: EstadoDoCorpo,
  pedido: NonNullable<Movimento['pedido']>,
  mundo: MundoDoMovimento,
  de: Ponto,
  agora: number,
  aviso: AvisoDeModo,
): void {
  if (pedido.tipo === 'mergulho') {
    if (
      c.modo === 'chao' &&
      mundo.mergulhos?.includes(pedido.volume) &&
      podeMergulhar(pedido.volume, de)
    ) {
      mudarModo(c, 'mergulho', agora, aviso)
      c.mergulho = pedido.volume
      c.embalo.x = c.embalo.y = c.embalo.z = c.velY = 0
    }
    return
  }
  if (pedido.tipo === 'levantar') {
    if (c.modo === 'descanso') levantar(c, agora, aviso)
    return
  }
  if (pedido.tipo === 'barco') {
    const v = pedido.viagem
    // Um teleporte ou uma mudança de modo entre o E e o passo cancela o pedido antigo.
    if (
      c.modo !== 'chao' ||
      c.nadando ||
      !c.noChao ||
      v.fase !== 'embarque' ||
      Math.hypot(de.x - v.inicio.x, de.z - v.inicio.z) > BARCO.alcance
    ) {
      v.fase = 'atracado'
      return
    }
    c.barco = pedido.viagem
    c.embalo.x = c.embalo.y = c.embalo.z = 0
    mudarModo(c, 'barco', agora, aviso)
    return
  }
  if (c.modo !== 'chao') return
  if (pedido.tipo === 'descanso') {
    if (!c.nadando) sentarOuDeitar(c, pedido.lugar, de, agora, aviso)
    return
  }
  if (pedido.tipo === 'escorregar') {
    // O trenó: senta do começo da pista, parado, se ainda está perto dele.
    const pista = pedido.escorregador
    if (!c.nadando && mundo.escorregadores.includes(pista) && podeDescerDeTreno(pista, de)) {
      c.prox.x = de.x
      c.prox.y = de.y
      c.prox.z = de.z
      c.velDoPasso.x = c.velDoPasso.z = 0
      entrarNoEscorregador(c, pista, 0, 0, agora, aviso)
    }
    return
  }
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
