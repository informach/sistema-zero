import type { KidsSessionClaim } from '@sistemazero/core/security'
import { safeStudyDestination } from '@sistemazero/member-shell/lib/study-access'

/**
 * Para onde cada entrada leva. Puro e testável: as páginas de login e o formulário do
 * responsável só leem daqui. Os destinos aceitos são sempre INTERNOS e do público certo; um
 * `next` estranho cai no padrão em silêncio, como o `safeStudyDestination` da criança.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Destinos da área ADULTA (`/pais`, `/responsavel` e o que vive abaixo deles). */
export function safeParentDestination(value: string | null | undefined): string | null {
  if (!value || /[\\\r\n]/.test(value)) return null
  return /^\/(?:pais|responsavel)(?:\/|\?|$)/.test(value) ? value : null
}

/** Destino de estudo pedido no link (uma fase, o Estúdio…), ou `null` sem destino próprio. */
export function requestedStudyDestination(value: string | null | undefined): string | null {
  const destination = safeStudyDestination(value ?? null)
  return destination === '/' ? null : destination
}

/**
 * Depois do login do responsável: o `next` adulto, se veio um; senão a área dos pais. Quando
 * o link era de uma fase (área da criança), a área dos pais recebe `?aluno=` para orientar a
 * troca segura e levar a criança até lá depois. `child` é o atalho antigo de reautenticação.
 */
export function parentLoginDestination(search: string): string {
  const params = new URLSearchParams(search)
  const parent = safeParentDestination(params.get('next'))
  if (parent) return parent
  const target = new URLSearchParams()
  const child = params.get('child')
  if (child && UUID.test(child)) target.set('child', child)
  const study = requestedStudyDestination(params.get('next'))
  if (study) target.set('aluno', study)
  const query = target.toString()
  return query ? `/pais?${query}` : '/pais'
}

/** `/login` com sessão válida não pede a escolha de novo: cada público vai para o seu lugar. */
export function entryRedirect(
  session: { kids?: KidsSessionClaim | null; act?: unknown } | null,
  next: string | null | undefined,
): string | null {
  if (session?.kids?.kind === 'student') return safeStudyDestination(next ?? null)
  if (session?.kids?.kind === 'parent') return safeParentDestination(next) ?? '/pais'
  return session?.act ? '/' : null
}

/** Os cartões de `/login` levam o `next` adiante, cada um só com o que o seu público aceita. */
export function entryLinks(next: string | null | undefined): { student: string; parent: string } {
  const study = requestedStudyDestination(next)
  const parentNext = safeParentDestination(next) ?? study
  return {
    student: study ? `/login/aluno?next=${encodeURIComponent(study)}` : '/login/aluno',
    parent: parentNext
      ? `/login/responsavel?next=${encodeURIComponent(parentNext)}`
      : '/login/responsavel',
  }
}
