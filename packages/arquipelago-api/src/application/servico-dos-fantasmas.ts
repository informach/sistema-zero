import type {
  GuardarFantasma,
  LeituraDoFantasma,
  PercursoId,
} from '@sistemazero/arquipelago-contracts'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import { RecordeDoFantasmaMudouError, type RepositorioDosFantasmas } from '../domain/fantasmas.port'
import type { Jogador } from '../domain/jogador'
import { AcessoBloqueadoError, SomenteLeituraError } from './erros'
import type { ServicoDasVisitas } from './servico-das-visitas'

export class ServicoDosFantasmas {
  constructor(
    private readonly deps: {
      repo: RepositorioDosFantasmas
      politica: PoliticaDeAcesso
      visitas: Pick<ServicoDasVisitas, 'autorizarIrmao'>
      agora?: () => Date
    },
  ) {}

  async guardar(jogador: Jogador, pedido: GuardarFantasma): Promise<LeituraDoFantasma> {
    this.exigirAcesso(jogador)
    if (jogador.somenteLeitura) throw new SomenteLeituraError()
    if (
      !(await this.deps.repo.guardar(
        jogador.id,
        jogador.publico,
        pedido,
        this.deps.agora?.() ?? new Date(),
      ))
    )
      throw new RecordeDoFantasmaMudouError()
    return { versao: 1, situacao: 'disponivel', fantasma: pedido.fantasma }
  }

  async ler(jogador: Jogador, percurso: PercursoId, irmao?: string): Promise<LeituraDoFantasma> {
    this.exigirAcesso(jogador)
    if (irmao) await this.deps.visitas.autorizarIrmao(jogador, irmao)
    const fantasma = await this.deps.repo.ler(
      irmao ?? jogador.id,
      irmao ? 'kids' : jogador.publico,
      percurso,
    )
    return fantasma
      ? { versao: 1, situacao: 'disponivel', fantasma }
      : { versao: 1, situacao: 'ausente' }
  }

  private exigirAcesso(jogador: Jogador): void {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
  }
}
