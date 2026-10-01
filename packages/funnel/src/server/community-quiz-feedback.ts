import { z } from 'zod'
import {
  communityDecision,
  QUIZ_VERSION,
  quizRevision,
} from '../funnels/comunidade-dos-criadores/quiz/engine'
import { json, jsonError, safeJson } from '../lib/http'
import { getLeadId } from '../lib/lead-session'
import type { LeadDeps } from './leads'
import { quizSessionToken } from './quiz-session'

const Feedback = z
  .object({
    feedback: z.enum(['sim', 'em_parte', 'nao_representa']),
    revision: z.number().int().nonnegative(),
    sessionToken: z.string().length(64),
  })
  .strict()

export async function communityQuizFeedback(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const parsed = Feedback.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Opinião inválida.', 400, 'BAD_REQUEST')
  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  if (lead.funnel !== 'kids/comunidade-dos-criadores')
    return jsonError('A sessão pertence a outro quiz.', 409, 'QUIZ_SESSION_CHANGED')
  const answers = lead.quizAnswers ?? {}
  const decision = communityDecision(answers)
  if (
    !decision ||
    parsed.data.revision !== quizRevision(answers) ||
    parsed.data.sessionToken !== quizSessionToken(id)
  )
    return jsonError('O resultado mudou. Atualize a página para continuar.', 409, 'QUIZ_CONFLICT')
  await deps.repo.insertEvent(
    id,
    'quiz_feedback',
    'resultado',
    {
      feedback: parsed.data.feedback,
      revision: parsed.data.revision,
      quiz_version: QUIZ_VERSION,
      perfil_principal: decision.profile,
      estado: decision.state,
    },
    `${id}:feedback:${parsed.data.revision}:${parsed.data.feedback}`,
  )
  return json({ ok: true }, 201)
}
