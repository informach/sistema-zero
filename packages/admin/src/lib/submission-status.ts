/**
 * Estado de uma entrega na fila do professor.
 *
 * Até 08/2026 só existiam dois estados, e "fechada" queria dizer **respondi um
 * recado**. Como a conversa só nasce quando a criança escreve algo no envio, a
 * entrega sem recado não tinha como sair da fila: não havia o que responder.
 * Agora o professor pode carimbar "já conferi" — e são coisas diferentes, então
 * a fila mostra as duas.
 */
export type SubmissionStatus = 'pending' | 'answered' | 'reviewed'

export interface SubmissionStatusInput {
  /** Há resposta do professor após o último envio. */
  answered: boolean
  /** O professor carimbou "já conferi" após o último envio. */
  reviewed: boolean
}

/**
 * ⚠️ PENDENTE = nem respondida nem conferida. Responder VENCE o carimbo: se o
 * professor escreveu para a criança, é isso que ele quer ver na lista (o carimbo
 * vira detalhe).
 */
export function submissionStatus(s: SubmissionStatusInput): SubmissionStatus {
  if (s.answered) return 'answered'
  if (s.reviewed) return 'reviewed'
  return 'pending'
}

export const SUBMISSION_STATUS_LABEL: Record<SubmissionStatus, string> = {
  pending: 'Pendente',
  answered: 'Respondida',
  reviewed: 'Conferida',
}

/** Só o que ainda pede atenção fica em destaque na lista. */
export function isSubmissionPending(s: SubmissionStatusInput): boolean {
  return submissionStatus(s) === 'pending'
}
