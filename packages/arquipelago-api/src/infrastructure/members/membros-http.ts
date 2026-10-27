import { type JornadaDosMembros, JornadaDosMembrosSchema } from '@sistemazero/arquipelago-contracts'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../../domain/membros.port'

/** Uma leitura do Members nunca segura o jogo: passou disso, conta como indisponível. */
export const TEMPO_DA_LEITURA_MS = 5_000

/** Adaptador HTTP das rotas internas `/members/internal/arquipelago/*` (nunca pelo gateway). */
export class MembrosHttp implements PortaDosMembros {
  constructor(private readonly config: { url: string; token: string; fetch?: typeof fetch }) {}

  async lerJornada(signal?: AbortSignal): Promise<JornadaDosMembros> {
    const corpo = await this.ler('/members/internal/arquipelago/jornada', signal)
    const lido = JornadaDosMembrosSchema.safeParse(corpo)
    if (!lido.success) throw new MembrosIndisponiveisError('formato')
    return lido.data
  }

  private async ler(caminho: string, signal?: AbortSignal): Promise<unknown> {
    const tempo = AbortSignal.timeout(TEMPO_DA_LEITURA_MS)
    let resposta: Response
    try {
      resposta = await (this.config.fetch ?? fetch)(new URL(caminho, this.config.url), {
        headers: { 'x-arquipelago-token': this.config.token, accept: 'application/json' },
        signal: signal ? AbortSignal.any([signal, tempo]) : tempo,
      })
    } catch {
      throw new MembrosIndisponiveisError('rede')
    }
    if (!resposta.ok) throw new MembrosIndisponiveisError('status', resposta.status)
    try {
      return await resposta.json()
    } catch {
      throw new MembrosIndisponiveisError('formato')
    }
  }
}
