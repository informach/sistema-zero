import {
  BICHOS_DO_BOSQUE,
  type BichoDoBosque,
  type Capi,
  prepararEntregaDoPedido,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'
import { adotar, motivoDoNome, receberPresenteDosBichos } from './bichos'
import { FALA_DA_PAGINA, ganhouAPagina } from './diario'
import { escondidos } from './esconde'
import {
  FALA_DO_PRESENTE_DOS_BICHOS,
  FALA_DO_PRESENTE_SEM_ESPACO,
  falasDaCapi,
} from './falas-da-capi'
import { ITENS, quantidade } from './itens'
import {
  conversar,
  coracoes,
  darPresente,
  ehAniversario,
  pedidoDoDia,
  pedidoPeloId,
  podeEntregar,
  type ReacaoAoPresente,
} from './moradores'

/**
 * A conversa com a Capi sobre o salvamento inteiro (o que o painel chama). Junta as regras de
 * `moradores.ts` com os achados e o bicho adotado, e devolve o salvamento novo e o que ela diz.
 */

/**
 * As falas com a entrega da página do diário da Íris no fim, se a amizade acabou de chegar aos
 * corações da página (`sistemas/diario.ts`).
 */
function comAPagina(antes: Capi, depois: Capi, falas: readonly string[]): string[] {
  return ganhouAPagina(antes, depois) ? [...falas, ...FALA_DA_PAGINA] : [...falas]
}

/** Um número do dia para escolher a fala dentro do nível (muda todo dia, igual o dia inteiro). */
export function escolhaDoDia(dia: string): number {
  return Number(dia.replaceAll('-', '')) || 0
}

/** O texto do pedido de hoje, se ainda não foi entregue. */
export function pedidoDeHoje(s: Salvamento, dia: string): string | null {
  const p = s.moradores.capi.pedido
  if (!p || p.dia !== dia || p.entregue) return null
  return pedidoPeloId(p.id)?.texto ?? null
}

/**
 * Abrir a conversa: sorteia o pedido de hoje (se ainda não houver), conta a conversa do dia e
 * monta as falas.
 */
export function comecarConversa(
  s: Salvamento,
  dia: string,
  perfilId: string,
): { salvamento: Salvamento; falas: string[] } {
  const antes = s.moradores.capi
  const achados = s.bichos.achados.length
  const comPedido = pedidoDoDia(antes, dia, perfilId, achados, escondidos(s.bichos).length)
  const { capi, primeiraDoDia } = conversar(comPedido, dia)
  const salvamento: Salvamento = { ...s, moradores: { ...s.moradores, capi } }
  const falas = comAPagina(
    antes,
    capi,
    falasDaCapi(
      {
        coracoes: coracoes(capi.amizade),
        primeiroEncontro: antes.conversaEm === null,
        primeiraDoDia,
        aniversario: ehAniversario(dia),
        achados,
        total: BICHOS_DO_BOSQUE.length,
        adotado: s.bichos.adotado?.nome ?? null,
        pedido: pedidoDeHoje(salvamento, dia),
      },
      escolhaDoDia(dia),
    ),
  )
  const presente = receberPresenteDosBichos(salvamento)
  if (presente.resultado === 'entregue') falas.push(...FALA_DO_PRESENTE_DOS_BICHOS)
  else if (presente.resultado === 'sem-espaco') falas.push(FALA_DO_PRESENTE_SEM_ESPACO)
  return { salvamento: presente.salvamento, falas }
}

export const FALA_DO_PRESENTE: Readonly<Record<ReacaoAoPresente, string>> = {
  adorou: 'Esse é dos que eu mais gosto. Obrigada, de coração.',
  agradeceu: 'Que gentil. Vou guardar para o lanche da tarde.',
  devolveu: 'Isso eu não sei usar. Fica com você, que vai ser mais útil.',
  'ja-ganhou-hoje': 'Hoje eu já ganhei presente. Guarde esse para amanhã.',
  'sem-item': 'Acho que isso acabou na sua mochila.',
}

/** Dar um presente pelo painel. */
export function presentear(
  s: Salvamento,
  itemId: string,
  dia: string,
): { salvamento: Salvamento; reacao: ReacaoAoPresente; falas: string[] } {
  const r = darPresente(s.moradores.capi, s.inventario, itemId, dia)
  const ganhou = r.reacao === 'adorou' || r.reacao === 'agradeceu'
  const fala =
    ganhou && ehAniversario(dia)
      ? `${FALA_DO_PRESENTE[r.reacao]} E no meu aniversário, ainda por cima.`
      : FALA_DO_PRESENTE[r.reacao]
  if (!ganhou) return { salvamento: s, reacao: r.reacao, falas: [fala] }
  return {
    salvamento: { ...s, inventario: r.inv, moradores: { ...s.moradores, capi: r.capi } },
    reacao: r.reacao,
    falas: comAPagina(s.moradores.capi, r.capi, [fala]),
  }
}

export const FALA_DA_ENTREGA = 'Era isso mesmo que eu precisava. Obrigada, você ajudou muito.'

/** Entregar o pedido de hoje pelo painel. */
export function entregar(s: Salvamento): {
  salvamento: Salvamento
  entregou: boolean
  falas: string[]
} {
  const r = prepararEntregaDoPedido(s, 'capi', s.moradores.capi.pedido?.dia ?? '')
  if (!r.ok) return { salvamento: s, entregou: false, falas: [] }
  return {
    salvamento: r.salvamento,
    entregou: true,
    falas: comAPagina(s.moradores.capi, r.salvamento.moradores.capi, [FALA_DA_ENTREGA]),
  }
}

/** O que ainda falta para o pedido de hoje, para mostrar embaixo dele (`null` = nada a fazer). */
export function oQueFaltaNoPedido(s: Salvamento): string | null {
  const capi = s.moradores.capi
  const pedido = capi.pedido && !capi.pedido.entregue ? pedidoPeloId(capi.pedido.id) : null
  if (!pedido || podeEntregar(capi, s.inventario, s.bichos.achados.length)) return null
  if (!pedido.itens) return 'Ache mais um bicho escondido no bosque.'
  return Object.entries(pedido.itens)
    .filter(([id, qtd]) => quantidade(s.inventario, id) < qtd)
    .map(
      ([id, qtd]) => `${ITENS[id]?.nome ?? id}: você tem ${quantidade(s.inventario, id)} de ${qtd}`,
    )
    .join('. ')
}

/** A Capi oferece adotar depois do primeiro bicho achado, enquanto nenhum foi adotado. */
export function podeAdotar(s: Salvamento): boolean {
  return s.bichos.achados.length > 0 && s.bichos.adotado === null
}

/**
 * Adotar pela conversa: o bicho achado ganha o nome e vai com a criança. Com nome que não serve,
 * nada muda e volta o motivo (a frase para mostrar embaixo do campo).
 */
export function adotarPelaCapi(
  s: Salvamento,
  bicho: BichoDoBosque,
  nome: string,
): { salvamento: Salvamento; fala: string } | { motivo: string } {
  const motivo = motivoDoNome(nome)
  if (motivo) return { motivo }
  const bichos = adotar(s.bichos, bicho, nome)
  if (!bichos?.adotado) return { motivo: 'Esse bicho não está no cercadinho.' }
  return {
    // O bicho adotado vira a companhia (S01): ele vai junto, como sempre foi.
    salvamento: { ...s, bichos, companhia: 'adotado' },
    fala: `${bichos.adotado.nome} já gostou de você e vai junto para casa. Cuide com carinho.`,
  }
}
