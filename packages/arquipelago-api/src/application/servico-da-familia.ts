import {
  LIMITE_DIARIO_PADRAO_MINUTOS,
  PERMISSOES_PADRAO,
  type PermissoesDaFamilia,
  POSICOES_DA_JORNADA,
  type SemanaDaCrianca,
  type SemanaDaFamilia,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDoJogadorNosDesafios } from '../domain/desafios.port'
import type { RepositorioDaFamilia } from '../domain/familia.port'
import type { Jogador, Responsavel } from '../domain/jogador'
import type { RepositorioDoJogo } from '../domain/repositorio.port'
import {
  desafiosDaSemana,
  type Janela,
  janelaDaSemana,
  objetosCriados,
} from '../domain/semana-da-familia'
import { SomenteLeituraError } from './erros'
import type { LeiturasDosMembros } from './leituras-dos-membros'
import type { ModoDosDesafios } from './servico-dos-desafios'

/**
 * A família no Arquipélago para a área dos pais (28/10/2026, fase1-18): a semana de cada criança e
 * as permissões de visita. Quem é o responsável vem do gateway; os perfis vêm do repasse dos pais,
 * mas só os que o próprio serviço viu jogar NESTA conta são lidos (`perfisDaConta`).
 */
export class ServicoDaFamilia {
  private readonly agora: () => Date

  constructor(
    private readonly deps: {
      familia: RepositorioDaFamilia
      jogo: Pick<RepositorioDoJogo, 'lerLimite'>
      desafios: Pick<RepositorioDoJogadorNosDesafios, 'conclusoes'>
      politica: PoliticaDeAcesso
      modoDosDesafios: ModoDosDesafios
      leituras: LeiturasDosMembros
      logger: Logger
      agora?: () => Date
    },
  ) {
    this.agora = deps.agora ?? (() => new Date())
  }

  async semana(responsavel: Responsavel, perfis: readonly string[]): Promise<SemanaDaFamilia> {
    const janela = janelaDaSemana(this.agora())
    const limite =
      (await this.deps.jogo.lerLimite(responsavel.contaId)) ?? LIMITE_DIARIO_PADRAO_MINUTOS
    // As crianças que veem o jogo: a mesma decisão de quando cada uma abre o jogo.
    const veem = perfis.filter(
      (id) => decidirAcesso(this.deps.politica, criancaDa(responsavel, id)).liberado,
    )
    const base = { inicio: janela.inicio, fim: janela.fim, limiteDiarioMinutos: limite }
    if (veem.length === 0)
      return { ...base, algumaCriancaVe: false, criancas: [], aindaSemJogo: [] }
    const daConta = new Set(await this.deps.familia.perfisDaConta(responsavel.contaId, veem))
    const jogaram = veem.filter((id) => daConta.has(id))
    const [tempos, salvamentos] = await Promise.all([
      this.deps.familia.tempoNaJanela(jogaram, janela.inicio, janela.fim),
      this.deps.familia.salvamentos(jogaram),
    ])
    const criancas = await Promise.all(
      jogaram.map(
        async (id): Promise<SemanaDaCrianca> => ({
          perfilId: id,
          desafios: await this.desafios(responsavel, id, janela),
          objetos: salvamentos.has(id) ? objetosCriados(salvamentos.get(id)) : null,
          tempoLivre: tempos.get(id) ?? { segundos: 0, dias: 0 },
        }),
      ),
    )
    return {
      ...base,
      algumaCriancaVe: true,
      criancas,
      aindaSemJogo: veem.filter((id) => !daConta.has(id)),
    }
  }

  async lerPermissoes(responsavel: Responsavel): Promise<PermissoesDaFamilia> {
    return (await this.deps.familia.lerPermissoes(responsavel.contaId)) ?? { ...PERMISSOES_PADRAO }
  }

  async gravarPermissoes(
    responsavel: Responsavel,
    permissoes: PermissoesDaFamilia,
  ): Promise<PermissoesDaFamilia> {
    if (responsavel.somenteLeitura) throw new SomenteLeituraError()
    return this.deps.familia.gravarPermissoes(responsavel.contaId, permissoes, this.agora())
  }

  /**
   * Os desafios da semana: `null` quando a criança não tem desafios (desligados, ou só a equipe).
   * Sem a jornada (Members fora), conta os aprovados e deixa "de ilhas anteriores" sem número.
   */
  private async desafios(
    responsavel: Responsavel,
    perfilId: string,
    janela: Janela,
  ): Promise<SemanaDaCrianca['desafios']> {
    const { modoDosDesafios } = this.deps
    const abertos =
      modoDosDesafios === 'aberto' || (modoDosDesafios === 'equipe' && responsavel.equipe)
    if (!abertos) return null
    const conclusoes = await this.deps.desafios.conclusoes(perfilId, 'kids')
    return desafiosDaSemana(conclusoes, janela, await this.posicao(responsavel, perfilId))
  }

  private async posicao(responsavel: Responsavel, perfilId: string): Promise<number | null> {
    if (responsavel.equipe) return POSICOES_DA_JORNADA
    if (!this.deps.leituras.ligadas()) return null
    try {
      return (await this.deps.leituras.jogador(criancaDa(responsavel, perfilId))).posicao
    } catch (erro) {
      this.deps.logger.warn('arquipelago.familia.jornada_indisponivel', {
        erro: erro instanceof Error ? erro.name : 'desconhecido',
      })
      return null
    }
  }
}

/** A criança como ela entra no jogo: perfil do Kids, conta da família, papel da conta. */
function criancaDa(responsavel: Responsavel, perfilId: string): Jogador {
  return {
    id: perfilId,
    publico: 'kids',
    contaId: responsavel.contaId,
    equipe: responsavel.equipe,
    somenteLeitura: false,
  }
}
