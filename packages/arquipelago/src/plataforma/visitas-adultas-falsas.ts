import {
  type CasaDaVisitaAdulta,
  CasaDaVisitaAdultaSchema,
  GerarConviteAdultoSchema,
  PedidoDeVisitaAdultaSchema,
  type PublicoJogo,
  type RespostaDoServico,
  type SalvamentoGuardado,
} from '@sistemazero/arquipelago-contracts'

/** Massa local, não é convite de uma pessoa real. Nunca é usada no cliente hospedado. */
export const CODIGO_DA_VISITA_ADULTA_DE_EXEMPLO = 'Casa_adulta_QA01'.repeat(2)
export function criarVisitasAdultasFalsas(deps: {
  publico: PublicoJogo
  somenteLeitura: boolean
  salvo(): SalvamentoGuardado
  exemplo?: 'ligado' | 'revogar-ao-conferir'
  casa: CasaDaVisitaAdulta
}) {
  let codigoMeu: string | null = null
  let exemploAtivo = Boolean(deps.exemplo)
  return {
    buscar(caminho: string, metodo: string, corpo?: unknown): RespostaDoServico | null {
      if (!caminho.startsWith('/visitas-adultas/')) return null
      const erro = (status: number, code: string) => ({ status, corpo: { error: { code } } })
      if (deps.publico !== 'adulto') return erro(403, 'FORBIDDEN')
      if (caminho === '/visitas-adultas/convite') {
        if (metodo === 'GET')
          return { status: 200, corpo: { versao: 1, ativo: codigoMeu !== null } }
        if (deps.somenteLeitura) return erro(403, 'SOMENTE_LEITURA')
        if (metodo === 'DELETE') {
          codigoMeu = null
          return { status: 200, corpo: { versao: 1, ativo: false } }
        }
        if (metodo === 'POST') {
          if (!GerarConviteAdultoSchema.safeParse(corpo).success)
            return erro(400, 'VALIDATION_ERROR')
          if (!deps.salvo().salvamento) return erro(409, 'SALVAMENTO_NECESSARIO')
          const bytes = crypto.getRandomValues(new Uint8Array(24))
          codigoMeu = btoa(String.fromCharCode(...bytes))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
          return { status: 200, corpo: { versao: 1, codigo: codigoMeu } }
        }
      }
      if (
        ['/visitas-adultas/abrir', '/visitas-adultas/conferir'].includes(caminho) &&
        metodo === 'POST'
      ) {
        const p = PedidoDeVisitaAdultaSchema.safeParse(corpo)
        if (!p.success) return erro(400, 'VALIDATION_ERROR')
        if (caminho.endsWith('/conferir') && deps.exemplo === 'revogar-ao-conferir')
          exemploAtivo = false
        if (
          !exemploAtivo ||
          p.data.codigo !== CODIGO_DA_VISITA_ADULTA_DE_EXEMPLO ||
          p.data.codigo === codigoMeu
        )
          return erro(404, 'VISITA_ADULTA_INDISPONIVEL')
        return {
          status: 200,
          corpo: caminho.endsWith('/abrir')
            ? CasaDaVisitaAdultaSchema.parse(deps.casa)
            : { versao: 1, disponivel: true },
        }
      }
      return erro(404, 'NOT_FOUND')
    },
  }
}
