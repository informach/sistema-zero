import {
  aparenciaDaGaleria,
  CompraNaGaleriaSchema,
  GALERIA,
  type GaleriaDoJogador,
  type IdDaGaleria,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/** Saldo do playground quando a URL não diz (`?moedas=`): dá para comprar uma ou duas. */
export const MOEDAS_DE_EXEMPLO = 80

/** Onde a galeria de mentira guarda as compras e o saldo entre uma abertura e outra. */
export interface GuardaDaGaleria {
  ler(): string | null
  gravar(valor: string): void
}

export interface OpcoesDaGaleriaFalsa {
  moedas?: number
  /** `fora-do-ar`: a leitura e a compra respondem 424, como o serviço sem o Members. */
  situacao?: 'fora-do-ar'
}

/**
 * A galeria de mentira (fase1-13, 29/10/2026), com a régua do serviço: o preço é o do catálogo,
 * a mesma chave (ou o que já é dela) nunca cobra de novo, saldo curto devolve 409
 * `SALDO_INSUFICIENTE` e o salvamento com uma da galeria não paga é recusado (422).
 */
export function criarGaleriaFalsa(o: OpcoesDaGaleriaFalsa = {}, guarda?: GuardaDaGaleria) {
  let saldo = Math.max(0, Math.floor(o.moedas ?? MOEDAS_DE_EXEMPLO))
  const pagas = new Set<IdDaGaleria>()
  const creditos = new Map<string, { semana: string; quantidade: number }>()
  const debitos = new Map<string, number>()
  // Como o serviço de verdade, as compras ficam guardadas à parte do salvamento: ao reabrir, o
  // jogo pode mandar o progresso que ficou no aparelho, mais novo que o salvamento guardado aqui.
  try {
    const bruto = guarda?.ler()
    const lido = bruto
      ? (JSON.parse(bruto) as {
          pagas?: unknown
          saldo?: unknown
          creditos?: Record<string, { semana: string; quantidade: number }>
          debitos?: Record<string, number>
        })
      : null
    for (const [id, valor] of Object.entries(lido?.debitos ?? {}))
      if (Number.isInteger(valor) && valor > 0) debitos.set(id, valor)
    for (const [id, c] of Object.entries(lido?.creditos ?? {})) {
      if (
        typeof c.semana === 'string' &&
        Number.isInteger(c.quantidade) &&
        c.quantidade > 0 &&
        c.quantidade <= 100
      )
        creditos.set(id, c)
    }
    if (lido && typeof lido.saldo === 'number' && o.moedas === undefined) saldo = lido.saldo
    if (lido && Array.isArray(lido.pagas))
      for (const id of lido.pagas)
        if (typeof id === 'string' && aparenciaDaGaleria(id)) pagas.add(id as IdDaGaleria)
  } catch {}
  const gravar = () => {
    try {
      guarda?.gravar(
        JSON.stringify({
          pagas: [...pagas],
          saldo,
          creditos: Object.fromEntries(creditos),
          debitos: Object.fromEntries(debitos),
        }),
      )
    } catch {}
  }
  const ler = (): GaleriaDoJogador => ({ possuidas: [...pagas], saldo, ilimitado: false })
  return {
    debitar(
      chave: string,
      moedas: number,
    ): { situacao: 'debitado'; saldo: number } | { situacao: 'saldo-insuficiente' } {
      const anterior = debitos.get(chave)
      if (anterior !== undefined) {
        if (anterior !== moedas) throw new Error('Compra com valor diferente no playground.')
        return { situacao: 'debitado', saldo }
      }
      if (saldo < moedas) return { situacao: 'saldo-insuficiente' }
      saldo -= moedas
      debitos.set(chave, moedas)
      gravar()
      return { situacao: 'debitado', saldo }
    },
    creditar(id: string, quantidade: number, dia: string): 'creditado' | 'teto' {
      if (creditos.has(id)) return 'creditado'
      const d = new Date(`${dia}T12:00:00Z`)
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7))
      const semana = d.toISOString().slice(0, 10)
      const ganho = [...creditos.values()]
        .filter((c) => c.semana === semana)
        .reduce((s, c) => s + c.quantidade, 0)
      if (ganho + quantidade > 100) return 'teto'
      creditos.set(id, { semana, quantidade })
      saldo += quantidade
      gravar()
      return 'creditado'
    },
    pagas: () => new Set(pagas),
    buscar(caminho: string, metodo: string, corpo: unknown) {
      if (caminho !== '/galeria' && caminho !== '/galeria/compras') return null
      if (o.situacao === 'fora-do-ar')
        return { status: 424, corpo: { error: { code: 'PLATAFORMA_INDISPONIVEL' } } }
      if (caminho === '/galeria' && metodo === 'GET') return { status: 200, corpo: ler() }
      if (caminho === '/galeria/compras' && metodo === 'POST') {
        const pedido = CompraNaGaleriaSchema.safeParse(corpo)
        if (!pedido.success) return { status: 400, corpo: { error: { code: 'VALIDATION_ERROR' } } }
        const item = GALERIA[pedido.data.aparencia]
        if (pagas.has(item.id)) return { status: 200, corpo: ler() }
        if (saldo < item.preco)
          return {
            status: 409,
            corpo: { error: { code: 'SALDO_INSUFICIENTE' }, preco: item.preco, saldo },
          }
        saldo -= item.preco
        pagas.add(item.id)
        gravar()
        return { status: 200, corpo: ler() }
      }
      return { status: 404, corpo: { error: { code: 'NOT_FOUND' } } }
    },
    /**
     * Um salvamento guardado no aparelho só foi aceito com as da galeria pagas: ao reabrir o
     * playground, elas continuam compradas (o serviço de verdade guarda as compras).
     */
    lembrarCompras(s: Salvamento | null) {
      for (const p of Object.values(s?.projetos ?? {}))
        for (const a of p?.aparencias ?? [])
          if (a.origem === 'galeria' && aparenciaDaGaleria(a.id)) pagas.add(a.id as IdDaGaleria)
      gravar()
    },
    /** O salvamento só passa com as da galeria pagas e no objeto delas. */
    aceita(s: Salvamento): boolean {
      return Object.entries(s.projetos).every(([objeto, p]) =>
        (p?.aparencias ?? []).every(
          (a) =>
            a.origem !== 'galeria' ||
            (aparenciaDaGaleria(a.id)?.objeto === objeto && pagas.has(a.id as IdDaGaleria)),
        ),
      )
    },
  }
}
