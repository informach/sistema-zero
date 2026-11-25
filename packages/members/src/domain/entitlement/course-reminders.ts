import type {
  CourseReminderCandidate,
  CourseReminderKind,
} from '../ports/course-reminders-repository.port'

const DAY_MS = 86_400_000
/** Não começou: o lembrete sai 2 dias depois do acesso. */
export const COURSE_NOT_STARTED_AFTER_MS = 2 * DAY_MS
/** Parou no meio: 7 dias sem atividade nas aulas do curso. */
export const COURSE_STALLED_AFTER_MS = 7 * DAY_MS

/**
 * O lembrete que cabe agora, ou nenhum. Cada um sai uma vez por matrícula e só dentro da janela
 * (`windowMs`, a mesma de 72 h dos avisos de fim do acesso) a partir do momento em que passou a
 * valer: ciclos perdidos são cobertos e a estreia do job não manda lembrete de coisa antiga.
 * - concluiu: o parabéns, até `windowMs` depois da conclusão (concluído não recebe os outros);
 * - não começou: 2 dias depois do acesso;
 * - começou e parou: 7 dias depois da última atividade.
 */
export function dueCourseReminder(
  candidate: CourseReminderCandidate,
  now: Date,
  windowMs: number,
): CourseReminderKind | null {
  const sent = new Set(candidate.sentKinds)
  const inWindow = (since: Date) => {
    const elapsed = now.getTime() - since.getTime()
    return elapsed >= 0 && elapsed < windowMs
  }
  if (candidate.completed) {
    if (sent.has('course_completed') || !candidate.completedAt) return null
    return inWindow(candidate.completedAt) ? 'course_completed' : null
  }
  if (!candidate.started) {
    if (sent.has('course_not_started')) return null
    return inWindow(new Date(candidate.grantedAt.getTime() + COURSE_NOT_STARTED_AFTER_MS))
      ? 'course_not_started'
      : null
  }
  if (sent.has('course_stalled') || !candidate.lastActivityAt) return null
  return inWindow(new Date(candidate.lastActivityAt.getTime() + COURSE_STALLED_AFTER_MS))
    ? 'course_stalled'
    : null
}

/**
 * Uma conta com mais de uma matrícula do mesmo curso (presente e depois compra) recebe um
 * lembrete só: vale a matrícula mais nova, levando os lembretes que qualquer uma já recebeu.
 */
export function oneCandidatePerCourse(
  candidates: CourseReminderCandidate[],
): CourseReminderCandidate[] {
  const byKey = new Map<string, CourseReminderCandidate>()
  for (const candidate of candidates) {
    const key = `${candidate.accountId}|${candidate.courseRef}`
    const current = byKey.get(key)
    if (!current) {
      byKey.set(key, candidate)
      continue
    }
    const newer = candidate.grantedAt > current.grantedAt ? candidate : current
    byKey.set(key, {
      ...newer,
      sentKinds: [...new Set([...current.sentKinds, ...candidate.sentKinds])],
    })
  }
  return [...byKey.values()]
}
