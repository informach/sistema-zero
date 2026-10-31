import type { ModoDoCorpo } from '../../estado/contexto'
import { guardarBalao } from '../balao'
import { soltarCorda } from '../cordas'
import { CORPO } from '../corpo'
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
  if (c.balao && modo !== 'balao') {
    // Desceu, a ilha saiu ou um corte levou a criança: o balão volta ao lugar dele.
    if (c.balao.fase !== 'parado') guardarBalao(c.balao)
    c.balao = null
  }
  if (modo !== 'mergulho') c.mergulho = null
  if (c.montaria && modo !== 'montar') {
    // Sair da sela por qualquer motivo (descer, um teleporte, a ilha que sai): o dino fica onde
    // estava, parado, olhando para onde ia.
    c.montaria.x = c.prox.x
    c.montaria.z = c.prox.z
    c.montaria.y = c.prox.y - CORPO.doCentroAoPe - CORPO.folga
    c.montaria.giro = c.direcao
    c.montaria.montada = false
    c.montaria = null
    c.beira = null
  }
  c.modo = modo
  c.noModo = 0
  aviso(modo)
}
