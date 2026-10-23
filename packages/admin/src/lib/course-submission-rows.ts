/**
 * Uma linha da aba "Entregas" do curso, montada CAMPO A CAMPO a partir da entrega do members e da
 * identidade hidratada do auth. Pura de propósito: campo novo do members que não entra aqui some
 * da tela em silêncio (foi o que aconteceu com o selo "falado" até o full review de 14/10/2026).
 */
export interface CourseSubmissionSource {
  userId: string
  blockId: string
  lessonId: string
  lessonTitle: string
  moduleTitle: string
  submittedAt: string
  /** Recado opcional do aluno ao professor. `null` = sem recado. */
  message: string | null
  /** O recado veio da fala transcrita. OPCIONAL: members antigo não manda. */
  messageSpoken?: boolean
}

export function toCourseSubmissionRow<I extends object>(s: CourseSubmissionSource, identity: I) {
  return {
    userId: s.userId,
    blockId: s.blockId,
    lessonId: s.lessonId,
    lessonTitle: s.lessonTitle,
    moduleTitle: s.moduleTitle,
    submittedAt: s.submittedAt,
    ...identity,
    message: s.message,
    messageSpoken: s.messageSpoken === true,
  }
}
