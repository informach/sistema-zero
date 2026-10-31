import {
  diaDeSaoPaulo,
  ilhaAberta,
  type PagamentoDaVenda,
  prepararVendaNaFeira,
  type RespostaDoServico,
  type SalvamentoGuardado,
  type VenderNaFeira,
  VenderNaFeiraSchema,
} from '@sistemazero/arquipelago-contracts'
import { mesmosDados } from '../sistemas/conciliar-salvamento'

/** A banca da feira no playground (A22), com as mesmas recusas do serviço. */
export interface RegistroDeVendaFalsa {
  venda: VenderNaFeira
  pagamentoId: string
  moedas: number
  pagamento: PagamentoDaVenda
}
export function criarVendasFalsas(o: {
  somenteLeitura: boolean
  posicao: number
  ler(): SalvamentoGuardado
  gravar(s: SalvamentoGuardado, registros: RegistroDeVendaFalsa[]): void
  registros?: RegistroDeVendaFalsa[]
  compraPendente(): boolean
  creditar(id: string, moedas: number, dia: string): 'creditado' | 'teto'
  agora(): Date
}) {
  const registros = new Map((o.registros ?? []).map((r) => [r.venda.chave, r]))
  const recusar = (status: number, code: string) => ({ status, corpo: { error: { code } } })
  return {
    buscar(path: string, metodo: string, corpo: unknown): RespostaDoServico | null {
      if (!path.startsWith('/feira/')) return null
      if (o.somenteLeitura) return recusar(403, 'SOMENTE_LEITURA')
      if (path === '/feira/vendas/pendentes' && metodo === 'GET')
        return {
          status: 200,
          corpo: {
            versao: 1,
            vendas: [...registros.values()]
              .filter((r) => r.pagamento === 'pendente')
              .slice(0, 1)
              .map((r) => r.venda),
          },
        }
      if (path !== '/feira/vender' || metodo !== 'POST') return recusar(404, 'NOT_FOUND')
      const lido = VenderNaFeiraSchema.safeParse(corpo)
      if (!lido.success) return recusar(400, 'VALIDATION_ERROR')
      const c = lido.data
      let r = registros.get(c.chave)
      if (r && !mesmosDados(r.venda, c)) return recusar(409, 'VENDA_INCOMPATIVEL')
      let guardado = o.ler()
      if (!r) {
        if (!ilhaAberta('vila-doce', o.posicao)) return recusar(403, 'ILHA_FECHADA')
        if ([...registros.values()].some((x) => x.venda.dia === c.dia))
          return recusar(409, 'VENDA_REPETIDA')
        if (o.compraPendente()) return recusar(423, 'COMPRA_PENDENTE')
        if (
          c.dia !== diaDeSaoPaulo(o.agora()) ||
          guardado.revisao !== c.revisaoBase ||
          !guardado.salvamento
        )
          return recusar(409, 'VENDA_BASE_RECUSADA')
        const preparado = prepararVendaNaFeira(guardado.salvamento, c.itens)
        if (!preparado.ok) return recusar(409, 'VENDA_BASE_RECUSADA')
        r = {
          venda: c,
          pagamentoId: crypto.randomUUID(),
          moedas: preparado.moedas,
          pagamento: 'pendente',
        }
        registros.set(c.chave, r)
        guardado = {
          revisao: guardado.revisao + 1,
          salvamento: preparado.salvamento,
          atualizadoEm: o.agora().toISOString(),
        }
        o.gravar(guardado, [...registros.values()])
      }
      if (r.pagamento === 'pendente') {
        r = { ...r, pagamento: o.creditar(r.pagamentoId, r.moedas, diaDeSaoPaulo(o.agora())) }
        registros.set(c.chave, r)
        o.gravar(guardado, [...registros.values()])
      }
      return {
        status: 200,
        corpo: {
          versao: 1,
          venda: r.venda,
          moedas: r.moedas,
          pagamento: r.pagamento,
          guardado: structuredClone(guardado),
        },
      }
    },
  }
}
