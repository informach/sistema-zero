import {
  festaDoDia,
  type RoupasConcedidas,
  roupasConquistadas,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import { AvatarIndisponivelError, type PortaDoAvatar } from '../domain/avatar.port'
import type { Jogador } from '../domain/jogador'
import type { RepositorioDoJogo } from '../domain/repositorio.port'
import { AcessoBloqueadoError, PlataformaIndisponivelError, SomenteLeituraError } from './erros'
import { publicoDosMembros } from './leituras-dos-membros'

/**
 * As roupas do jogo (§6.28, A21). O serviço confere a conquista pelo salvamento guardado (amizade
 * de três corações com cada morador e a festa em vigor no dia de São Paulo) e pede ao Members as
 * peças; o cliente nunca diz o que ganhou. Repetir é seguro: o Members só concede o que falta.
 */
export class ServicoDasRoupas {
  constructor(
    private readonly deps: {
      jogo: Pick<RepositorioDoJogo, 'lerSalvamento'>
      avatar: PortaDoAvatar | null
      politica: PoliticaDeAcesso
      logger: Logger
      agora?: () => Date
    },
  ) {}

  async sincronizar(jogador: Jogador): Promise<RoupasConcedidas> {
    const d = decidirAcesso(this.deps.politica, jogador)
    if (!d.liberado) throw new AcessoBloqueadoError(d.motivo)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    const guardado = await this.deps.jogo.lerSalvamento(jogador.id)
    const lido = guardado ? SalvamentoSchema.safeParse(guardado.dados) : null
    if (!lido?.success) return { versao: 1, novas: [] }
    const pecas = roupasConquistadas(lido.data, festaDoDia(this.deps.agora?.() ?? new Date()))
    if (pecas.length === 0) return { versao: 1, novas: [] }
    if (!this.deps.avatar) throw new PlataformaIndisponivelError()
    try {
      const r = await this.deps.avatar.conceder({
        userId: jogador.id,
        accountId: jogador.contaId ?? jogador.id,
        audience: publicoDosMembros(jogador),
        pecas,
      })
      if (r.situacao === 'recusado') {
        this.deps.logger.error('arquipelago.roupas.recusadas', { codigo: r.codigo })
        return { versao: 1, novas: [] }
      }
      return { versao: 1, novas: r.concedidas }
    } catch (erro) {
      if (erro instanceof AvatarIndisponivelError) throw new PlataformaIndisponivelError(erro)
      throw erro
    }
  }
}
