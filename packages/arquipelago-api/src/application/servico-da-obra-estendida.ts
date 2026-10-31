import type {
  GravarObraEstendida,
  LeituraDaObraEstendida,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador } from '../domain/jogador'
import {
  ObraEstendidaDesatualizadaError,
  type RepositorioDaObraEstendida,
} from '../domain/obra-estendida.port'
import { AcessoBloqueadoError, SomenteLeituraError } from './erros'

/**
 * A obra estendida (E04 e B14, 31/10/2026): o documento da criação avançada que não cabe no
 * salvamento, um por jogador e público, com revisão própria. Suporte só lê.
 */
export class ServicoDaObraEstendida {
  constructor(
    private readonly deps: {
      repo: RepositorioDaObraEstendida
      politica: PoliticaDeAcesso
      agora?: () => Date
    },
  ) {}

  async ler(jogador: Jogador): Promise<LeituraDaObraEstendida> {
    this.exigirAcesso(jogador)
    return this.deps.repo.ler(jogador.id, jogador.publico)
  }

  async gravar(jogador: Jogador, pedido: GravarObraEstendida): Promise<LeituraDaObraEstendida> {
    this.exigirAcesso(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    const r = await this.deps.repo.gravar(
      jogador.id,
      jogador.publico,
      pedido,
      this.deps.agora?.() ?? new Date(),
    )
    if (!r.ok) throw new ObraEstendidaDesatualizadaError(r.atual)
    return r.guardada
  }

  private exigirAcesso(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }
}
