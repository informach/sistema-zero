import type {
  StudioTutorAdapter,
  StudioTutorHistoryMessage,
  StudioTutorResponse,
} from '@sistemazero/studio'

interface ErrorBody {
  error?: { code?: string; message?: string }
}

async function readBody<T>(response: Response): Promise<T | null> {
  return (await response.json().catch(() => null)) as T | null
}

async function requireOk<T>(response: Response): Promise<T> {
  const body = await readBody<T & ErrorBody>(response)
  if (!response.ok || !body) {
    const error = Object.assign(
      new Error(body?.error?.message ?? 'Não foi possível falar com o Zappy agora.'),
      { code: body?.error?.code ?? 'ZAPPY_UNAVAILABLE', status: response.status },
    )
    throw error
  }
  return body
}

/** Adapter client-side do BFF. Não contém sessão, regras de rank nem chaves de IA. */
export function createStudioZappyAdapter(baseUrl = '/api/studio/zappy'): StudioTutorAdapter {
  return {
    async loadHistory(projectId, before) {
      const query = new URLSearchParams({ projectId })
      if (before) query.set('before', before)
      const response = await fetch(`${baseUrl}?${query.toString()}`, {
        cache: 'no-store',
      })
      return requireOk<{ messages: StudioTutorHistoryMessage[]; nextCursor: string | null }>(
        response,
      )
    },
    async deleteHistory(projectId) {
      const response = await fetch(`${baseUrl}?projectId=${encodeURIComponent(projectId)}`, {
        method: 'DELETE',
      })
      await requireOk<{ ok: true }>(response)
    },
    async ask(input) {
      const response = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      return requireOk<StudioTutorResponse>(response)
    },
    async feedback(input) {
      const response = await fetch(`${baseUrl}/feedback`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      })
      await requireOk<{ ok: true }>(response)
    },
  }
}
