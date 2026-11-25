/**
 * Lembretes do curso (25/11/2026): o curso comprado ou recebido de presente avisa quem não
 * começou (2 dias depois do acesso), quem parou no meio (7 dias sem atividade, uma vez) e quem
 * terminou (parabéns, apresentando a Comunidade dos Criadores). Ficam de fora a assinatura da
 * Comunidade e o Desafio do Primeiro Jogo (que tem os avisos `challenge-*`).
 */
export const COURSE_REMINDER_KINDS = [
  'course_not_started',
  'course_stalled',
  'course_completed',
] as const
export type CourseReminderKind = (typeof COURSE_REMINDER_KINDS)[number]

export interface CourseReminderCandidate {
  entitlementId: string
  /** A conta dona da matrícula (no Kids, o responsável; quem estuda pode ser um perfil dela). */
  accountId: string
  grantedAt: Date
  courseRef: string
  courseTitle: string
  audience: 'kids' | 'adult'
  /** `parents`: o guia dos pais, assistido pelo próprio responsável na área dos pais. */
  learner: 'child' | 'parents'
  /** Algum perfil da conta (ou a própria conta) já mexeu numa aula publicada do curso. */
  started: boolean
  /** Algum perfil da conta concluiu todas as aulas publicadas do curso. */
  completed: boolean
  /** A atividade mais recente da conta nas aulas do curso (navegação, progresso, conclusão). */
  lastActivityAt: Date | null
  /** Quando a última aula que faltava foi concluída (só com `completed`). */
  completedAt: Date | null
  /**
   * Os lembretes que a CONTA já recebeu deste curso, por qualquer matrícula dele (presente e
   * depois compra contam juntos): cada lembrete sai uma vez por conta e curso.
   */
  sentKinds: CourseReminderKind[]
}

/** Cursor da leitura em páginas (a matrícula mais antiga da página anterior). */
export interface CourseReminderCursor {
  grantedAt: Date
  entitlementId: string
}

export interface CourseRemindersRepository {
  /**
   * Matrículas ATIVAS de curso (compra única `payment` ou presente `manual` com `scholarship:`),
   * sem assinatura, fora do Desafio, que ainda não receberam o lembrete de conclusão, das mais
   * novas para as mais antigas, uma página de até `limit` depois de `after`, já com o progresso
   * da conta no curso. `next` = o cursor da próxima página (null na última): o ciclo lê TODAS,
   * para a matrícula antiga nunca ficar sem a vez.
   */
  listCandidates(
    now: Date,
    limit: number,
    after?: CourseReminderCursor | null,
  ): Promise<{ candidates: CourseReminderCandidate[]; next: CourseReminderCursor | null }>
  markSent(
    entitlementId: string,
    dedupeOn: string,
    kind: CourseReminderKind,
    now: Date,
  ): Promise<void>
}

/** A chave do dedupe em `entitlement_lifecycle_messages_sent.expires_on`: a data da concessão. */
export function courseReminderDedupeKey(grantedAt: Date): string {
  return grantedAt.toISOString().slice(0, 10)
}
