import { readJsonBodyWithLimit } from '@sistemazero/core/http'
import { isStudioPublication } from '@sistemazero/core/studio'
import type { StudioShareAdapter } from '@sistemazero/studio'
import { sessionFetch } from './session-fetch'

export function createStudioPublicationAdapter(): NonNullable<StudioShareAdapter['publication']> {
  async function call(operation: string, input: object, signal?: AbortSignal) {
    const response = await sessionFetch('/api/studio/publication', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, operation }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(200_000)])
        : AbortSignal.timeout(200_000),
    })
    const body: unknown = await readJsonBodyWithLimit(response, 32_768)
    if (!response.ok) {
      if (
        body &&
        typeof body === 'object' &&
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'message' in body.error &&
        typeof body.error.message === 'string'
      )
        throw new Error(body.error.message)
      throw new Error('Não foi possível consultar a publicação. Tente novamente.')
    }
    if (operation === 'get' && body === null) return null
    if (!isStudioPublication(body)) throw new Error('O histórico da publicação é inválido.')
    return body
  }
  return {
    get: (playId, signal) => call('get', { playId }, signal),
    async activate(input, signal) {
      const result = await call('activate', input, signal)
      if (!result) throw new Error('Publicação não encontrada.')
      return result
    },
  }
}

/** Qual projeto o Compartilhar consulta: a aula, o projeto do Estúdio livre ou a oficina. */
export type StudioShareStatusContext =
  | { kind: 'lesson'; lessonId: string; blockId: string }
  | { kind: 'free'; projectId: string; adoptPlayId?: string }
  | { kind: 'live'; workspaceId: string }

/**
 * O post que o projeto já tem no Mural (o botão vira "Atualizar no Mural"). `compare`
 * pede ao servidor para dizer se o jogo mudou; no Estúdio livre o projeto vai junto.
 * Falha = "sem post": o diálogo segue como publicação nova e o servidor decide.
 */
export function createStudioShareStatus(
  contextFor: (project: { id: string }) => StudioShareStatusContext | null,
): NonNullable<StudioShareAdapter['status']> {
  return async ({ project, compare }, signal) => {
    const context = contextFor(project)
    if (!context) return { published: false }
    const response = await sessionFetch('/api/studio/publication', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'status',
        compare,
        context: context.kind === 'free' && compare ? { ...context, project } : context,
      }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(60_000)])
        : AbortSignal.timeout(60_000),
    })
    if (!response.ok) return { published: false }
    const body: unknown = await readJsonBodyWithLimit(response, 32_768)
    if (!body || typeof body !== 'object' || !('published' in body) || body.published !== true)
      return { published: false }
    const value = body as Record<string, unknown>
    const text = (key: string) =>
      typeof value[key] === 'string' ? (value[key] as string) : undefined
    return {
      published: true,
      playId: text('playId'),
      muralUrl: text('muralUrl'),
      playUrl: text('playUrl'),
      title: text('title'),
      description: text('description'),
      coverUrl: text('coverUrl') ?? null,
      hidden: value.hidden === true,
      gameUpdatedAt: text('gameUpdatedAt') ?? null,
      history: value.history === true,
      ...(typeof value.unchanged === 'boolean' ? { unchanged: value.unchanged } : {}),
    }
  }
}
