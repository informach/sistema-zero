import { z } from 'zod'
import { humor } from './colheita'
import type { IlhaId } from './ilhas'
import { numeroEstavel } from './numero-estavel'
import {
  PEDIDOS_DA_CAPI,
  PEDIDOS_DO_ANEL,
  PEDIDOS_DO_BENTO,
  type PedidoDeMorador,
} from './pedidos-catalogo'
import {
  cestaDoMorador,
  type Receita,
  receitasDoMorador,
  receitasNovasDoMorador,
} from './receitas-moradores'
import {
  AMIZADE_MAXIMA,
  BICHOS_DO_BOSQUE,
  SALVAMENTO_MAX_BYTES,
  type Salvamento,
} from './salvamento'

export const MORADORES_DOS_PEDIDOS = ['capi', 'bento', 'mare', 'floco', 'jade', 'irie'] as const
export const MoradorDoPedidoSchema = z.enum(MORADORES_DOS_PEDIDOS)
export type MoradorDoPedido = z.infer<typeof MoradorDoPedidoSchema>
export const ILHA_DO_PEDIDO = {
  capi: 'bosque',
  bento: 'vila-doce',
  mare: 'recife',
  floco: 'pico',
  jade: 'vale-dos-dinos',
  irie: 'nuvens',
} as const satisfies Record<MoradorDoPedido, IlhaId>
export const AMIZADE_DO_PEDIDO = 30
export const MOEDAS_DO_PEDIDO = 3

export function pedidoDoMoradorPeloId(quem: MoradorDoPedido, id: string): PedidoDeMorador | null {
  if (quem === 'capi') {
    // IDs anteriores sem quantidade válida nunca autorizam prêmio.
    if (/^achar-bicho-[0-3]$/.test(id)) return { id, texto: 'Achar mais um bicho escondido' }
    return PEDIDOS_DA_CAPI.find((p) => p.id === id) ?? null
  }
  const lista: readonly PedidoDeMorador[] =
    quem === 'bento' ? PEDIDOS_DO_BENTO : PEDIDOS_DO_ANEL[quem]
  return lista.find((p) => p.id === id) ?? null
}

/** Mantém o sorteio e a identidade dos pedidos já usados nas conversas. */
export function escolherPedidoDoMorador(
  quem: MoradorDoPedido,
  perfil: string,
  dia: string,
  achados: number,
  haBichoEscondido = achados < BICHOS_DO_BOSQUE.length,
): string {
  const lista: readonly PedidoDeMorador[] =
    quem === 'capi' ? PEDIDOS_DA_CAPI : quem === 'bento' ? PEDIDOS_DO_BENTO : PEDIDOS_DO_ANEL[quem]
  const opcoes = lista.map((p) => p.id)
  if (
    quem === 'capi' &&
    haBichoEscondido &&
    Number.isInteger(achados) &&
    achados >= 0 &&
    achados < BICHOS_DO_BOSQUE.length
  )
    opcoes.push(`achar-bicho-${achados}`)
  const semente = quem === 'capi' ? `${perfil}:${dia}` : `${quem}:${perfil}:${dia}`
  return opcoes[numeroEstavel(semente) % opcoes.length]!
}

export function cestaDiariaDoBento(amizade: number, dia: string): Receita | null {
  const sabidas = receitasDoMorador('bento', amizade)
  return sabidas.length ? sabidas[numeroEstavel(`cesta:${dia}`) % sabidas.length]! : null
}

export type EntregaDoPedido =
  | {
      ok: false
      motivo:
        | 'pedido-indisponivel'
        | 'faltam-itens'
        | 'falta-bicho'
        | 'mochila-cheia'
        | 'salvamento-cheio'
    }
  | { ok: true; salvamento: Salvamento; moedas: 3 | 4; novas: Receita[]; cesta: Receita | null }

/** A mesma transição serve à prévia local e à confirmação do serviço. Não toca na carteira. */
export function prepararEntregaDoPedido(
  s: Salvamento,
  quem: MoradorDoPedido,
  dia: string,
): EntregaDoPedido {
  const antes = s.moradores[quem]
  const p = antes.pedido
  if (!p || p.entregue || p.dia !== dia || !z.iso.date().safeParse(dia).success)
    return { ok: false, motivo: 'pedido-indisponivel' }
  const pedido = pedidoDoMoradorPeloId(quem, p.id)
  if (!pedido) return { ok: false, motivo: 'pedido-indisponivel' }
  if (!pedido.itens && s.bichos.achados.length <= Number(p.id.slice('achar-bicho-'.length)))
    return { ok: false, motivo: 'falta-bicho' }
  const inventario = { ...s.inventario }
  for (const [id, qtd] of Object.entries(pedido.itens ?? {})) {
    if ((inventario[id] ?? 0) < qtd) return { ok: false, motivo: 'faltam-itens' }
    const restante = (inventario[id] ?? 0) - qtd
    if (restante) inventario[id] = restante
    else delete inventario[id]
  }
  const morador = {
    ...antes,
    amizade: Math.min(AMIZADE_MAXIMA, antes.amizade + AMIZADE_DO_PEDIDO),
    pedido: { ...p, entregue: true },
  }
  const novas = quem === 'capi' ? [] : receitasNovasDoMorador(quem, antes.amizade, morador.amizade)
  const cesta =
    quem === 'bento' && novas.length === 0 ? cestaDiariaDoBento(morador.amizade, dia) : null
  const ingredientes: Record<string, number> = {}
  const somar = (conjunto: Readonly<Record<string, number>>) => {
    for (const [id, qtd] of Object.entries(conjunto))
      ingredientes[id] = (ingredientes[id] ?? 0) + qtd
  }
  if (quem === 'bento') {
    for (const r of novas) somar(r.precisa)
    if (cesta) somar(cesta.precisa)
  } else if (quem !== 'capi') somar(cestaDoMorador(quem, morador.amizade))
  for (const [id, qtd] of Object.entries(ingredientes)) {
    const total = (inventario[id] ?? 0) + qtd
    if (total > 999) return { ok: false, motivo: 'mochila-cheia' }
    inventario[id] = total
  }
  const salvamento: Salvamento = {
    ...s,
    inventario,
    moradores: { ...s.moradores, [quem]: morador },
  }
  if (new TextEncoder().encode(JSON.stringify(salvamento)).byteLength > SALVAMENTO_MAX_BYTES)
    return { ok: false, motivo: 'salvamento-cheio' }
  return {
    ok: true,
    salvamento,
    moedas: humor(s.necessidades) === 'otimo' ? 4 : MOEDAS_DO_PEDIDO,
    novas,
    cesta,
  }
}
