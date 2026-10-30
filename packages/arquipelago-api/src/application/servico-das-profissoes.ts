import { randomUUID } from 'node:crypto'
import {
  type ConcluirProfissao,
  conferirBandejasDaProfissao,
  diaDeSaoPaulo,
  ilhaAberta,
  MOEDAS_DO_TURNO,
  type PostoDaVila,
  pedidosDoTurno,
  type SessaoDaProfissao,
  VERSAO_DAS_PROFISSOES,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import { semanaDeSaoPaulo } from '../domain/desafios'
import type { Jogador } from '../domain/jogador'
import type { PortaDasMoedas } from '../domain/moedas.port'
import type { RepositorioDasProfissoes, TurnoGuardado } from '../domain/profissoes.port'
import {
  AcessoBloqueadoError,
  DesafioBloqueadoError,
  PlataformaIndisponivelError,
  SomenteLeituraError,
} from './erros'
import { type LeiturasDosMembros, publicoDosMembros } from './leituras-dos-membros'

export class TurnoNaoEncontradoError extends Error {}
export class BandejasDoTurnoInvalidasError extends Error {}

/** O prêmio nasce no servidor, não de um campo do salvamento nem de uma declaração de vitória. */
export class ServicoDasProfissoes {
  constructor(
    private readonly deps: {
      repo: RepositorioDasProfissoes
      moedas: PortaDasMoedas | null
      leituras: Pick<LeiturasDosMembros, 'jogador'>
      politica: PoliticaDeAcesso
      logger: Logger
      agora?: () => Date
    },
  ) {}

  async iniciar(jogador: Jogador, posto: PostoDaVila): Promise<SessaoDaProfissao> {
    await this.exigirEscrita(jogador)
    if (!this.deps.moedas) throw new PlataformaIndisponivelError()
    await this.cobrar(jogador)
    const agora = this.agora()
    const r = await this.deps.repo.reservar(
      {
        id: randomUUID(),
        jogadorId: jogador.id,
        contaId: jogador.contaId ?? jogador.id,
        publico: jogador.publico,
        posto,
        dia: diaDeSaoPaulo(agora),
        versao: VERSAO_DAS_PROFISSOES,
        moedas: MOEDAS_DO_TURNO,
      },
      agora,
    )
    this.exigirDono(r, jogador)
    return this.vista(r)
  }

  async concluir(jogador: Jogador, pedido: ConcluirProfissao): Promise<SessaoDaProfissao> {
    await this.exigirEscrita(jogador)
    const r = await this.deps.repo.ler(pedido.sessao, jogador.id, jogador.publico)
    if (!r) throw new TurnoNaoEncontradoError()
    this.exigirDono(r, jogador)
    if (
      r.versao !== VERSAO_DAS_PROFISSOES ||
      !conferirBandejasDaProfissao(r.id, r.posto, pedido.respostas)
    )
      throw new BandejasDoTurnoInvalidasError()
    const concluido = await this.deps.repo.concluir(r.id, jogador.id, jogador.publico, this.agora())
    await this.pagar(jogador, concluido)
    return this.vista((await this.deps.repo.ler(r.id, jogador.id, jogador.publico)) ?? concluido)
  }

  /** Reabertura retoma o pagamento com a chave original, inclusive depois da virada semanal. */
  private async cobrar(jogador: Jogador) {
    const semana = semanaDeSaoPaulo(this.agora())
    // Uma chamada à carteira por abertura: uma indisponibilidade não prende a criança em três prazos seguidos.
    for (const turno of await this.deps.repo.pendentes(jogador.id, jogador.publico, semana, 1)) {
      this.exigirDono(turno, jogador)
      if (!(await this.pagar(jogador, turno))) break
    }
  }

  private async pagar(jogador: Jogador, turno: TurnoGuardado): Promise<boolean> {
    const semana = semanaDeSaoPaulo(this.agora())
    if (!turno.concluidoEm || turno.pagamento === 'creditado') return true
    if (!this.deps.moedas || (turno.pagamento === 'teto' && turno.tetoSemana === semana))
      return false
    try {
      const r = await this.deps.moedas.creditar({
        userId: jogador.id,
        accountId: turno.contaId,
        audience: publicoDosMembros(jogador),
        key: turno.id,
        amount: turno.moedas,
      })
      if (r.situacao === 'recusado') {
        this.deps.logger.error('arquipelago.profissao.pagamento_recusado', { codigo: r.codigo })
        return false
      }
      await this.deps.repo.marcarPagamento(turno.id, r.situacao, semana)
      return r.situacao === 'creditado'
    } catch (erro) {
      this.deps.logger.warn('arquipelago.profissao.pagamento_pendente', {
        erro: erro instanceof Error ? erro.name : 'desconhecido',
      })
      return false
    }
  }

  private async exigirEscrita(jogador: Jogador) {
    const d = decidirAcesso(this.deps.politica, jogador)
    if (!d.liberado) throw new AcessoBloqueadoError(d.motivo)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    if (
      !jogador.equipe &&
      !ilhaAberta('vila-doce', (await this.deps.leituras.jogador(jogador)).posicao)
    )
      throw new DesafioBloqueadoError('ilha-fechada')
  }

  private exigirDono(r: TurnoGuardado, jogador: Jogador) {
    if (
      r.jogadorId !== jogador.id ||
      r.publico !== jogador.publico ||
      r.contaId !== (jogador.contaId ?? jogador.id)
    )
      throw new TurnoNaoEncontradoError()
  }

  private vista(r: TurnoGuardado): SessaoDaProfissao {
    if (r.versao !== VERSAO_DAS_PROFISSOES) throw new BandejasDoTurnoInvalidasError()
    return {
      id: r.id,
      versao: VERSAO_DAS_PROFISSOES,
      posto: r.posto,
      dia: r.dia,
      pedidos: pedidosDoTurno(r.posto, r.id, 0),
      concluido: r.concluidoEm !== null,
      moedas: r.moedas,
      pagamento: r.pagamento,
    }
  }
  private agora() {
    return this.deps.agora?.() ?? new Date()
  }
}
