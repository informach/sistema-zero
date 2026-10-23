import { z } from 'zod'
import { getFunnelByKey, isQuizComplete } from '../funnels/registry'
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

const revisionOf = (value: unknown): number => (typeof value === 'number' ? value : 0)

/**
 * POST /api/leads/quiz-feedback — "Esse resultado parece com você?" no fim do resultado de um
 * quiz com perfil (Comunidade Kids e Comunidade adulta). Grava uma opinião por revisão e só para
 * o resultado completo que a pessoa está vendo agora.
 */
export async function quizFeedback(request: Request, deps: LeadDeps): Promise<Response> {
  const id = getLeadId(request)
  if (!id) return jsonError('Sem lead na sessão.', 401, 'NO_LEAD')
  const parsed = Feedback.safeParse(await safeJson(request))
  if (!parsed.success) return jsonError('Opinião inválida.', 400, 'BAD_REQUEST')
  const lead = await deps.repo.getLead(id)
  if (!lead) return jsonError('Lead não encontrado.', 404, 'NOT_FOUND')
  const quiz = getFunnelByKey(lead.funnel)?.content.quiz
  // Só os quizzes com resultado em carta pedem a opinião (o NCI não tem o formulário).
  if (!quiz?.conversa || !quiz.computePerfil)
    return jsonError('A sessão pertence a outro quiz.', 409, 'QUIZ_SESSION_CHANGED')
  const answers = lead.quizAnswers ?? {}
  const profile = isQuizComplete(quiz, answers) ? quiz.computePerfil(answers) : null
  if (
    !profile ||
    parsed.data.revision !== revisionOf(answers._quiz_revision) ||
    parsed.data.sessionToken !== quizSessionToken(id)
  )
    return jsonError('O resultado mudou. Atualize a página para continuar.', 409, 'QUIZ_CONFLICT')
  const branch = quiz.branchOf?.(answers) ?? null
  await deps.repo.insertEvent(
    id,
    'quiz_feedback',
    'resultado',
    {
      feedback: parsed.data.feedback,
      revision: parsed.data.revision,
      quiz_version: answers._quiz_version,
      perfil: profile,
      ...(branch ? { ramo: branch } : {}),
    },
    `${id}:feedback:${parsed.data.revision}:${parsed.data.feedback}`,
  )
  return json({ ok: true }, 201)
}
