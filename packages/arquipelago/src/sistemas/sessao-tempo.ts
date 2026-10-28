import {
  type ComandoSessaoTempo,
  type RespostaSessaoTempo,
  RespostaSessaoTempoSchema,
  type ServicoDoJogo,
} from '@sistemazero/arquipelago-contracts'

/** O cliente mede somente a validade da concessão; quem conta o tempo é o serviço. */
export function criarSessaoTempo(opcoes: {
  servico: ServicoDoJogo
  aoConfirmar: (resultado: RespostaSessaoTempo) => void
  relogio?: () => number
  novaId?: () => string
}) {
  const relogio = opcoes.relogio ?? (() => performance.now())
  const novaId = opcoes.novaId ?? (() => crypto.randomUUID())
  let sessao: { id: string; sequencia: number; prazo: number } | null = null
  let pendente: ComandoSessaoTempo | null = null
  let ultima: RespostaSessaoTempo | null = null
  let falhou = false
  let encerrada = false
  let cadeia: Promise<unknown> = Promise.resolve()

  function serializar<T>(operacao: () => Promise<T>): Promise<T> {
    const proxima = cadeia.catch(() => {}).then(operacao)
    cadeia = proxima
    return proxima
  }

  async function enviar(comando: ComandoSessaoTempo): Promise<RespostaSessaoTempo> {
    pendente = comando
    try {
      const inicio = relogio()
      const resposta = await opcoes.servico.buscar('/tempo/sessao', {
        metodo: 'POST',
        corpo: comando,
        sinal: AbortSignal.timeout(10_000),
      })
      if (resposta.status !== 200)
        throw new Error(`Sessão de tempo indisponível (${resposta.status})`)
      const resultado = RespostaSessaoTempoSchema.parse(resposta.corpo)
      const fim = relogio()
      if (!Number.isFinite(inicio) || !Number.isFinite(fim) || fim < inicio)
        throw new Error('Relógio monotônico indisponível')
      if (resultado.situacao === 'ativa') {
        if (!resultado.vencimento || comando.acao === 'pausar')
          throw new Error('Resposta de sessão inconsistente')
        const restante = Math.min(
          20_000,
          Date.parse(resultado.vencimento) - Date.parse(resultado.servidorEm) - (fim - inicio),
        )
        if (restante <= 0) throw new Error('Concessão de tempo expirada')
        sessao = { id: comando.sessaoId, sequencia: comando.sequencia, prazo: fim + restante }
      } else {
        if (resultado.vencimento !== null) throw new Error('Resposta de sessão inconsistente')
        sessao = null
      }
      pendente = null
      falhou = false
      ultima = resultado
      opcoes.aoConfirmar(resultado)
      return resultado
    } catch (erro) {
      falhou = true
      throw erro
    }
  }

  async function resolverPendente(): Promise<RespostaSessaoTempo | null> {
    return pendente ? enviar(pendente) : null
  }

  return {
    /** Não se usa Date.now(): mudar o relógio do aparelho não altera o prazo. */
    valida(): boolean {
      return !encerrada && !falhou && !!sessao && relogio() < sessao.prazo
    },
    iniciar(): Promise<RespostaSessaoTempo> {
      return serializar(async () => {
        if (encerrada) throw new Error('Sessão de tempo encerrada')
        const anterior = await resolverPendente()
        if (anterior?.situacao === 'limite' || anterior?.situacao === 'substituida') return anterior
        if (sessao) {
          if (relogio() < sessao.prazo) {
            if (!ultima) throw new Error('Sessão de tempo sem confirmação')
            return ultima
          }
          const acerto = await enviar({
            sessaoId: sessao.id,
            sequencia: sessao.sequencia + 1,
            acao: 'pausar',
          })
          if (acerto.situacao === 'limite' || acerto.situacao === 'substituida') return acerto
        }
        return enviar({ sessaoId: novaId(), sequencia: 0, acao: 'iniciar' })
      })
    },
    pulsar(): Promise<RespostaSessaoTempo> {
      return serializar(async () => {
        if (encerrada) throw new Error('Sessão de tempo encerrada')
        const anterior = await resolverPendente()
        if (anterior) return anterior
        if (!sessao) throw new Error('Sessão de tempo ausente')
        return enviar({ sessaoId: sessao.id, sequencia: sessao.sequencia + 1, acao: 'pulsar' })
      })
    },
    pausar(): Promise<RespostaSessaoTempo | null> {
      return serializar(async () => {
        const anterior = await resolverPendente()
        if (!sessao) return anterior
        return enviar({ sessaoId: sessao.id, sequencia: sessao.sequencia + 1, acao: 'pausar' })
      })
    },
    recuperar(): Promise<RespostaSessaoTempo | null> {
      return serializar(resolverPendente)
    },
    encerrar(): Promise<void> {
      return serializar(async () => {
        if (encerrada) return
        encerrada = true
        await resolverPendente()
        if (sessao)
          await enviar({ sessaoId: sessao.id, sequencia: sessao.sequencia + 1, acao: 'pausar' })
      })
    },
  }
}
