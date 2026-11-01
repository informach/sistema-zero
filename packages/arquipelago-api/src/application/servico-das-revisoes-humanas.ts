import type { EstadoDaRevisaoHumana, ResponderRevisao } from '@sistemazero/arquipelago-contracts'
import type { Equipe } from '../domain/jogador'
import type { RepositorioDosMinijogos } from '../domain/minijogos.port'
import type { RepositorioDasRevisoesHumanas } from '../domain/revisoes-humanas.port'
import { DesafioNaoEncontradoError, RevisaoMudouError, SomenteLeituraError } from './erros'

/** Quantos itens a fila mostra de uma vez. */
const LIMITE_DA_FILA = 100

/**
 * A revisão humana do projeto autoral da Lenda (lacunas, 01/11/2026). A pessoa vê o estado e o
 * retorno na lista de desafios (`revisaoHumana` do item); a equipe, na Sala do Professor, joga o
 * projeto aprovado (a cópia do minijogo) e responde. Responder a um envio que já foi trocado é 409: a pessoa mandou uma
 * versão nova, que precisa ser aberta antes.
 */
export class ServicoDasRevisoesHumanas {
  constructor(
    private readonly deps: {
      repo: RepositorioDasRevisoesHumanas
      minijogos: RepositorioDosMinijogos
      agora?: () => Date
    },
  ) {}

  async fila(_equipe: Equipe, estado?: EstadoDaRevisaoHumana) {
    return {
      revisoes: await this.deps.repo.fila({
        ...(estado ? { estado } : {}),
        limite: LIMITE_DA_FILA,
      }),
    }
  }

  async abrir(_equipe: Equipe, jogadorId: string, desafioId: string) {
    const revisao = await this.deps.repo.ler(jogadorId, desafioId)
    const minijogo = revisao ? await this.deps.minijogos.abrir(jogadorId, desafioId) : null
    if (!revisao || !minijogo) throw new DesafioNaoEncontradoError()
    return { revisao, projeto: minijogo.projeto }
  }

  async responder(
    equipe: Equipe,
    jogadorId: string,
    desafioId: string,
    resposta: ResponderRevisao,
  ) {
    if (!equipe.podeRevisar) throw new SomenteLeituraError()
    const ok = await this.deps.repo.responder({
      jogadorId,
      desafioId,
      envio: resposta.envio,
      estado: resposta.estado,
      retorno: resposta.retorno,
      revisadoPor: equipe.id,
      agora: (this.deps.agora ?? (() => new Date()))(),
    })
    if (!ok) {
      if (!(await this.deps.repo.ler(jogadorId, desafioId))) throw new DesafioNaoEncontradoError()
      throw new RevisaoMudouError()
    }
    const revisao = await this.deps.repo.ler(jogadorId, desafioId)
    return { revisao }
  }
}
