import {
  ConcluirProfissaoSchema,
  conferirBandejasDaProfissao,
  diaDeSaoPaulo,
  IniciarProfissaoSchema,
  ilhaAberta,
  MOEDAS_DO_TURNO,
  pedidosDoTurno,
  type RespostaDoServico,
  type SessaoDaProfissao,
  SessaoDaProfissaoSchema,
} from '@sistemazero/arquipelago-contracts'

export function criarProfissoesFalsas(o: {
  agora: () => Date
  posicao: number
  somenteLeitura: boolean
  creditar: (id: string, quantidade: number, dia: string) => 'creditado' | 'teto'
  guarda?: { ler(): string | null; gravar(valor: string): void }
}) {
  const sessoes = new Map<string, SessaoDaProfissao>()
  try {
    const bruto = o.guarda?.ler()
    if (bruto)
      for (const s of SessaoDaProfissaoSchema.array().parse(JSON.parse(bruto))) sessoes.set(s.id, s)
  } catch {
    /* Playground vazio quando a sua persistência antiga não existe. */
  }
  const gravar = () => o.guarda?.gravar(JSON.stringify([...sessoes.values()]))
  return {
    buscar(caminho: string, metodo: string, corpo: unknown): RespostaDoServico | null {
      if (!caminho.startsWith('/profissoes/')) return null
      const recusar = (status: number, code: string) => ({ status, corpo: { error: { code } } })
      if (o.somenteLeitura) return recusar(403, 'SOMENTE_LEITURA')
      if (!ilhaAberta('vila-doce', o.posicao)) return recusar(403, 'ILHA_FECHADA')
      if (metodo !== 'POST') return recusar(404, 'NOT_FOUND')
      const dia = diaDeSaoPaulo(o.agora())
      if (caminho === '/profissoes/iniciar') {
        const p = IniciarProfissaoSchema.safeParse(corpo)
        if (!p.success) return recusar(400, 'VALIDATION_ERROR')
        for (const s of sessoes.values())
          if (s.concluido && s.pagamento !== 'creditado') {
            s.pagamento = o.creditar(s.id, s.moedas, dia)
          }
        let s = [...sessoes.values()].find((s) => s.posto === p.data.posto && s.dia === dia)
        if (!s) {
          const id = crypto.randomUUID()
          s = {
            id,
            versao: 1,
            posto: p.data.posto,
            dia,
            pedidos: pedidosDoTurno(p.data.posto, id, 0),
            concluido: false,
            moedas: MOEDAS_DO_TURNO,
            pagamento: 'aguardando',
          }
          sessoes.set(id, s)
        }
        gravar()
        return { status: 200, corpo: structuredClone(s) }
      }
      if (caminho === '/profissoes/concluir') {
        const p = ConcluirProfissaoSchema.safeParse(corpo)
        if (!p.success) return recusar(400, 'VALIDATION_ERROR')
        const s = sessoes.get(p.data.sessao)
        if (!s) return recusar(404, 'TURNO_NAO_ENCONTRADO')
        if (!conferirBandejasDaProfissao(s.id, s.posto, p.data.respostas))
          return recusar(422, 'TURNO_RESPOSTAS_INVALIDAS')
        s.concluido = true
        s.pagamento = o.creditar(s.id, s.moedas, dia)
        gravar()
        return { status: 200, corpo: structuredClone(s) }
      }
      return recusar(404, 'NOT_FOUND')
    },
  }
}
