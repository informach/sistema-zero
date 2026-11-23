/**
 * O que o palco responde a cada rota da aula (`/api/members/lessons/:aula/...`), o mesmo
 * caminho que os componentes do Kids chamam. Nada vai para a conta: as escritas recebem a
 * resposta de sucesso que a tela espera, e só a conferência do projeto vai ao servidor de
 * verdade, como conta da equipe (o members não guarda progresso nem prêmio da equipe), porque o
 * tempo dela é parte da aula gravada.
 */

export type BffAnswer =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'certificate' }
  | { kind: 'project-check'; sectionId: string }
  | { kind: 'studio-context'; blockId: string }

const ok = (body: unknown = {}): BffAnswer => ({ kind: 'json', status: 200, body })
const missing: BffAnswer = {
  kind: 'json',
  status: 404,
  body: { error: { code: 'NOT_FOUND', message: 'Não existe no palco.' } },
}

/** O corpo de uma escrita da aula, quando é um objeto. */
type Body = Record<string, unknown> | undefined

/**
 * O progresso de uma atividade como o members o devolveria: o que a tela mandou, guardado só na
 * resposta. O vídeo da aula lê a posição dele daqui a cada 10 s.
 */
const progressOf = (blockId: string, body: Body, now: Date) => ({
  blockId,
  revision: typeof body?.revision === 'string' ? body.revision : '',
  positionSeconds: typeof body?.positionSeconds === 'number' ? body.positionSeconds : null,
  answers: body?.answers && typeof body.answers === 'object' ? body.answers : {},
  hintsUsed: typeof body?.hintsUsed === 'number' ? body.hintsUsed : 0,
  attemptsCount: 0,
  result: null,
  updatedAt: now.toISOString(),
})

/**
 * Um quiz respondido no palco passa com as respostas dadas: a tomada mostra o caminho feliz, e a
 * conferência das respostas certas (que só o members conhece) não grava tentativa de ninguém.
 */
function quizOf(body: Body) {
  const answers =
    body?.answers && typeof body.answers === 'object'
      ? (body.answers as Record<string, unknown>)
      : {}
  return {
    score: 100,
    passed: true,
    passingScore: 70,
    attemptsCount: 1,
    retryAvailableAt: null,
    gamification: null,
    questions: Object.entries(answers).map(([questionId, chosen]) => ({
      questionId,
      correct: true,
      correctChoiceIds: Array.isArray(chosen) ? chosen.filter((c) => typeof c === 'string') : [],
      explanation: null,
    })),
  }
}

export function bffAnswer(
  method: string,
  rest: readonly string[],
  body?: Body,
  now = new Date(),
): BffAnswer {
  const [first, id, action] = rest
  if (method === 'GET') {
    if (first !== 'blocks' || !id) return missing
    // Cada tomada começa do projeto inicial: nada enviado, nada trazido da aula anterior.
    if (
      action === 'studio-submission' ||
      action === 'studio-carryover' ||
      action === 'pinta-carryover'
    )
      return ok({ project: null })
    if (action === 'art-slots') return ok({ slots: [] })
    // O certificado aparece pronto para baixar, como para quem terminou o curso.
    if (action === 'certificate')
      return ok({
        eligible: true,
        issued: false,
        revoked: false,
        serial: null,
        issuedAt: null,
        revokedAt: null,
      })
    return missing
  }
  if (method !== 'POST') return missing
  if (first === 'sections' && id && action === 'project-check')
    return { kind: 'project-check', sectionId: id }
  if (first === 'blocks' && id && action === 'studio-context')
    return { kind: 'studio-context', blockId: id }
  if (first === 'blocks' && id && (action === 'studio-submission' || action === 'pinta-submission'))
    return ok({ submittedAt: now.toISOString(), gamification: null })
  if (first === 'blocks' && id && action === 'learning-progress')
    return ok(progressOf(id, body, now))
  if (first === 'blocks' && id && action === 'quiz-attempts') return ok(quizOf(body))
  if (first === 'blocks' && id && action === 'certificate') return { kind: 'certificate' }
  // Navegação, posição do vídeo, acesso ao material, pedido de ajuda: aceitos e esquecidos.
  return ok()
}
