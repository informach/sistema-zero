import {
  type MoldeDeObjeto,
  MoldeDeObjetoSchema,
  type PedidoDeFerramenta,
  planificacaoDoMolde,
} from '@sistemazero/arquipelago-contracts'
import type { MoldaInitialModel } from '@sistemazero/molda'
import type { PintaInitialCanvas } from '@sistemazero/pinta'

/**
 * O molde de um objeto do Arquipélago (28/10/2026, o projeto azul do modo construção) traduzido
 * para o que o Pinta e o Molda de verdade entendem: a planificação da caixa no Pinta (cada face no
 * tamanho certo, a frente marcada) e a caixa do molde no Molda. O jogo guarda só o id da criação
 * que volta (`aparencia` do projeto azul); a planificação é a do contrato, então quem for desenhar
 * o objeto depois sabe onde cada face caiu.
 */

/** O nome da criação (o mesmo nome reabre a mesma criação na galeria). */
export function nomeDaCriacaoDoMolde(molde: MoldeDeObjeto): string {
  return `molde-${molde.objeto}`
}

/** A tela do Pinta: a planificação; `null` quando o modelo ainda não tem faces para pintar. */
export function telaDoPinta(molde: MoldeDeObjeto): PintaInitialCanvas | null {
  const planificacao = planificacaoDoMolde(molde)
  if (!planificacao) return null
  return {
    name: nomeDaCriacaoDoMolde(molde),
    width: planificacao.largura,
    height: planificacao.altura,
    guide: planificacao.faces.map((f) => ({
      x: f.x,
      y: f.y,
      width: f.largura,
      height: f.altura,
      ...(f.frente ? { marked: true } : {}),
    })),
  }
}

/** Unidades da grade do Molda por célula do jogo (a grade tem 32 de largura e de altura). */
export const UNIDADES_DO_MOLDA_POR_CELULA = 16
/** O maior lado da caixa na grade do Molda, com folga para a criança passar da caixa um pouco. */
const MAIOR_LADO_NA_GRADE = 30

/** A caixa do Molda: a do molde, na proporção dele, encolhida quando não cabe na grade. */
export function caixaDoMolda(molde: MoldeDeObjeto): MoldaInitialModel {
  const { largura, altura, fundo } = molde.caixa
  const escala = Math.min(
    UNIDADES_DO_MOLDA_POR_CELULA,
    MAIOR_LADO_NA_GRADE / Math.max(largura, fundo),
    MAIOR_LADO_NA_GRADE / altura,
  )
  return {
    name: nomeDaCriacaoDoMolde(molde),
    box: {
      width: largura * escala,
      height: altura * escala,
      depth: fundo * escala,
      name: molde.nome,
    },
  }
}

/** O pedido de aparência de um objeto (Pinta ou Molda com o molde), pronto para abrir. */
export type PedidoDeObjeto =
  | { ferramenta: 'pinta'; molde: MoldeDeObjeto; tela: PintaInitialCanvas }
  | { ferramenta: 'molda'; molde: MoldeDeObjeto; caixa: MoldaInitialModel }

/**
 * Lê o pedido do jogo: `null` quando não é de objeto (segue o caminho de sempre), o motivo da
 * recusa quando é de objeto mas não abre, ou o que a ferramenta precisa.
 */
export function lerPedidoDeObjeto(
  pedido: PedidoDeFerramenta,
): PedidoDeObjeto | { recusa: string } | null {
  if (pedido.proposito !== 'objeto') return null
  const lido = MoldeDeObjetoSchema.safeParse(pedido.molde)
  if (!lido.success) return { recusa: 'molde-invalido' }
  const molde = lido.data
  if (pedido.ferramenta === 'pinta') {
    const tela = telaDoPinta(molde)
    return tela ? { ferramenta: 'pinta', molde, tela } : { recusa: 'sem-faces' }
  }
  if (pedido.ferramenta === 'molda')
    return { ferramenta: 'molda', molde, caixa: caixaDoMolda(molde) }
  return { recusa: 'em-breve' }
}
