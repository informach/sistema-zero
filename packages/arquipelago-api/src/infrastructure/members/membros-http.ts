import {
  type AnaliseDosMembros,
  AnaliseDosMembrosSchema,
  type AulasConcluidasDosMembros,
  AulasConcluidasDosMembrosSchema,
  type CurriculoDeBlocos,
  CurriculoDeBlocosSchema,
  type JogadorDosMembros,
  JogadorDosMembrosSchema,
  type JornadaDosMembros,
  JornadaDosMembrosSchema,
  type SaldoDosMembros,
  SaldoDosMembrosSchema,
  type VerificacaoDosMembros,
  VerificacaoDosMembrosSchema,
} from '@sistemazero/arquipelago-contracts'
import {
  ConferenciaIndisponivelError,
  MembrosIndisponiveisError,
  type PerguntaDoJogador,
  type PortaDosMembros,
  type PublicoDosMembros,
} from '../../domain/membros.port'

/** Uma leitura do Members nunca segura o jogo: passou disso, conta como indisponível. */
export const TEMPO_DA_LEITURA_MS = 5_000
/** Conferir roda o jogo no executor (o mesmo prazo das aulas, com folga). */
export const TEMPO_DA_CONFERENCIA_MS = 160_000

/** Adaptador HTTP das rotas internas `/members/internal/arquipelago/*` (nunca pelo gateway). */
export class MembrosHttp implements PortaDosMembros {
  constructor(private readonly config: { url: string; token: string; fetch?: typeof fetch }) {}

  async lerJornada(signal?: AbortSignal): Promise<JornadaDosMembros> {
    return validar(
      JornadaDosMembrosSchema,
      await this.ler('/members/internal/arquipelago/jornada', signal),
    )
  }

  async lerJogador(pergunta: PerguntaDoJogador, signal?: AbortSignal): Promise<JogadorDosMembros> {
    const q = new URLSearchParams({
      userId: pergunta.userId,
      accountId: pergunta.accountId,
      audience: pergunta.audience,
    })
    return validar(
      JogadorDosMembrosSchema,
      await this.ler(`/members/internal/arquipelago/jogador?${q}`, signal),
    )
  }

  async lerCurriculo(
    audience: PublicoDosMembros,
    signal?: AbortSignal,
  ): Promise<CurriculoDeBlocos> {
    return validar(
      CurriculoDeBlocosSchema,
      await this.ler(
        `/members/internal/arquipelago/curriculo-de-blocos?audience=${audience}`,
        signal,
      ),
    )
  }

  async lerSaldo(pergunta: PerguntaDoJogador, signal?: AbortSignal): Promise<SaldoDosMembros> {
    const q = new URLSearchParams({
      userId: pergunta.userId,
      accountId: pergunta.accountId,
      audience: pergunta.audience,
    })
    return validar(
      SaldoDosMembrosSchema,
      await this.ler(`/members/internal/arquipelago/saldo?${q}`, signal),
    )
  }

  async lerAulasConcluidas(
    pergunta: { usuarios: string[]; de: Date; ate: Date },
    signal?: AbortSignal,
  ): Promise<AulasConcluidasDosMembros> {
    const q = new URLSearchParams({
      usuarios: pergunta.usuarios.join(','),
      de: pergunta.de.toISOString(),
      ate: pergunta.ate.toISOString(),
    })
    return validar(
      AulasConcluidasDosMembrosSchema,
      await this.ler(`/members/internal/arquipelago/aulas-concluidas?${q}`, signal),
    )
  }

  async analisarObjetivos(
    pedido: Parameters<PortaDosMembros['analisarObjetivos']>[0],
  ): Promise<AnaliseDosMembros> {
    return validar(
      AnaliseDosMembrosSchema,
      await this.ler('/members/internal/arquipelago/objetivos/analisar', undefined, {
        corpo: pedido,
        tempo: TEMPO_DA_CONFERENCIA_MS,
      }),
    )
  }

  async verificarObjetivos(
    pedido: Parameters<PortaDosMembros['verificarObjetivos']>[0],
  ): Promise<VerificacaoDosMembros> {
    return validar(
      VerificacaoDosMembrosSchema,
      await this.ler('/members/internal/arquipelago/objetivos/verificar', undefined, {
        corpo: pedido,
        tempo: TEMPO_DA_CONFERENCIA_MS,
        conferencia: true,
      }),
    )
  }

  private async ler(
    caminho: string,
    signal?: AbortSignal,
    opcoes: { corpo?: unknown; tempo?: number; conferencia?: boolean } = {},
  ): Promise<unknown> {
    const tempo = AbortSignal.timeout(opcoes.tempo ?? TEMPO_DA_LEITURA_MS)
    let resposta: Response
    try {
      resposta = await (this.config.fetch ?? fetch)(new URL(caminho, this.config.url), {
        method: opcoes.corpo === undefined ? 'GET' : 'POST',
        headers: {
          'x-arquipelago-token': this.config.token,
          accept: 'application/json',
          ...(opcoes.corpo === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(opcoes.corpo === undefined ? {} : { body: JSON.stringify(opcoes.corpo) }),
        signal: signal ? AbortSignal.any([signal, tempo]) : tempo,
      })
    } catch {
      throw new MembrosIndisponiveisError('rede')
    }
    if (opcoes.conferencia) {
      if (resposta.status === 424) throw new ConferenciaIndisponivelError('indisponivel')
      if (resposta.status === 429) throw new ConferenciaIndisponivelError('ocupado')
      if (resposta.status === 409) throw new ConferenciaIndisponivelError('sincronizando')
      if (resposta.status === 400 || resposta.status === 413)
        throw new ConferenciaIndisponivelError('recusado')
    }
    if (!resposta.ok) throw new MembrosIndisponiveisError('status', resposta.status)
    try {
      return await resposta.json()
    } catch {
      throw new MembrosIndisponiveisError('formato')
    }
  }
}

function validar<T>(
  schema: { safeParse(v: unknown): { success: true; data: T } | { success: false } },
  corpo: unknown,
): T {
  const lido = schema.safeParse(corpo)
  if (!lido.success) throw new MembrosIndisponiveisError('formato')
  return lido.data
}
