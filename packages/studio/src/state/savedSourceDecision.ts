/**
 * Manter o CSS ou o HTML salvo no lugar do gerado pelos blocos (C5 da revisão de 20/11/2026).
 *
 * Abrir não é editar: o arquivo salvo que difere do gerado só na ORDEM (declarações CSS que não
 * mexem na mesma propriedade, atributos de um elemento) fica como está, e abrir não regrava nada.
 * Até aqui a mesma conferência rodava em TODA edição, o que tinha dois defeitos:
 * - uma edição que muda o arquivo gerado só na ordem (a criança trocou dois blocos de CSS de
 *   lugar) era ignorada: o código seguia na ordem antiga;
 * - o HTML era analisado duas vezes pelo `DOMParser` a cada edição, sem mudar o resultado.
 *
 * A decisão agora é lembrada por par (gerado, salvo). Ela só é tomada de novo ao abrir, ou quando
 * um dos dois textos mudou sem que a edição tenha mudado o gerado (o código da Ponte, por exemplo).
 * Uma edição que muda o gerado vale como a criança fez.
 */
export interface SavedSourceDecision {
  /** O arquivo que os blocos geraram. */
  canonical: string
  /** O arquivo salvo no projeto naquele momento. */
  saved: string
  /** Manter o salvo no lugar do gerado. */
  keep: boolean
}

export function decideSavedSource(input: {
  previous: SavedSourceDecision | null
  canonical: string
  saved: string | undefined
  /** A carga dos blocos (abrir o projeto), não uma edição. */
  opening: boolean
  compatible(saved: string, canonical: string): boolean
}): SavedSourceDecision | null {
  const { previous, canonical, saved, opening } = input
  if (saved === undefined) return null
  if (previous && previous.canonical === canonical && previous.saved === saved) return previous
  if (!opening && previous && previous.canonical !== canonical)
    return { canonical, saved, keep: false }
  return { canonical, saved, keep: input.compatible(saved, canonical) }
}
