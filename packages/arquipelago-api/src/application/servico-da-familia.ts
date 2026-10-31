import {
  type FotosNoClubeDoJogador,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  PERMISSOES_PADRAO,
  type PermissoesDaFamilia,
  POSICOES_DA_JORNADA,
  type SemanaDaCrianca,
  type SemanaDaFamilia,
  VERSAO_DAS_FOTOS_NO_CLUBE,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDoJogadorNosDesafios } from '../domain/desafios.port'
import type { RepositorioDaFamilia } from '../domain/familia.port'
import type { Jogador, Responsavel } from '../domain/jogador'
import type { RepositorioDoJogo } from '../domain/repositorio.port'
import {
  criacoesDaSemana,
  desafiosDaSemana,
  diasDeVoltaAoCurso,
  type Janela,
  janelaDaSemana,
} from '../domain/semana-da-familia'
import { AcessoBloqueadoError, SomenteLeituraError } from './erros'
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
    const agora = this.agora()
    const janela = janelaDaSemana(agora)
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
    // Meia-noite UTC do primeiro dia vem antes da de São Paulo; o dia certo é filtrado depois.
    const desde = new Date(`${janela.inicio}T00:00:00Z`)
    const [tempos, aparencias, sessoes] = await Promise.all([
      this.deps.familia.tempoNaJanela(jogaram, janela.inicio, janela.fim),
      this.deps.familia.aparenciasNaJanela(jogaram, desde, agora),
      this.deps.familia.sessoesNaJanela(jogaram, desde, agora),
    ])
    const aulas = await this.aulasDepoisDeJogar(sessoes, agora)
    const criancas = await Promise.all(
      jogaram.map(
        async (id): Promise<SemanaDaCrianca> => ({
          perfilId: id,
          desafios: await this.desafios(responsavel, id, janela),
          objetos: criacoesDaSemana(aparencias.get(id) ?? [], janela),
          tempoLivre: tempos.get(id) ?? { segundos: 0, dias: 0 },
          voltaAoCurso: aulas
            ? { dias: diasDeVoltaAoCurso(sessoes.get(id) ?? [], aulas.get(id) ?? [], janela) }
            : null,
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

  /**
   * Fotos no Clube (N08b): a criança lê só esta permissão da conta dela. Adulto e conta sem
   * escolha guardada: desligado. Quem não vê o jogo recebe o bloqueio de sempre.
   */
  async fotosNoClube(jogador: Jogador): Promise<FotosNoClubeDoJogador> {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
    if (jogador.publico !== 'kids' || jogador.contaId === null)
      return { versao: VERSAO_DAS_FOTOS_NO_CLUBE, fotosNoClube: false }
    const p = (await this.deps.familia.lerPermissoes(jogador.contaId)) ?? PERMISSOES_PADRAO
    return { versao: VERSAO_DAS_FOTOS_NO_CLUBE, fotosNoClube: p.fotosNoClube }
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

  /**
   * As aulas concluídas de quem jogou, do fim da primeira sessão até agora (uma ida ao Members
   * para a família toda). `null` = sem a leitura dos cursos: a linha não aparece para os pais.
   */
  private async aulasDepoisDeJogar(
    sessoes: Map<string, Date[]>,
    agora: Date,
  ): Promise<Map<string, Date[]> | null> {
    if (!this.deps.leituras.ligadas()) return null
    const fins = [...sessoes.values()].flat()
    if (fins.length === 0) return new Map()
    const de = new Date(Math.min(...fins.map((f) => f.getTime())))
    try {
      return await this.deps.leituras.aulasConcluidas([...sessoes.keys()], de, agora)
    } catch (erro) {
      this.deps.logger.warn('arquipelago.familia.cursos_indisponiveis', {
        erro: erro instanceof Error ? erro.name : 'desconhecido',
      })
      return null
    }
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
