import {
  type CompraDeInsumos,
  CompraDeInsumosSchema,
  prepararEntregaDeInsumos,
  type RespostaDoServico,
  type SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'
import { mesmosDados } from '../sistemas/conciliar-salvamento'

export interface RegistroDeInsumosFalso {
  pedido: CompraDeInsumos
  situacao: 'pendente' | 'entregue' | 'saldo-insuficiente' | 'recusada'
  moedas: number
  saldo: number | null
}

/** Mesmos comandos e recusas do serviço. Estado financeiro separado da mochila. */
export function criarInsumosFalsos(o: {
  somenteLeitura: boolean
  ler(): SalvamentoGuardado
  gravar(s: SalvamentoGuardado, registros: RegistroDeInsumosFalso[]): void
  registros?: RegistroDeInsumosFalso[]
  debitar(
    chave: string,
    moedas: number,
  ): { situacao: 'debitado'; saldo: number } | { situacao: 'saldo-insuficiente' }
  agora(): Date
}) {
  const registros = new Map((o.registros ?? []).map((r) => [r.pedido.chave, r]))
  const recusar = (status: number, code: string) => ({ status, corpo: { error: { code } } })
  const pendente = () => [...registros.values()].find((r) => r.situacao === 'pendente')
  return {
    registros: () => [...registros.values()],
    pendente: () => Boolean(pendente()),
    buscar(caminho: string, metodo: string, corpo: unknown): RespostaDoServico | null {
      if (!caminho.startsWith('/insumos/')) return null
      if (o.somenteLeitura) return recusar(403, 'SOMENTE_LEITURA')
      if (caminho === '/insumos/pendente' && metodo === 'GET')
        return { status: 200, corpo: { versao: 1, pedido: pendente()?.pedido ?? null } }
      if (caminho !== '/insumos/comprar' || metodo !== 'POST') return recusar(404, 'NOT_FOUND')
      const p = CompraDeInsumosSchema.safeParse(corpo)
      if (!p.success) return recusar(400, 'VALIDATION_ERROR')
      let r = registros.get(p.data.chave)
      if (r && !mesmosDados(r.pedido, p.data)) return recusar(409, 'COMPRA_INCOMPATIVEL')
      let guardado = o.ler()
      if (!r || r.situacao === 'pendente') {
        if (pendente() && pendente()?.pedido.chave !== p.data.chave)
          return recusar(423, 'COMPRA_PENDENTE')
        if (guardado.revisao !== p.data.revisaoBase || !guardado.salvamento)
          return recusar(409, r ? 'COMPRA_DESATUALIZADA' : 'COMPRA_BASE_DESATUALIZADA')
        const entrega = prepararEntregaDeInsumos(guardado.salvamento, p.data)
        if (!entrega.ok) return recusar(422, r ? 'COMPRA_SEM_ESPACO' : 'COMPRA_BASE_SEM_ESPACO')
        r ??= { pedido: p.data, situacao: 'pendente', moedas: entrega.moedas, saldo: null }
        registros.set(p.data.chave, r)
        o.gravar(guardado, [...registros.values()])
        const debito = o.debitar(p.data.chave, r.moedas)
        r = {
          ...r,
          situacao: debito.situacao === 'debitado' ? 'entregue' : 'saldo-insuficiente',
          saldo: debito.situacao === 'debitado' ? debito.saldo : null,
        }
        if (debito.situacao === 'debitado')
          guardado = {
            revisao: guardado.revisao + 1,
            salvamento: entrega.salvamento,
            atualizadoEm: o.agora().toISOString(),
          }
        registros.set(p.data.chave, r)
        o.gravar(guardado, [...registros.values()])
      }
      return { status: 200, corpo: { versao: 1, ...r, guardado: structuredClone(guardado) } }
    },
  }
}
