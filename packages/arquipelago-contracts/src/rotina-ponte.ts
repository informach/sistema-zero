import { CartasDoJogadorSchema } from './api'
import type { PedidoDeFerramenta, ResultadoDeFerramenta } from './plataforma'
import {
  conferirResultadoDaRotina,
  type MoldeDaRotina,
  MoldeDaRotinaSchema,
  type ResultadoDaFerramentaRotina,
} from './rotina-ferramenta'

export type LerCartasDaRotina = () => Promise<{ status: number; corpo: unknown }>
export async function cartasDaRotina(ler: LerCartasDaRotina) {
  const r = await ler()
  if (r.status !== 200) throw Error('Não deu para conferir seus blocos agora. Tente novamente.')
  return CartasDoJogadorSchema.parse(r.corpo)
}

/** Só o serviço concede blocos. Os dados enviados pelo jogo não substituem a leitura. */
export async function abrirRotinaNaPlataforma(
  pedido: PedidoDeFerramenta,
  ler: LerCartasDaRotina,
  exibir: (molde: MoldeDaRotina) => Promise<ResultadoDaFerramentaRotina | null>,
): Promise<ResultadoDeFerramenta> {
  const lido = MoldeDaRotinaSchema.safeParse(pedido.molde)
  if (pedido.ferramenta !== 'rotina-lumi' || pedido.proposito !== 'rotina' || !lido.success)
    return { situacao: 'indisponivel', motivo: 'molde-invalido' }
  try {
    const molde = { ...lido.data, cartas: await cartasDaRotina(ler) }
    const resultado = await exibir(molde)
    if (!resultado) return { situacao: 'cancelado' }
    const atual = { ...molde, cartas: await cartasDaRotina(ler) }
    const r = conferirResultadoDaRotina(atual, resultado)
    return 'motivo' in r
      ? { situacao: 'indisponivel', motivo: r.motivo }
      : { situacao: 'rotina-pronta', resultado: r.resultado }
  } catch {
    return { situacao: 'indisponivel', motivo: 'cartas-indisponiveis' }
  }
}
