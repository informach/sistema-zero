/**
 * Quantas chamadas ao modelo um pedido do Pensa pode fazer (15/10/2026, decisão dela). Cada RODADA
 * tem a sua cota: a mensagem da criança que abre ou retoma o pedido, e a escolha do começo, que
 * prepara os guias. Antes eram 10 para o pedido todo: a conversa (pergunta, proposta, "Quero mudar
 * uma coisa", a oferta de desenhar) gastava, e o guia falhava logo depois de a criança escolher o
 * começo.
 *
 * Na prática as 2 tentativas por passo já seguram a rodada em 4 chamadas (proposta e revisão); a
 * cota da rodada é a rede para um passo novo. O teto do pedido para a CONVERSA longa, nunca os
 * guias: com ele valendo nos guias, o aceite de um pedido no teto falhava no primeiro guia, o mesmo
 * defeito de antes. O gasto da conta continua preso à trava de 60 chamadas por dia e 600 por mês
 * (`pensa_provider_usage`), conferida no mesmo `claim`.
 */
export const PENSA_ROUND_CALLS = 6
export const PENSA_OPERATION_CALLS = 24

/** Onde a rodada começou (as chamadas que o pedido já tinha); `null` = pedido anterior à marca. */
export function pensaRoundStart(input: unknown): number | null {
  const value =
    input && typeof input === 'object'
      ? (input as { roundStartCalls?: unknown }).roundStartCalls
      : undefined
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null
}

/**
 * A rodada gastou a cota dela, ou a conversa chegou ao teto do pedido. O pedido sem a marca (criado
 * antes dela) não tem rodada para contar: vale só o teto, e um guia que parou nas 10 de antes volta
 * com o "Tentar de novo".
 */
export function pensaCallsExhausted(operation: {
  calls: number
  input: unknown
  step: string
}): boolean {
  const start = pensaRoundStart(operation.input)
  if (start !== null && operation.calls - start >= PENSA_ROUND_CALLS) return true
  return operation.step !== 'guides' && operation.calls >= PENSA_OPERATION_CALLS
}
