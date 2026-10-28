import {
  diaDeSaoPaulo,
  FiltroDaMedicaoSchema,
  type RelatorioDaMedicao,
} from '@sistemazero/arquipelago-contracts'
import { montarMedicao, type RepositorioDaMedicao } from '../domain/medicao'

export class PeriodoDaMedicaoInvalidoError extends Error {}

export class ServicoDaMedicao {
  constructor(
    private readonly repo: RepositorioDaMedicao,
    private readonly agora = () => new Date(),
  ) {}

  async ler(entrada: unknown): Promise<RelatorioDaMedicao> {
    const filtro = FiltroDaMedicaoSchema.safeParse(entrada)
    const agora = this.agora()
    const hoje = diaDeSaoPaulo(agora)
    if (!filtro.success || filtro.data.ate > hoje) throw new PeriodoDaMedicaoInvalidoError()
    const dados = await this.repo.agregar(filtro.data, hoje)
    return montarMedicao(filtro.data, dados, hoje, agora)
  }
}
