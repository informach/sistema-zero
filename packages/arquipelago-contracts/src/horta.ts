import { bonusDaColheita, type ContextoDaColheita } from './colheita'
import type { Canteiro, Semente } from './salvamento'

const HORA = 60 * 60 * 1000
const MINUTO = 60 * 1000

/**
 * A horta cresce no tempo de verdade, e só depois de regada: "planta hoje, colhe amanhã", como na
 * proposta (decisão da dona em 30/10/2026). A alface fica pronta na mesma tarde; o tomate e o
 * milho, no dia seguinte. Nada estraga esperando.
 */
export const CRESCIMENTO_MS: Record<Semente, number> = {
  alface: 4 * HORA,
  tomate: 8 * HORA,
  milho: 16 * HORA,
}

/**
 * Enquanto o primeiro pedido da sua ilha está aberto (a geladeira ainda não foi ganha), a horta
 * cresce no tempo curto do tutorial, para a primeira colheita caber na primeira sessão.
 */
export const CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS: Record<Semente, number> = {
  alface: 3 * MINUTO,
  tomate: 5 * MINUTO,
  milho: 8 * MINUTO,
}

/** Quanto a semente leva para amadurecer, no tempo do primeiro pedido ou no de sempre. */
export function tempoDeCrescer(semente: Semente, primeiroPedido = false): number {
  return (primeiroPedido ? CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS : CRESCIMENTO_MS)[semente]
}

/**
 * O canteiro cresce no tempo do primeiro pedido? `geladeiraEm` é quando a geladeira foi ganha:
 * `null` com o pedido ainda aberto (tudo no tempo curto), a data depois dele (o que foi regado
 * até ali continua no tempo curto e não "encolhe" ao ganhar a geladeira). Sem informar
 * (`undefined`), vale o tempo de sempre.
 */
export function noTempoDoPrimeiroPedido(c: Canteiro, geladeiraEm?: string | null): boolean {
  if (geladeiraEm === undefined) return false
  if (geladeiraEm === null) return true
  return c.regadoEm !== null && Date.parse(c.regadoEm) <= Date.parse(geladeiraEm)
}

export const COLHEITA: Record<Semente, number> = { alface: 2, tomate: 3, milho: 2 }

/** A colheita e sua semente cabem inteiras. Recusar conserva o canteiro maduro. */
export function cabeColheita(
  inventario: Readonly<Record<string, number>>,
  item: Semente,
  quantidade: number,
): boolean {
  return (inventario[item] ?? 0) + quantidade <= 999 && (inventario[`semente-${item}`] ?? 0) < 999
}

export type Estagio = 'vazio' | 'semente' | 'brotando' | 'crescendo' | 'maduro'

export function progresso(c: Canteiro, agoraMs: number, geladeiraEm?: string | null): number {
  if (!c.semente || !c.regadoEm) return 0
  const decorrido = agoraMs - Date.parse(c.regadoEm)
  const total = tempoDeCrescer(c.semente, noTempoDoPrimeiroPedido(c, geladeiraEm))
  return Math.max(0, Math.min(1, decorrido / total))
}

export function estagio(c: Canteiro, agoraMs: number, geladeiraEm?: string | null): Estagio {
  if (!c.semente) return 'vazio'
  const p = progresso(c, agoraMs, geladeiraEm)
  if (p >= 1) return 'maduro'
  if (!c.regadoEm) return 'semente'
  return p < 0.4 ? 'brotando' : 'crescendo'
}

export function plantar(c: Canteiro, semente: Semente, agora: Date): Canteiro | null {
  if (c.semente) return null
  return { ...c, semente, plantadoEm: agora.toISOString(), regadoEm: null }
}

export function regar(c: Canteiro, agora: Date): Canteiro | null {
  if (!c.semente || c.regadoEm) return null
  return { ...c, regadoEm: agora.toISOString() }
}

export function colher(
  c: Canteiro,
  agoraMs: number,
  contexto?: ContextoDaColheita,
  geladeiraEm?: string | null,
): {
  canteiro: Canteiro
  item: Semente
  qtd: number
  bonus: { clima: number; humor: number }
} | null {
  if (!c.semente || estagio(c, agoraMs, geladeiraEm) !== 'maduro') return null
  const bonus = bonusDaColheita(c.semente, contexto)
  return {
    canteiro: { ...c, semente: null, plantadoEm: null, regadoEm: null },
    item: c.semente,
    qtd: COLHEITA[c.semente] + bonus.clima + bonus.humor,
    bonus,
  }
}
