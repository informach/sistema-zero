/**
 * O que vai nas costas do avatar no jogo (regra pura): o planador dobrado, quando a criança tem o
 * planador e não está voando, e as peças que somem em certas animações (a mochila, deitada).
 *
 * O planador é uma peça só do jogo (slot `planador`, fora da loja) com um arquivo por situação: o
 * core escolhe pela peça de costas vestida (`situationFor`: atrás da mochila, por cima da capa, com a
 * alça alta por cima do casaco) e diz quando ele não aparece (debaixo de um cabelo comprido).
 */
import {
  AVATAR_CATALOG,
  type AvatarCatalog,
  type AvatarSlots,
  situationFor,
} from '@sistemazero/avatar-quarto/avatar/pack-catalog'

/** A peça do planador dobrado no catálogo do avatar. */
export const PLANADOR_DOBRADO = 'planador_dobrado'
/** O encaixe das peças de costas (a mochila, a capa). */
const SLOT_DAS_COSTAS = 'costas'
/** Os clipes da arte em que a criança está deitada (o `sai_nas_animacoes` das peças de costas). */
const CLIPES_DEITADA = ['deitar', 'deitado', 'levantar_da_cama'] as const

export interface SituacaoDasCostas {
  /** Tem o planador e não está voando: o fardo vai nas costas. */
  planador: boolean
  /** Deitada ou levantando da cama (o fardo e a mochila saem). */
  deitada: boolean
  /** Sentada num assento: o fardo sai (ele vai até 0,22 a 0,31 m para trás e o encosto o cortaria). */
  sentada: boolean
}

/**
 * As peças do desenho com o que vai nas costas, e qual peça manda o braço sair da frente dela
 * (`armLayers`): a de costas vestida ou, sem nada nas costas, o planador.
 */
export function vestirAsCostas(
  slots: AvatarSlots,
  situacao: SituacaoDasCostas,
  catalogo: AvatarCatalog = AVATAR_CATALOG,
): { slots: AvatarSlots; bracoDasCostas: string | null } {
  let vestido = slots
  if (situacao.deitada) {
    const fica: AvatarSlots = {}
    for (const [slot, id] of Object.entries(slots)) {
      const some = catalogo.parts[id]?.offIn?.some((c) =>
        (CLIPES_DEITADA as readonly string[]).includes(c),
      )
      if (!some) fica[slot] = id
    }
    vestido = fica
  }
  const fardo =
    situacao.planador && !situacao.deitada && !situacao.sentada
      ? situationFor(catalogo, PLANADOR_DOBRADO, vestido, SLOT_DAS_COSTAS)
      : null
  const slotDoFardo = catalogo.parts[PLANADOR_DOBRADO]?.slot ?? 'planador'
  const final = fardo ? { ...vestido, [slotDoFardo]: fardo } : vestido
  const costas = final[SLOT_DAS_COSTAS]
  const braco =
    costas && catalogo.parts[costas]?.armLayers
      ? costas
      : fardo && !costas && catalogo.parts[PLANADOR_DOBRADO]?.armLayers
        ? PLANADOR_DOBRADO
        : null
  return { slots: final, bracoDasCostas: braco }
}
