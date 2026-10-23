import type { LiveCohort, LiveUpdateCohort } from '@sistemazero/core/live'

/** Quem pode conduzir uma turma: a equipe do painel. */
export const TEACHER_ROLES = ['superadmin', 'admin', 'staff'] as const
export const MAX_TEACHERS = 4

export interface StaffUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: string
}

export function teacherDisplayName(user: Pick<StaffUser, 'firstName' | 'lastName' | 'email'>) {
  return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
}

/** O nome que a sala mostra: o primeiro nome, ou o começo do e-mail. */
export function teacherShortName(user: Pick<StaffUser, 'firstName' | 'email'>): string {
  const first = (user.firstName ?? '').trim().split(/\s+/)[0]
  return (first || user.email.split('@')[0] || 'Equipe').slice(0, 50)
}

/** As três páginas (um papel por consulta) viram uma lista só, sem repetir, em ordem de nome. */
export function mergeStaffPages(pages: readonly (readonly StaffUser[])[]): StaffUser[] {
  const byId = new Map<string, StaffUser>()
  for (const page of pages) for (const user of page) if (!byId.has(user.id)) byId.set(user.id, user)
  return [...byId.values()].sort((a, b) =>
    teacherDisplayName(a).localeCompare(teacherDisplayName(b), 'pt-BR'),
  )
}

/** Marcar respeita o teto de quatro; desmarcar nunca deixa a turma sem ninguém da equipe. */
export function toggleTeacher(selected: readonly string[], id: string, checked: boolean): string[] {
  if (checked)
    return selected.includes(id) || selected.length >= MAX_TEACHERS
      ? [...selected]
      : [...selected, id]
  const next = selected.filter((item) => item !== id)
  return next.length ? next : [...selected]
}

export type TeacherSelection =
  | { ok: true; teacherIds: string[]; teacherNames: Record<string, string> }
  | { ok: false; error: string }

/**
 * O que vai ao servidor: os ids (1 a 4, sem repetir) e o nome curto de cada professora que a
 * lista da equipe conhece. `known` cobre quem não veio na lista (a própria pessoa, se a
 * consulta da equipe falhou).
 */
export function teacherSelectionPayload(
  selected: readonly string[],
  users: readonly StaffUser[],
  known: Record<string, string> = {},
): TeacherSelection {
  const teacherIds = [...new Set(selected)]
  if (!teacherIds.length)
    return { ok: false, error: 'Escolha pelo menos uma pessoa para conduzir a turma.' }
  if (teacherIds.length > MAX_TEACHERS)
    return { ok: false, error: `Escolha até ${MAX_TEACHERS} pessoas para conduzir a turma.` }
  const teacherNames: Record<string, string> = {}
  for (const id of teacherIds) {
    const user = users.find((item) => item.id === id)
    const name = user ? teacherShortName(user) : known[id]
    if (name) teacherNames[id] = name
  }
  return { ok: true, teacherIds, teacherNames }
}

/** Só o que mudou vai no PATCH. `null` = nada para salvar. */
export function cohortPatch(
  cohort: Pick<LiveCohort, 'status' | 'teacherIds'>,
  next: { status: LiveCohort['status']; selection: Extract<TeacherSelection, { ok: true }> },
): LiveUpdateCohort | null {
  const body: LiveUpdateCohort = {}
  if (next.status !== cohort.status) body.status = next.status
  const sameTeachers =
    next.selection.teacherIds.length === cohort.teacherIds.length &&
    next.selection.teacherIds.every((id) => cohort.teacherIds.includes(id))
  if (!sameTeachers) {
    body.teacherIds = next.selection.teacherIds
    body.teacherNames = next.selection.teacherNames
  }
  return Object.keys(body).length ? body : null
}

export const COHORT_STATUS_LABEL: Record<LiveCohort['status'], string> = {
  draft: 'Rascunho',
  open: 'Inscrições abertas',
  closed: 'Inscrições encerradas',
  archived: 'Histórico',
}

/** Nome e e-mail do responsável, para a lista de inscrições. */
export interface FamilyAccount {
  id: string
  name: string
  email: string
}

export function familyLabel(account: FamilyAccount | undefined): string | null {
  if (!account) return null
  return account.name ? `${account.name} · ${account.email}` : account.email
}
