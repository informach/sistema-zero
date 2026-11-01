/**
 * `…/cursos/<curso>/aulas/<aula>` do Kids (um endereço inteiro ou só o caminho) vira o caminho
 * da mesma aula no palco, `/aulas/<curso>/<aula>`. Nulo quando não é o endereço de uma aula.
 */
export function lessonPathOf(address: string): string | null {
  const match = /\/cursos\/([^/?#\s]+)\/aulas\/([^/?#\s]+)/.exec(address.trim())
  if (!match?.[1] || !match[2]) return null
  const decode = (part: string): string | null => {
    try {
      return decodeURIComponent(part)
    } catch {
      return null
    }
  }
  const slug = decode(match[1])
  const lessonId = decode(match[2])
  if (!slug || !lessonId) return null
  return `/aulas/${encodeURIComponent(slug)}/${encodeURIComponent(lessonId)}`
}
