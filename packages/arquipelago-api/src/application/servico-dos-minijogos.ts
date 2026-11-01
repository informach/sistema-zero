import type { PedirAmbienteDoDesafio } from '@sistemazero/arquipelago-contracts'
import { ForbiddenError } from '@sistemazero/core/http'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador, Responsavel } from '../domain/jogador'
import type { RepositorioDosMinijogos } from '../domain/minijogos.port'
import {
  AcessoBloqueadoError,
  DesafioMudouError,
  DesafioNaoEncontradoError,
  PlataformaIndisponivelError,
} from './erros'

export class ServicoDosMinijogos {
  constructor(
    private readonly repo: RepositorioDosMinijogos,
    private readonly politica: PoliticaDeAcesso,
    private readonly autorizarAmbiente?: (
      jogador: Jogador,
      id: string,
      pedido: PedirAmbienteDoDesafio,
    ) => Promise<unknown>,
  ) {}
  private acesso(j: Jogador) {
    const d = decidirAcesso(this.politica, j)
    if (!d.liberado) throw new AcessoBloqueadoError(d.motivo)
  }
  async listar(j: Jogador) {
    this.acesso(j)
    return { minijogos: await this.repo.listar(j.id) }
  }
  async abrir(j: Jogador, id: string) {
    this.acesso(j)
    return this.projeto(j.id, id)
  }
  private async projeto(jogador: string, id: string) {
    const p = await this.repo.abrir(jogador, id)
    if (!p) throw new DesafioNaoEncontradoError()
    return p
  }
  private async familia(r: Responsavel, perfil: string) {
    if (!(await this.repo.pertenceAConta(perfil, r.contaId)))
      throw new ForbiddenError('Este perfil não pertence à conta')
  }
  async listarDaFamilia(r: Responsavel, perfil: string) {
    await this.familia(r, perfil)
    return { minijogos: await this.repo.listar(perfil) }
  }
  async abrirDaFamilia(r: Responsavel, perfil: string, id: string) {
    await this.familia(r, perfil)
    return this.projeto(perfil, id)
  }
  /** Only execution of a saved approved Python minigame, after the family relation is confirmed. */
  async ambienteDaFamilia(
    r: Responsavel,
    perfil: string,
    id: string,
    pedido: PedirAmbienteDoDesafio,
  ) {
    const salvo = await this.abrirDaFamilia(r, perfil, id)
    if (salvo.revisao !== pedido.revisao) throw new DesafioMudouError()
    if (
      !salvo.projeto ||
      typeof salvo.projeto !== 'object' ||
      !('programmingLanguage' in salvo.projeto) ||
      salvo.projeto.programmingLanguage !== 'python'
    )
      throw new DesafioNaoEncontradoError()
    if (!this.autorizarAmbiente) throw new PlataformaIndisponivelError()
    return this.autorizarAmbiente(
      { id: perfil, contaId: r.contaId, publico: 'kids', equipe: r.equipe, somenteLeitura: true },
      id,
      pedido,
    )
  }
}
