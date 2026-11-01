import {
  diaDeSaoPaulo,
  type FiltroDaMedicao,
  FiltroDaMedicaoSchema,
  HORAS_DA_VOLTA_AO_CURSO,
  PERFIS_DA_FAMILIA_MAXIMO,
  type RelatorioDaMedicao,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import {
  contarRotinas,
  montarMedicao,
  type RepositorioDaMedicao,
  type VoltaAoCursoDaMedicao,
} from '../domain/medicao'
import { dentroDaJanela, diasDeVoltaAoCurso, type Janela } from '../domain/semana-da-familia'
import type { LeiturasDosMembros } from './leituras-dos-membros'

export class PeriodoDaMedicaoInvalidoError extends Error {}

const DIA_MS = 86_400_000
const PRAZO_MS = HORAS_DA_VOLTA_AO_CURSO * 3_600_000
/**
 * A rota do Members aceita até 20 pessoas e 9 dias por pedido: as sessões vão em blocos de 8 dias
 * e as aulas de cada bloco, até 24 h depois do último dia dele.
 */
export const DIAS_POR_BLOCO_DA_VOLTA = 8
/** Acima disso a conta fica para outro dia (fica em `semFonte`), em vez de pesar no Members. */
export const PEDIDOS_DA_VOLTA_MAXIMO = 200
const PEDIDOS_AO_MESMO_TEMPO = 4

type Leituras = Pick<LeiturasDosMembros, 'ligadas' | 'aulasConcluidas'> &
  Partial<Pick<LeiturasDosMembros, 'compras'>>

export class ServicoDaMedicao {
  constructor(
    private readonly repo: RepositorioDaMedicao,
    private readonly agora = () => new Date(),
    private readonly leituras: Leituras | null = null,
    private readonly logger: Pick<Logger, 'warn'> | null = null,
  ) {}

  async ler(entrada: unknown): Promise<RelatorioDaMedicao> {
    const filtro = FiltroDaMedicaoSchema.safeParse(entrada)
    const agora = this.agora()
    const hoje = diaDeSaoPaulo(agora)
    if (!filtro.success || filtro.data.ate > hoje) throw new PeriodoDaMedicaoInvalidoError()
    const [dados, volta, comRotina, compras] = await Promise.all([
      this.repo.agregar(filtro.data, hoje),
      this.voltaAoCurso(filtro.data, agora),
      this.repo.salvamentosComRotina?.(filtro.data.publico) ?? null,
      this.leituras?.ligadas()
        ? (this.leituras.compras?.(filtro.data.publico, filtro.data.de, filtro.data.ate) ?? null)
        : null,
    ])
    return montarMedicao(filtro.data, dados, hoje, agora, volta, {
      rotinas: comRotina ? contarRotinas(comRotina, agora) : null,
      compras,
    })
  }

  /**
   * A mesma regra do cartão dos pais (`diasDeVoltaAoCurso`), somada na equipe. Só contam sessões
   * cujo prazo já passou. Sem o Members, com ele fora ou com pedidos demais: `null`.
   */
  private async voltaAoCurso(
    filtro: FiltroDaMedicao,
    agora: Date,
  ): Promise<VoltaAoCursoDaMedicao | null> {
    if (!this.leituras?.ligadas()) return null
    const janela: Janela = { inicio: filtro.de, fim: filtro.ate }
    try {
      // Meia-noite UTC vem antes da de São Paulo; o dia certo é filtrado logo abaixo.
      // O adulto não tem sessões: o fim de cada dia de jogo faz o papel delas (lacunas).
      const de = new Date(`${filtro.de}T00:00:00Z`)
      const ate = new Date(Date.parse(`${filtro.ate}T00:00:00Z`) + 2 * DIA_MS)
      const todas =
        filtro.publico === 'adulto'
          ? await this.repo.finsDosDiasDeJogo?.(de, ate)
          : await this.repo.finsDeSessao(de, ate)
      if (!todas) return null
      const fins = new Map<string, Date[]>()
      for (const [pessoa, lista] of todas) {
        const contam = lista.filter(
          (f) =>
            dentroDaJanela(diaDeSaoPaulo(f), janela) && f.getTime() + PRAZO_MS <= agora.getTime(),
        )
        if (contam.length) fins.set(pessoa, contam)
      }
      const aulas = await this.aulasDosBlocos(fins, agora)
      if (!aulas) return null
      const v: VoltaAoCursoDaMedicao = {
        pessoas: 0,
        pessoasComAula: 0,
        diasDeJogo: 0,
        diasComAula: 0,
      }
      for (const [pessoa, lista] of fins) {
        const voltou = diasDeVoltaAoCurso(lista, aulas.get(pessoa) ?? [], janela)
        v.pessoas++
        v.diasDeJogo += new Set(lista.map(diaDeSaoPaulo)).size
        v.diasComAula += voltou
        if (voltou > 0) v.pessoasComAula++
      }
      return v
    } catch (erro) {
      this.logger?.warn('arquipelago.medicao.cursos_indisponiveis', {
        erro: erro instanceof Error ? erro.name : 'desconhecido',
      })
      return null
    }
  }

  private async aulasDosBlocos(
    fins: Map<string, Date[]>,
    agora: Date,
  ): Promise<Map<string, Date[]> | null> {
    const aulas = new Map<string, Date[]>()
    // Laço, não `Math.min(...)`: com muitas sessões o espalhamento estoura a pilha.
    let inicio = Number.POSITIVE_INFINITY
    for (const lista of fins.values()) for (const f of lista) inicio = Math.min(inicio, f.getTime())
    if (inicio === Number.POSITIVE_INFINITY) return aulas
    const bloco = DIAS_POR_BLOCO_DA_VOLTA * DIA_MS
    const pessoasDoBloco = new Map<number, Set<string>>()
    for (const [pessoa, lista] of fins)
      for (const f of lista) {
        const i = Math.floor((f.getTime() - inicio) / bloco)
        pessoasDoBloco.set(i, (pessoasDoBloco.get(i) ?? new Set()).add(pessoa))
      }
    const pedidos: Array<{ pessoas: string[]; de: Date; ate: Date }> = []
    for (const [i, pessoas] of pessoasDoBloco) {
      const de = new Date(inicio + i * bloco)
      const ate = new Date(Math.min(inicio + (i + 1) * bloco + PRAZO_MS, agora.getTime()))
      const lista = [...pessoas]
      for (let k = 0; k < lista.length; k += PERFIS_DA_FAMILIA_MAXIMO)
        pedidos.push({ pessoas: lista.slice(k, k + PERFIS_DA_FAMILIA_MAXIMO), de, ate })
    }
    if (pedidos.length > PEDIDOS_DA_VOLTA_MAXIMO) {
      this.logger?.warn('arquipelago.medicao.volta_ao_curso_grande_demais', {
        pedidos: pedidos.length,
      })
      return null
    }
    const leituras = this.leituras
    if (!leituras) return null
    for (let k = 0; k < pedidos.length; k += PEDIDOS_AO_MESMO_TEMPO) {
      const respostas = await Promise.all(
        pedidos
          .slice(k, k + PEDIDOS_AO_MESMO_TEMPO)
          .map((p) => leituras.aulasConcluidas(p.pessoas, p.de, p.ate)),
      )
      for (const r of respostas)
        for (const [pessoa, horas] of r) aulas.set(pessoa, [...(aulas.get(pessoa) ?? []), ...horas])
    }
    return aulas
  }
}
