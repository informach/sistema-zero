import { isLessonPath } from './lesson-path'

export interface HelpReturnTarget {
  href: string
  label: string
  /** O curso e a aula do caminho, para a página buscar o nome da aula se quiser. */
  courseSlug: string
  lessonId: string
}

/**
 * Para onde o tutorial do "Como fazer" volta quando foi aberto de dentro de uma AULA (Kids e
 * adulto; cada app passa o próprio rótulo).
 *
 * O caminho chega pela URL (`?voltar=`), então é ALLOWLIST, nunca um caminho livre (a mesma
 * régua do `resolveAvatarReturnPath`): só um caminho de aula das duas comunidades
 * (`/cursos/<slug>/aulas/<id>`, com hash de seção se houver) vira o botão de voltar para a aula.
 * Qualquer outra coisa (outro host, `//`, uma rota qualquer) cai em `null`, e a página mostra só
 * a volta para a biblioteca.
 */
export function resolveHelpReturn(
  value: string | undefined | null,
  label: string,
): HelpReturnTarget | null {
  if (!value) return null
  let path: string
  try {
    path = decodeURIComponent(value)
  } catch {
    return null
  }
  // Caminho ABSOLUTO da mesma origem: sem esquema, sem `//host`, sem quebra de linha.
  if (!path.startsWith('/') || path.startsWith('//') || /[\s\\]/.test(path)) return null
  const [pathname, hash] = path.split('#', 2)
  // Slug do curso e id da aula: só letras, números, `_` e `-` (nem `.` nem `..`: o navegador
  // normalizaria `/cursos/../aulas/x` para outra rota, e o botão prometeria uma aula).
  const match = /^\/cursos\/([A-Za-z0-9_-]+)\/aulas\/([A-Za-z0-9_-]+)$/.exec(pathname ?? '')
  if (!isLessonPath(pathname) || !match) return null
  const safeHash = hash && /^[A-Za-z0-9=_-]{1,120}$/.test(hash) ? `#${hash}` : ''
  return {
    href: `${pathname}${safeHash}`,
    label,
    courseSlug: match[1] ?? '',
    lessonId: match[2] ?? '',
  }
}
