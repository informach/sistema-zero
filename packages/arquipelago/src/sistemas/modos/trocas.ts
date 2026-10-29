import type { ModoDoCorpo } from '../../estado/contexto'
import { soltarCorda } from '../cordas'
import type { AvisoDeModo, EstadoDoCorpo } from './tipos'

/**
 * Sai do modo atual e entra em `modo`. Soltar o cipó solta a corda (e marca a hora, para não pegar
 * de novo na hora); soltar o tronco marca a hora também. A velocidade no chão recomeça do zero: o
 * que o modo deixa para o próximo vai no `embalo` e no `velY`.
 */
export function mudarModo(
  c: EstadoDoCorpo,
  modo: ModoDoCorpo,
  agora: number,
  aviso: AvisoDeModo,
): void {
  c.vel.x = 0
  c.vel.z = 0
  if (c.cipo && modo !== 'cipo') {
    c.cipo.seguro = false
    soltarCorda(c.cipo)
    c.cipo.soltoEm = agora
    c.cipo = null
  }
  if (c.tronco && modo !== 'escalada') {
    c.soltouDoTronco = agora
    c.tronco = null
  }
  if (c.escada && modo !== 'escada') {
    c.escada = null
    c.saindoDaEscada = 0
  }
  c.contraAEscada = 0
  if (c.escorregador && modo !== 'escorregar') c.escorregador = null
  if (c.borda && modo !== 'borda') {
    c.borda = null
    c.subindoNaBorda = 0
    c.soltouDaBorda = agora
  }
  if (c.eixo && modo !== 'equilibrio') {
    c.eixo = null
    c.balanco = 0
    c.deLado = 0
  }
  if (c.descanso && modo !== 'descanso') c.descanso = null
  if (c.barco && modo !== 'barco') {
    c.barco.fase = 'atracado'
    c.barco = null
  }
  if (modo !== 'mergulho') c.mergulho = null
  c.modo = modo
  c.noModo = 0
  aviso(modo)
}
