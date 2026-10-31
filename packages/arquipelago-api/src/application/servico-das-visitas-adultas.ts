import { createHash, randomBytes } from 'node:crypto'
import {
  type CasaDaVisitaAdulta,
  migrarSalvamento,
  OBJETOS_DA_CASA,
  QuartoDaVisitaAdultaSchema,
} from '@sistemazero/arquipelago-contracts'
import { ForbiddenError } from '@sistemazero/core/http'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { Jogador } from '../domain/jogador'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../domain/membros.port'
import type { RepositorioDaObraEstendida } from '../domain/obra-estendida.port'
import {
  type RepositorioDasVisitasAdultas,
  SalvamentoDaVisitaNecessarioError,
  VisitaAdultaIndisponivelError,
} from '../domain/visitas-adultas.port'
import { AcessoBloqueadoError, SomenteLeituraError } from './erros'
import { obraEstendidaNaVisita } from './obra-na-visita'

const hashDoCodigo = (codigo: string) => createHash('sha256').update(codigo).digest('hex')

export class ServicoDasVisitasAdultas {
  constructor(
    private readonly deps: {
      repo: RepositorioDasVisitasAdultas
      politica: PoliticaDeAcesso
      membros?: Pick<PortaDosMembros, 'lerQuarto'> | null
      /** O andar de cima e o terreno de quem é visitado; sem o repositório, a casa vem sem. */
      obras?: Pick<RepositorioDaObraEstendida, 'ler'> | null
      logger?: Logger
      agora?: () => Date
    },
  ) {}
  private exigir(jogador: Jogador, escrever = false) {
    if (jogador.publico !== 'adulto')
      throw new ForbiddenError('Visitas disponíveis somente na comunidade adulta.')
    const acesso = decidirAcesso(this.deps.politica, jogador)
    if (!acesso.liberado) throw new AcessoBloqueadoError(acesso.motivo)
    if (escrever && jogador.somenteLeitura) throw new SomenteLeituraError()
  }
  async estado(jogador: Jogador) {
    this.exigir(jogador)
    return { versao: 1 as const, ativo: await this.deps.repo.ativo(jogador.id) }
  }
  async gerar(jogador: Jogador) {
    this.exigir(jogador, true)
    const codigo = randomBytes(24).toString('base64url')
    if (
      !(await this.deps.repo.gerar(
        jogador.id,
        hashDoCodigo(codigo),
        this.deps.agora?.() ?? new Date(),
      ))
    )
      throw new SalvamentoDaVisitaNecessarioError()
    return { versao: 1 as const, codigo }
  }
  async desligar(jogador: Jogador) {
    this.exigir(jogador, true)
    await this.deps.repo.desligar(jogador.id)
    return { versao: 1 as const, ativo: false }
  }
  private async destino(jogador: Jogador, codigo: string) {
    this.exigir(jogador)
    const hash = hashDoCodigo(codigo)
    const alvo = await this.deps.repo.encontrar(hash)
    if (!alvo || alvo.jogadorId === jogador.id) throw new VisitaAdultaIndisponivelError()
    return { ...alvo, hash }
  }
  async confirmar(jogador: Jogador, codigo: string) {
    this.exigir(jogador)
    const dono = await this.deps.repo.dono(hashDoCodigo(codigo))
    if (!dono || dono === jogador.id) throw new VisitaAdultaIndisponivelError()
    return { versao: 1 as const, disponivel: true as const }
  }
  async abrir(jogador: Jogador, codigo: string): Promise<CasaDaVisitaAdulta> {
    const alvo = await this.destino(jogador, codigo)
    const s = migrarSalvamento(alvo.salvamento)
    if (!s) throw new VisitaAdultaIndisponivelError()
    let quarto: CasaDaVisitaAdulta['quarto'] = null
    if (this.deps.membros) {
      try {
        const lido = (
          await this.deps.membros.lerQuarto({ userId: alvo.jogadorId, audience: 'adult' })
        ).quarto
        quarto = lido ? QuartoDaVisitaAdultaSchema.parse(lido) : null
      } catch (erro) {
        if (!(erro instanceof MembrosIndisponiveisError)) throw erro
        this.deps.logger?.warn('arquipelago.visita_adulta.quarto_indisponivel', {
          motivo: erro.motivo,
          status: erro.status,
        })
      }
    }
    const estendida = await obraEstendidaNaVisita(
      this.deps.obras,
      alvo.jogadorId,
      'adulto',
      this.deps.logger,
    )
    // Uma revogação durante as leituras (o quarto e a obra) impede devolver a projeção.
    if (!(await this.deps.repo.confirmar(alvo.hash, alvo.jogadorId)))
      throw new VisitaAdultaIndisponivelError()
    return {
      versao: 1,
      obra: s.construcao.casa,
      horta: s.horta,
      completos: OBJETOS_DA_CASA.filter((id) => Boolean(s.projetos[id]?.aparencia)),
      quarto,
      ...estendida,
    }
  }
}
