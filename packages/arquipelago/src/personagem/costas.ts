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
export const CLIPES_DEITADA = ['deitar', 'deitado', 'levantar_da_cama'] as const
/** Os clipes da arte do nado (o planador sai nadando, a partir da próxima entrega da arte). */
export const CLIPES_DO_NADO = ['nadar', 'boiar'] as const

export interface SituacaoDasCostas {
  /** Tem o planador e não está voando: o fardo vai nas costas. */
  planador: boolean
  /**
   * Os clipes da arte que valem agora (deitada, empurrando agachada, nadando): a peça que tem um
   * deles no `sai_nas_animacoes` (`offIn`) some, a de costas e o fardo.
   */
  clipes: readonly string[]
  /** Sentada num assento: o fardo sai (ele vai até 0,22 a 0,32 m para trás e o encosto o cortaria). */
  sentada: boolean
}

/** Os clipes da arte que valem agora, pelo que o corpo está fazendo. */
export function clipesDoCorpo(corpo: {
  deitada: boolean
  empurrandoComo: 'baixo' | 'meio' | 'alto' | null
  nadando: boolean
}): string[] {
  return [
    ...(corpo.deitada ? CLIPES_DEITADA : []),
    ...(corpo.empurrandoComo === 'baixo' ? ['empurrar_baixo'] : []),
    ...(corpo.empurrandoComo === 'meio' ? ['empurrar_meio'] : []),
    ...(corpo.nadando ? CLIPES_DO_NADO : []),
  ]
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
  const agora = new Set(situacao.clipes)
  const sai = (id: string) => catalogo.parts[id]?.offIn?.some((c) => agora.has(c)) ?? false
  let vestido = slots
  if (agora.size > 0) {
    const fica: AvatarSlots = {}
    for (const [slot, id] of Object.entries(slots)) if (!sai(id)) fica[slot] = id
    vestido = fica
  }
  // O fardo escolhe o arquivo pelas costas de antes de a peça sair (ela volta logo depois).
  const fardo =
    situacao.planador && !situacao.sentada && !sai(PLANADOR_DOBRADO)
      ? situationFor(catalogo, PLANADOR_DOBRADO, slots, SLOT_DAS_COSTAS)
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
