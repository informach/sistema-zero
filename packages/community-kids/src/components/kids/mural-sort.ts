import type { HubThreadSort } from '@/lib/types'

/**
 * Os filtros do Mural (telas-modelo de 11/09/2026), cada um uma ORDEM de verdade no
 * hub: "Todos os jogos" é a de sempre (fixados primeiro, depois atividade), "Mais
 * jogados" ordena pelas jogadas do link público e "Novidades" pela publicação. O
 * "Da minha turma" da imagem ficou de fora: não existe turma no sistema.
 */
export type MuralSort = 'activity' | HubThreadSort

export const MURAL_SORTS: readonly { value: MuralSort; label: string }[] = [
  { value: 'activity', label: 'Todos os jogos' },
  { value: 'plays', label: 'Mais jogados' },
  { value: 'recent', label: 'Novidades' },
]

/**
 * O pedaço `sort=` da URL de tópicos. A ordem padrão é a AUSÊNCIA do parâmetro (o Clube
 * nunca o manda), e o cursor que o hub devolve já carrega a ordem: trocar de filtro é
 * recomeçar a lista, nunca continuar a de outro.
 */
export function sortQuery(sort: MuralSort, join: '?' | '&'): string {
  return sort === 'activity' ? '' : `${join}sort=${sort}`
}
