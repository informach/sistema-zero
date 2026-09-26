import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'

export interface HelpReturnTarget {
  href: string
  label: string
}

/**
 * Para onde o tutorial do "Como fazer" volta quando foi aberto de dentro de uma AULA.
 *
 * O caminho chega pela URL (`?voltar=`), então é ALLOWLIST, nunca um caminho livre (a mesma
 * régua do `resolveAvatarReturnPath`): só um caminho de aula das duas comunidades
 * (`/cursos/<slug>/aulas/<id>`, com hash de seção se houver) vira o botão "Voltar para a
 * aula". Qualquer outra coisa (outro host, `//`, uma rota qualquer) cai em `null`, e a página
 * mostra só a volta para a biblioteca.
 */
export function resolveHelpReturn(value: string | undefined | null): HelpReturnTarget | null {
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
  if (!isLessonPath(pathname) || !/^\/cursos\/[^/?]+\/aulas\/[^/?#]+$/.test(pathname ?? '')) {
    return null
  }
  const safeHash = hash && /^[A-Za-z0-9=_-]{1,120}$/.test(hash) ? `#${hash}` : ''
  return { href: `${pathname}${safeHash}`, label: 'Voltar para a aula' }
}
