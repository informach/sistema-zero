import {
  type Acesso,
  type ComandoSessaoTempo,
  diaDeSaoPaulo,
  type GravarSalvamento,
  LIMITE_DIARIO_PADRAO_MINUTOS,
  migrarSalvamento,
  normalizarLimiteDiario,
  type RespostaSessaoTempo,
  SALVAMENTO_MAX_BYTES,
  type SalvamentoGuardado,
  type TempoRegistrado,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador, Responsavel } from '../domain/jogador'
import type { RepositorioDoJogo, SalvamentoNoBanco } from '../domain/repositorio.port'
import type { RepositorioSessoesTempo } from '../domain/repositorio-sessoes-tempo.port'
import { DataTempoInvalidaError } from '../domain/tempo-erros'
import {
  AcessoBloqueadoError,
  SalvamentoGrandeDemaisError,
  SalvamentoIlegivelError,
  SessaoTempoNaoPermitidaError,
  SomenteLeituraError,
} from './erros'

export type ResultadoDeGravar =
  | { ok: true; guardado: SalvamentoGuardado }
  | { ok: false; atual: SalvamentoGuardado }

const NADA_GUARDADO: SalvamentoGuardado = { revisao: 0, salvamento: null, atualizadoEm: null }

/** Os casos de uso do serviço do jogo. Sem HTTP e sem SQL: só regra. */
export class ServicoDoJogo {
  constructor(
    private readonly repo: RepositorioDoJogo,
    private readonly politica: PoliticaDeAcesso,
    private readonly agora: () => Date = () => new Date(),
    private readonly sessoesTempo?: RepositorioSessoesTempo,
  ) {}

  async acesso(jogador: Jogador): Promise<Acesso> {
    const decisao = decidirAcesso(this.politica, jogador)
    const [limite, usado] = await Promise.all([
      this.limiteDe(jogador),
      this.repo.lerTempo(jogador.id, diaDeSaoPaulo(this.agora())),
    ])
    return { ...decisao, limiteDiarioMinutos: limite, usadoHojeSegundos: usado }
  }

  async lerSalvamento(jogador: Jogador): Promise<SalvamentoGuardado> {
    this.exigirLiberado(jogador)
    const linha = await this.repo.lerSalvamento(jogador.id)
    return linha ? paraGuardado(linha) : NADA_GUARDADO
  }

  async gravarSalvamento(jogador: Jogador, pedido: GravarSalvamento): Promise<ResultadoDeGravar> {
    this.exigirLiberado(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    if (new TextEncoder().encode(JSON.stringify(pedido.salvamento)).length > SALVAMENTO_MAX_BYTES) {
      throw new SalvamentoGrandeDemaisError()
    }
    const r = await this.repo.gravarSalvamento({
      jogadorId: jogador.id,
      publico: jogador.publico,
      revisaoBase: pedido.revisaoBase,
      salvamento: pedido.salvamento,
      agora: this.agora(),
    })
    if (r.ok) return { ok: true, guardado: paraGuardado(r.guardado) }
    return { ok: false, atual: r.atual ? paraGuardado(r.atual) : NADA_GUARDADO }
  }

  async registrarTempo(
    jogador: Jogador,
    segundos: number,
    eventoId: string,
    diaDoEvento: string,
  ): Promise<TempoRegistrado> {
    this.exigirLiberado(jogador)
    const limite = await this.limiteDe(jogador)
    const agora = this.agora()
    const dia = diaDeSaoPaulo(agora)
    if (diaDoEvento > dia) throw new DataTempoInvalidaError()
    // Suporte olhando não gasta o tempo da criança.
    let usado = jogador.somenteLeitura
      ? await this.repo.lerTempo(jogador.id, dia)
      : await this.repo.somarTempo(jogador.id, diaDoEvento, segundos, agora, eventoId)
    if (diaDoEvento !== dia) usado = await this.repo.lerTempo(jogador.id, dia)
    return {
      usadoHojeSegundos: usado,
      limiteDiarioMinutos: limite,
      acabou: limite !== null && usado >= limite * 60,
    }
  }

  async comandarSessaoTempo(
    jogador: Jogador,
    comando: ComandoSessaoTempo,
  ): Promise<RespostaSessaoTempo> {
    this.exigirLiberado(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    if (jogador.publico !== 'kids' || !jogador.contaId) throw new SessaoTempoNaoPermitidaError()
    if (!this.sessoesTempo) throw new Error('Repositório de sessões não configurado')
    const agora = this.agora()
    const resultado = await this.sessoesTempo.executar({
      ...comando,
      jogadorId: jogador.id,
      contaId: jogador.contaId,
      agora,
    })
    return {
      ...resultado,
      servidorEm: agora.toISOString(),
      vencimento: resultado.vencimento?.toISOString() ?? null,
    }
  }

  async lerLimiteDaFamilia(responsavel: Responsavel): Promise<number> {
    return (await this.repo.lerLimite(responsavel.contaId)) ?? LIMITE_DIARIO_PADRAO_MINUTOS
  }

  async gravarLimiteDaFamilia(responsavel: Responsavel, minutos: number): Promise<number> {
    if (responsavel.somenteLeitura) throw new SomenteLeituraError()
    return this.repo.gravarLimite(
      responsavel.contaId,
      normalizarLimiteDiario(minutos),
      this.agora(),
    )
  }

  private exigirLiberado(jogador: Jogador): void {
    const decisao = decidirAcesso(this.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }

  /** Kids: o que a família escolheu, ou 30 minutos. Adulto: sem limite. */
  private async limiteDe(jogador: Jogador): Promise<number | null> {
    if (jogador.publico !== 'kids' || !jogador.contaId) return null
    return (await this.repo.lerLimite(jogador.contaId)) ?? LIMITE_DIARIO_PADRAO_MINUTOS
  }
}

function paraGuardado(linha: SalvamentoNoBanco): SalvamentoGuardado {
  const salvamento = migrarSalvamento(linha.dados)
  if (!salvamento) throw new SalvamentoIlegivelError()
  return { revisao: linha.revisao, salvamento, atualizadoEm: linha.atualizadoEm.toISOString() }
}
