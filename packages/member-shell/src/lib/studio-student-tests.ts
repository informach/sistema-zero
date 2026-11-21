import type { StudioStudentTestsServer, StudioStudentTestsServerResult } from '@sistemazero/studio'
import { apiSend, CODIGO_SEM_ENVELOPE } from './api'

/**
 * "Meus testes" no Pro do Estúdio Completo (proposta aprovada em 20/11/2026): o adaptador que o
 * editor Pro recebe. Manda um lote (até 8 testes) e o projeto ao BFF (`/api/studio/student-tests`),
 * que repassa ao members; lá o acesso ao Pro é conferido e os testes rodam no executor do
 * "Verificar projeto". A recusa volta como um `Error` com a frase do servidor (a aba a mostra).
 */
const FALLBACK = 'Não deu para rodar os testes no servidor agora. Tente de novo.'

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** A resposta do servidor, conferida pela forma (um resultado por teste pedido). */
export function readStudentTestResults(
  raw: unknown,
  ids: readonly string[],
): StudioStudentTestsServerResult[] {
  if (!record(raw) || !Array.isArray(raw.results)) throw new Error(FALLBACK)
  const results: StudioStudentTestsServerResult[] = []
  for (const item of raw.results) {
    if (!record(item) || typeof item.id !== 'string' || typeof item.passed !== 'boolean')
      throw new Error(FALLBACK)
    results.push({
      id: item.id,
      passed: item.passed,
      ...(typeof item.detail === 'string' ? { detail: item.detail.slice(0, 1000) } : {}),
    })
  }
  if (results.length !== ids.length || results.some((item) => !ids.includes(item.id)))
    throw new Error(FALLBACK)
  return results
}

export function createStudentTestsServer(): StudioStudentTestsServer {
  return {
    async run({ project, tests, signal }) {
      let raw: unknown
      try {
        raw = await apiSend<unknown>(
          '/api/studio/student-tests',
          'POST',
          { project, tests },
          undefined,
          signal ? { signal } : undefined,
        )
      } catch (error) {
        // A resposta sem envelope (o gateway fora do ar) não tem frase do servidor: vale a nossa.
        const message =
          record(error) &&
          error.code !== CODIGO_SEM_ENVELOPE &&
          typeof error.message === 'string' &&
          error.message
            ? error.message
            : ''
        throw new Error(message || FALLBACK)
      }
      return {
        results: readStudentTestResults(
          raw,
          tests.map((test) => test.id),
        ),
      }
    },
  }
}
