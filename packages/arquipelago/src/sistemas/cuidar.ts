import type { BichoAdotado, Salvamento } from '@sistemazero/arquipelago-contracts'
import {
  alimentar,
  CUIDADO,
  contarDiaCuidado,
  crescer,
  darBanho,
  ensinar,
  fazerCarinho,
  fazTruque,
  podeCrescer,
  TRUQUE,
} from './bichos'
import { ITENS, quantidade } from './itens'

/**
 * Cuidar do bicho adotado pelo painel (sobre o salvamento inteiro). Cada cuidado conta para o dia
 * bem cuidado e, com dias suficientes, o filhote cresce na hora. As falas usam o nome e nenhum
 * pronome: é a criança quem decide quem o bicho é.
 */

export type Cuidado =
  | { tipo: 'comida'; itemId: string }
  | { tipo: 'banho' }
  | { tipo: 'carinho' }
  | { tipo: 'ensinar' }
  | { tipo: 'truque' }

/** O que o bicho faz no mundo depois do cuidado (o clipe do modelo). */
export type ReacaoDoBicho = 'feliz' | 'truque' | null

/** Como cada bicho mostra o truque, na fala. */
export const TRUQUE_FEITO: Readonly<Record<BichoAdotado['id'], string>> = {
  cachorro: 'deu a pata',
  gato: 'rolou no chão',
  coelho: 'deu um pulinho',
  porquinho: 'girou em volta de si',
}

export function cuidar(
  s: Salvamento,
  cuidado: Cuidado,
  dia: string,
): { salvamento: Salvamento; falas: string[]; reacao: ReacaoDoBicho; cresceu: boolean } {
  const antes = s.bichos.adotado
  if (!antes) return { salvamento: s, falas: [], reacao: null, cresceu: false }
  const nome = antes.nome
  let bicho: BichoAdotado = antes
  let inventario = s.inventario
  let reacao: ReacaoDoBicho = 'feliz'
  const falas: string[] = []

  if (cuidado.tipo === 'comida') {
    const r = alimentar(bicho, inventario, cuidado.itemId)
    if (!r) {
      const semItem = quantidade(inventario, cuidado.itemId) < 1
      const fala = semItem
        ? 'Essa comida acabou na mochila. A horta dá alface, tomate e milho.'
        : 'Isso não é comida de bicho.'
      return { salvamento: s, falas: [fala], reacao: null, cresceu: false }
    }
    bicho = r.bicho
    inventario = r.inv
    falas.push(
      `${nome} comeu ${ITENS[cuidado.itemId]?.nome.toLowerCase() ?? 'tudo'} e lambeu o focinho.`,
    )
  } else if (cuidado.tipo === 'banho') {
    bicho = darBanho(bicho)
    falas.push(`${nome} sacudiu a água e ficou com o pelo cheiroso.`)
  } else if (cuidado.tipo === 'carinho') {
    bicho = fazerCarinho(bicho)
    falas.push(`${nome} fechou os olhos de tão bom.`)
  } else if (cuidado.tipo === 'ensinar') {
    const r = ensinar(bicho, dia)
    bicho = r.bicho
    const truque = TRUQUE[bicho.id]
    const faltam = CUIDADO.sessoesDoTruque - bicho.truque.sessoes
    if (r.resultado === 'aprendeu') {
      falas.push(`${nome} aprendeu a ${truque}. Agora é só pedir.`)
      reacao = 'truque'
    } else if (r.resultado === 'mais-uma') {
      falas.push(
        `${nome} está aprendendo a ${truque}. ${faltam === 1 ? 'Falta uma aula' : `Faltam ${faltam} aulas`}, uma por dia.`,
      )
    } else if (r.resultado === 'ja-hoje') {
      falas.push('Por hoje chega de aula. Amanhã tem mais.')
      reacao = null
    } else if (r.resultado === 'precisa-cuidado') {
      falas.push(`Antes da aula, ${nome} precisa de comida, banho e carinho.`)
      reacao = null
    } else {
      falas.push(`${nome} já sabe ${truque}. É só pedir.`)
      reacao = null
    }
  } else {
    if (fazTruque(bicho)) {
      falas.push(`${nome} ${TRUQUE_FEITO[bicho.id]}.`)
      reacao = 'truque'
    } else if (!bicho.truque.aprendido) {
      falas.push(`${nome} ainda não aprendeu o truque. Uma aula por dia ensina.`)
      reacao = null
    } else {
      falas.push(`${nome} está sem vontade agora. Um pouco de cuidado ajuda.`)
      reacao = null
    }
  }

  bicho = contarDiaCuidado(bicho, dia)
  const cresceu = podeCrescer(bicho)
  if (cresceu) {
    bicho = crescer(bicho)
    falas.push(`${nome} cresceu e agora é um bicho adulto. Que festa.`)
    reacao = 'feliz'
  }
  return {
    salvamento: { ...s, inventario, bichos: { ...s.bichos, adotado: bicho } },
    falas,
    reacao,
    cresceu,
  }
}
