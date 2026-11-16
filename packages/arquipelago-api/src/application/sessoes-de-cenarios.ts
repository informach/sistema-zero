import { ForbiddenError } from '@sistemazero/core/http'
import {
  CriarSessaoSchema,
  type EstadoDeSessao,
  EstadoDeSessaoSchema,
  PedidoDeViewportSchema,
  type ResultadoDeViewport,
  ResultadoDeViewportSchema,
  type SessaoDeCenario,
  type TarefaDeViewport,
} from '@sistemazero/molda-cenarios-core'
import type { Equipe } from '../domain/jogador'
import type { ServicoDeCenarios } from './servico-de-cenarios'
import { CenarioNaoEncontrado } from './servico-de-cenarios'

export interface RepositorioDeSessoesDeCenario {
  listar(agora: string): Promise<SessaoDeCenario[]>
  criar(s: SessaoDeCenario): Promise<void>
  ler(id: string): Promise<SessaoDeCenario | null>
  pulso(id: string, autor: string, estado: EstadoDeSessao, expiraEm: string): Promise<boolean>
  pedir(t: TarefaDeViewport): Promise<TarefaDeViewport>
  lerTarefa(id: string): Promise<TarefaDeViewport | null>
  reivindicar(sessaoId: string, agora: string): Promise<TarefaDeViewport | null>
  concluir(id: string, sessaoId: string, r: ResultadoDeViewport): Promise<boolean>
}
export class SessoesDeCenarios {
  constructor(
    private readonly repo: RepositorioDeSessoesDeCenario,
    private readonly cenarios: ServicoDeCenarios,
    private readonly agora = () => new Date(),
  ) {}
  private exigir(e: Equipe) {
    if (!e.podeEscrever)
      throw new ForbiddenError('Somente administradores podem controlar o editor')
  }
  async listar(e: Equipe) {
    this.exigir(e)
    return this.repo.listar(this.agora().toISOString())
  }
  async criar(e: Equipe, body: unknown) {
    this.exigir(e)
    const p = CriarSessaoSchema.parse(body),
      projeto = await this.cenarios.ler(e, p.projetoId),
      s: SessaoDeCenario = {
        id: crypto.randomUUID(),
        projetoId: p.projetoId,
        autorId: e.id,
        estado: {
          revisao: projeto.revisao,
          revisaoPronta: -1,
          gesto: false,
          ocupado: true,
          modo: 'editando',
          selecionados: [],
        },
        expiraEm: new Date(this.agora().getTime() + 30000).toISOString(),
      }
    await this.repo.criar(s)
    return s
  }
  private async sessao(e: Equipe, id: string, dona = false) {
    this.exigir(e)
    const s = await this.repo.ler(id)
    if (!s || new Date(s.expiraEm) <= this.agora())
      throw new CenarioNaoEncontrado('Sessão encerrada ou expirada')
    if (dona && s.autorId !== e.id) throw new ForbiddenError('A sessão pertence a outro operador')
    return s
  }
  async pulso(e: Equipe, id: string, body: unknown) {
    await this.sessao(e, id, true)
    const estado = EstadoDeSessaoSchema.parse(body)
    await this.repo.pulso(id, e.id, estado, new Date(this.agora().getTime() + 30000).toISOString())
    return { ok: true }
  }
  async fechar(e: Equipe, id: string) {
    const s = await this.sessao(e, id, true)
    await this.repo.pulso(id, e.id, { ...s.estado, ocupado: true }, this.agora().toISOString())
    return { ok: true }
  }
  async pedir(e: Equipe, id: string, body: unknown) {
    const s = await this.sessao(e, id),
      p = PedidoDeViewportSchema.parse(body)
    if (s.estado.gesto || s.estado.ocupado)
      throw new ForbiddenError('O editor está ocupado; aguarde o gesto manual')
    if (s.estado.revisao !== p.revisaoEsperada)
      throw new ForbiddenError('A revisão do viewport mudou')
    return this.repo.pedir({
      id: p.id,
      sessaoId: id,
      autorId: e.id,
      pedido: p,
      estado: 'pendente',
      resultado: null,
      expiraEm: new Date(this.agora().getTime() + 120000).toISOString(),
    })
  }
  async proxima(e: Equipe, id: string) {
    await this.sessao(e, id, true)
    return this.repo.reivindicar(id, this.agora().toISOString())
  }
  async concluir(e: Equipe, sessaoId: string, id: string, body: unknown) {
    await this.sessao(e, sessaoId, true)
    const r = ResultadoDeViewportSchema.parse(body)
    if (new TextEncoder().encode(JSON.stringify(r)).byteLength > 3 * 1024 * 1024)
      throw new ForbiddenError('Resultado acima do limite')
    if (!(await this.repo.concluir(id, sessaoId, r)))
      throw new CenarioNaoEncontrado('Pedido já concluído ou ausente')
    return { ok: true }
  }
  async tarefa(e: Equipe, sessaoId: string, id: string) {
    await this.sessao(e, sessaoId)
    const t = await this.repo.lerTarefa(id)
    if (!t || t.sessaoId !== sessaoId) throw new CenarioNaoEncontrado('Pedido ausente')
    if (t.estado !== 'concluido' && new Date(t.expiraEm) <= this.agora())
      return {
        ...t,
        estado: 'concluido' as const,
        resultado: {
          ok: false,
          revisao: t.pedido.revisaoEsperada,
          erro: 'O viewport não confirmou a execução antes do prazo. Consulte a revisão antes de repetir.',
        },
      }
    return t
  }
}
