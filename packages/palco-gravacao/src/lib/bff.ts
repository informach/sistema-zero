/**
 * O que o palco responde a cada rota da aula (`/api/members/lessons/:aula/...`), o mesmo
 * caminho que os componentes do Kids chamam. Nada vai para a conta: as escritas recebem a
 * resposta de sucesso que a tela espera, e só a conferência do projeto vai ao servidor de
 * verdade, como conta da equipe (o members não guarda progresso nem prêmio da equipe), porque o
 * tempo dela é parte da aula gravada.
 */

export type BffAnswer =
  | { kind: 'json'; status: number; body: unknown }
  | { kind: 'project-check'; sectionId: string }
  | { kind: 'studio-context'; blockId: string }

const ok = (body: unknown = {}): BffAnswer => ({ kind: 'json', status: 200, body })
const missing: BffAnswer = {
  kind: 'json',
  status: 404,
  body: { error: { code: 'NOT_FOUND', message: 'Não existe no palco.' } },
}

export function bffAnswer(method: string, rest: readonly string[], now = new Date()): BffAnswer {
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
    return missing
  }
  if (method !== 'POST') return missing
  if (first === 'sections' && id && action === 'project-check')
    return { kind: 'project-check', sectionId: id }
  if (first === 'blocks' && id && action === 'studio-context')
    return { kind: 'studio-context', blockId: id }
  if (first === 'blocks' && id && (action === 'studio-submission' || action === 'pinta-submission'))
    return ok({ submittedAt: now.toISOString(), gamification: null })
  // Navegação, posição do vídeo, acesso ao material, pedido de ajuda: aceitos e esquecidos.
  return ok()
}
