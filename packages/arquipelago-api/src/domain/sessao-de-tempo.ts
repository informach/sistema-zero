import { dividirIntervaloDeTempo, type ParcelaDeTempo } from './intervalo-de-tempo'

/** A concessão curta limita a cobrança quando uma aba ou a rede desaparece. */
export const DURACAO_DA_CONCESSAO_MS = 20_000

export interface SessaoDeTempo {
  id: string
  cursor: Date
  vencimento: Date
}

export type AcertoDeSessao =
  | { situacao: 'ativa'; sessao: SessaoDeTempo; parcelas: ParcelaDeTempo[] }
  | { situacao: 'encerrada' | 'expirada'; parcelas: ParcelaDeTempo[] }

export function iniciarSessaoDeTempo(id: string, agora: Date): SessaoDeTempo {
  if (!id || !Number.isFinite(agora.getTime())) throw new Error('Sessão de tempo inválida')
  return {
    id,
    cursor: new Date(agora.getTime()),
    vencimento: new Date(agora.getTime() + DURACAO_DA_CONCESSAO_MS),
  }
}

/**
 * Calcula somente a transição; o repositório deve bloquear o perfil, gravar as parcelas e
 * persistir a sessão na mesma transação. A identidade e a repetição da operação são verificadas
 * na fronteira transacional, antes de chamar esta função.
 */
export function acertarSessaoDeTempo(
  sessao: SessaoDeTempo,
  agora: Date,
  acao: 'pulsar' | 'pausar',
): AcertoDeSessao {
  const acerto = dividirIntervaloDeTempo(sessao.cursor, agora, sessao.vencimento)
  if (agora.getTime() >= sessao.vencimento.getTime())
    return { situacao: 'expirada', parcelas: acerto.parcelas }
  if (acao === 'pausar') return { situacao: 'encerrada', parcelas: acerto.parcelas }
  const baseRenovacao = Math.max(agora.getTime(), sessao.cursor.getTime())
  return {
    situacao: 'ativa',
    sessao: {
      id: sessao.id,
      cursor: acerto.cursor,
      vencimento: new Date(baseRenovacao + DURACAO_DA_CONCESSAO_MS),
    },
    parcelas: acerto.parcelas,
  }
}
