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
export function criarGaleriaFalsa(o: OpcoesDaGaleriaFalsa = {}) {
  let saldo = Math.max(0, Math.floor(o.moedas ?? MOEDAS_DE_EXEMPLO))
  const pagas = new Set<IdDaGaleria>()
  const chaves = new Set<string>()
  const ler = (): GaleriaDoJogador => ({ possuidas: [...pagas], saldo, ilimitado: false })
  return {
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
        if (pagas.has(item.id) || chaves.has(pedido.data.chave))
          return { status: 200, corpo: ler() }
        if (saldo < item.preco)
          return {
            status: 409,
            corpo: { error: { code: 'SALDO_INSUFICIENTE' }, preco: item.preco, saldo },
          }
        saldo -= item.preco
        pagas.add(item.id)
        chaves.add(pedido.data.chave)
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
