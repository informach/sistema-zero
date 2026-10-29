import {
  type CasaDoIrmao,
  type IrmaoDoJogador,
  type IrmaosDoJogador,
  migrarSalvamento,
  OBJETOS_DA_CASA,
  PERFIS_DA_FAMILIA_MAXIMO,
  PERMISSOES_PADRAO,
  VERSAO_DAS_VISITAS,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDaFamilia } from '../domain/familia.port'
import type { Jogador } from '../domain/jogador'
import { AcessoBloqueadoError, IrmaoNaoEncontradoError, VisitasDesligadasError } from './erros'

/**
 * Os recordes da família e as visitas (fase3-12, 29/10/2026), só leitura, de quem joga. Irmão é
 * quem guardou o jogo logado na MESMA conta da criança (`perfis_da_conta`), não é ela e vê o jogo
 * pela mesma decisão de acesso. Tudo obedece à permissão `visitasDeIrmaos` da conta. O serviço
 * nunca sabe nomes: o BFF põe o nome de cada irmão. Plano:
 * `docs/plans/2026-10-29-arquipelago-recordes-e-visitas.md`.
 */
export class ServicoDasVisitas {
  constructor(
    private readonly deps: {
      familia: Pick<
        RepositorioDaFamilia,
        'perfisDaConta' | 'outrosPerfisDaConta' | 'salvamentos' | 'lerPermissoes'
      >
      politica: PoliticaDeAcesso
    },
  ) {}

  /** Os irmãos da criança, com o melhor de cada percurso e se já construíram a casa. */
  async irmaos(jogador: Jogador): Promise<IrmaosDoJogador> {
    this.exigirLiberado(jogador)
    const vazio: IrmaosDoJogador = { versao: VERSAO_DAS_VISITAS, situacao: 'ok', irmaos: [] }
    if (jogador.publico !== 'kids' || jogador.contaId === null) return vazio
    if (!(await this.permitido(jogador.contaId)))
      return { versao: VERSAO_DAS_VISITAS, situacao: 'desligado', irmaos: [] }
    const ids = (
      await this.deps.familia.outrosPerfisDaConta(
        jogador.contaId,
        jogador.id,
        PERFIS_DA_FAMILIA_MAXIMO,
      )
    ).filter((id) => this.veOJogo(jogador, id))
    if (ids.length === 0) return vazio
    const salvos = await this.deps.familia.salvamentos(ids)
    const irmaos = ids.flatMap((id): IrmaoDoJogador[] => {
      const s = migrarSalvamento(salvos.get(id))
      return s
        ? [{ perfilId: id, percursos: s.percursos, temCasa: s.construcao.casa !== null }]
        : []
    })
    return { versao: VERSAO_DAS_VISITAS, situacao: 'ok', irmaos }
  }

  /** A casa de UM irmão, só para ver: a obra com o quintal, a horta e os objetos com aparência. */
  async casa(jogador: Jogador, perfilId: string): Promise<CasaDoIrmao> {
    this.exigirLiberado(jogador)
    if (jogador.publico !== 'kids' || jogador.contaId === null || perfilId === jogador.id)
      throw new IrmaoNaoEncontradoError()
    if (!(await this.permitido(jogador.contaId))) throw new VisitasDesligadasError()
    const daConta = await this.deps.familia.perfisDaConta(jogador.contaId, [perfilId])
    if (!daConta.includes(perfilId) || !this.veOJogo(jogador, perfilId))
      throw new IrmaoNaoEncontradoError()
    const s = migrarSalvamento((await this.deps.familia.salvamentos([perfilId])).get(perfilId))
    if (!s) throw new IrmaoNaoEncontradoError()
    return {
      versao: VERSAO_DAS_VISITAS,
      perfilId,
      obra: s.construcao.casa,
      horta: s.horta,
      completos: OBJETOS_DA_CASA.filter((o) => Boolean(s.projetos[o]?.aparencia)),
    }
  }

  private async permitido(contaId: string): Promise<boolean> {
    const p = (await this.deps.familia.lerPermissoes(contaId)) ?? PERMISSOES_PADRAO
    return p.visitasDeIrmaos
  }

  /** O irmão vê o jogo pela mesma decisão de quando ele abre (a família tem o papel da conta). */
  private veOJogo(jogador: Jogador, perfilId: string): boolean {
    return decidirAcesso(this.deps.politica, {
      id: perfilId,
      publico: 'kids',
      contaId: jogador.contaId,
      equipe: jogador.equipe,
      somenteLeitura: false,
    }).liberado
  }

  private exigirLiberado(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }
}
