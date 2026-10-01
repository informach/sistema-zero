import { createHash } from 'node:crypto'

/** Precondition only: ownership always comes from the HttpOnly cookie. */
export const quizSessionToken = (leadId: string): string =>
  createHash('sha256').update(`quiz-session:${leadId}`).digest('hex')
