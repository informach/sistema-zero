import {
  type Canteiro,
  noTempoDoPrimeiroPedido,
  tempoDeCrescer,
} from '@sistemazero/arquipelago-contracts'

export {
  COLHEITA,
  CRESCIMENTO_DO_PRIMEIRO_PEDIDO_MS,
  CRESCIMENTO_MS,
  cabeColheita,
  colher,
  type Estagio,
  estagio,
  noTempoDoPrimeiroPedido,
  plantar,
  progresso,
  regar,
  tempoDeCrescer,
} from '@sistemazero/arquipelago-contracts'

/**
 * Quando a geladeira foi ganha (`null` com o primeiro pedido aberto): o que foi regado até ali
 * cresce no tempo curto do tutorial (`noTempoDoPrimeiroPedido`, no contrato).
 */
export function geladeiraEm(s: { projetos: { geladeira?: { ganhoEm: string } | undefined } }) {
  return s.projetos.geladeira?.ganhoEm ?? null
}

const MINUTO_MS = 60 * 1000

/**
 * Quanto falta para colher (ms), no tempo de verdade (A14): a horta tem o relógio de verdade, o
 * céu tem o dia do jogo. `null` sem semente regada; 0 já maduro.
 */
export function faltaParaColher(
  c: Canteiro,
  agoraMs: number,
  geladeira?: string | null,
): number | null {
  if (!c.semente || !c.regadoEm) return null
  const total = tempoDeCrescer(c.semente, noTempoDoPrimeiroPedido(c, geladeira))
  return Math.max(0, Date.parse(c.regadoEm) + total - agoraMs)
}

/** "3 horas e 20 minutos", "uma hora", "5 minutos", "menos de um minuto". */
export function textoDoTempo(ms: number): string {
  const minutos = Math.ceil(ms / MINUTO_MS)
  if (minutos < 1) return 'menos de um minuto'
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  const h = horas === 1 ? 'uma hora' : `${horas} horas`
  const m = resto === 1 ? 'um minuto' : `${resto} minutos`
  if (horas === 0) return m
  return resto === 0 ? h : `${h} e ${m}`
}

/** A fala de quanto falta, dita ao regar e ao olhar o canteiro crescendo. */
export function falaDeQuandoColhe(
  c: Canteiro,
  agoraMs: number,
  geladeira?: string | null,
): string | null {
  const falta = faltaParaColher(c, agoraMs, geladeira)
  if (falta === null) return null
  if (falta === 0) return 'Já dá para colher.'
  return `A colheita sai daqui a ${textoDoTempo(falta)}, no tempo de verdade. Com o jogo fechado, a horta continua crescendo.`
}
