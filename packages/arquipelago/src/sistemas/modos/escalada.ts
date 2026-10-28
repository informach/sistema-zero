import type { TroncoVivo } from '../../estado/contexto'
import { CIPO, type Ponto } from '../cipo'
import { CORPO } from '../corpo'
import {
  corpoNaEscalada,
  distanciaDaCasca,
  ESCALADA,
  grudar,
  naAlturaDoTronco,
  passoDaEscalada,
  saltoDaEscalada,
} from '../escalada'
import type {
  AvisoDeModo,
  EntradaDoPasso,
  EstadoDoCorpo,
  ModoDeMovimento,
  MundoDoMovimento,
} from './tipos'
import { mudarModo } from './trocas'

/** Soltar do tronco sem pular (tecla de usar, ou descer até o chão): um passinho para fora. */
export const PASSO_PARA_FORA_DO_TRONCO = 1.5

/** Gruda no tronco com o corpo em `de` (o encaixe leva o corpo até a casca aos poucos). */
export function agarrarTronco(
  c: EstadoDoCorpo,
  t: TroncoVivo,
  de: Ponto,
  agora: number,
  aviso: AvisoDeModo,
): void {
  grudar(t.tronco, de, c.agarrado, CORPO.doCentroAoPe, ESCALADA.maosAcimaDoCentro)
  c.inicio.x = de.x
  c.inicio.y = de.y
  c.inicio.z = de.z
  c.contraOTronco = 0
  mudarModo(c, 'escalada', agora, aviso)
  c.tronco = t
  c.velY = 0
}

/**
 * O tronco que o corpo (em `c.prox`) empurra agora: na altura da casca, encostado nela e com a
 * direção pedida apontando para o meio dele. Nulo se não há.
 */
export function troncoContra(
  c: EstadoDoCorpo,
  e: EntradaDoPasso,
  mundo: MundoDoMovimento,
): TroncoVivo | null {
  let contra: TroncoVivo | null = null
  const pedido = Math.hypot(e.pedidoX, e.pedidoZ)
  for (const t of mundo.troncos) {
    const tr = t.tronco
    if (!naAlturaDoTronco(tr, c.prox.y, CORPO.doCentroAoPe, ESCALADA.maosAcimaDoCentro)) continue
    if (distanciaDaCasca(tr, c.prox, CORPO.raio) > ESCALADA.distanciaParaGrudar) continue
    const ax = (tr.base.x + tr.topo.x) / 2 - c.prox.x
    const az = (tr.base.z + tr.topo.z) / 2 - c.prox.z
    if (pedido < 0.2) continue
    const d = (Math.hypot(ax, az) || 1) * pedido
    if ((e.pedidoX * ax + e.pedidoZ * az) / d > 0.6) contra = t
  }
  return contra
}

/**
 * Escalar o tronco (`sistemas/escalada.ts`): frente e trás sobem e descem (a câmera não importa),
 * os lados seguem a tela. O corpo vai direto para o lugar na casca, sem controlador. Pular solta
 * para fora (ou para onde se pede); usar, ou descer até o pé, dá um passinho para fora.
 */
export const MODO_ESCALADA: ModoDeMovimento = {
  id: 'escalada',
  valendo: (c, mundo) => c.tronco !== null && mundo.troncos.includes(c.tronco),
  passo(c, e) {
    const tronco = c.tronco
    if (!tronco) return 'direto'
    const t = tronco.tronco
    const lado = c.agarrado.lado
    // Olhando para o tronco, a direita dele é `(cos lado, −sin lado)`; se a câmera está do outro
    // lado, a direita da tela é a esquerda dele.
    const mesmaMao = e.ladoX * Math.cos(lado) - e.ladoZ * Math.sin(lado) >= 0 ? 1 : -1
    c.fimDaEscalada = passoDaEscalada(
      t,
      c.agarrado,
      e.iz,
      e.ix * mesmaMao,
      e.dt,
      CORPO.raio,
      CORPO.doCentroAoPe,
      ESCALADA.maosAcimaDoCentro,
    )
    corpoNaEscalada(t, c.agarrado, CORPO.raio, c.alvo)
    const k = Math.min(1, c.noModo / CIPO.encaixe)
    c.prox.x = c.inicio.x + (c.alvo.x - c.inicio.x) * k
    c.prox.y = c.inicio.y + (c.alvo.y - c.inicio.y) * k
    c.prox.z = c.inicio.z + (c.alvo.z - c.inicio.z) * k
    return 'direto'
  },
  depois(c, e, _mundo, _mov, _pisou, aviso) {
    c.direcao = c.agarrado.lado + Math.PI
    c.noChao = false
    c.nadando = false
    c.velPedida = 1
    if (e.pulou) {
      saltoDaEscalada(c.agarrado, e.pedidoX, e.pedidoZ, c.embalo)
      c.velY = c.embalo.y
      c.direcao = Math.atan2(c.embalo.x, c.embalo.z)
      mudarModo(c, 'chao', e.agora, aviso)
      return false
    }
    if (c.fimDaEscalada === 'desceu' || (e.usou && !e.parado)) {
      c.velY = 0
      c.embalo.x = Math.sin(c.agarrado.lado) * PASSO_PARA_FORA_DO_TRONCO
      c.embalo.z = Math.cos(c.agarrado.lado) * PASSO_PARA_FORA_DO_TRONCO
      mudarModo(c, 'chao', e.agora, aviso)
      return true
    }
    return false
  },
}
