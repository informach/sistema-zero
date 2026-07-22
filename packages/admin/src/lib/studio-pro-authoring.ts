import type { StudioProRuntimeAdapter } from '@sistemazero/studio'

interface ErrorEnvelope {
  error?: {
    message?: string
    output?: string
  }
}

export function createAdminProRuntimeAdapter(
  fetchImpl: typeof fetch = fetch,
): StudioProRuntimeAdapter {
  return {
    async build({ project, signal }) {
      const response = await fetchImpl('/api/studio/pro-runtime/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project }),
        cache: 'no-store',
        signal,
      })
      const body = (await response.json().catch(() => null)) as
        | { html: string; output?: string; durationMs?: number }
        | ErrorEnvelope
        | null
      if (!response.ok || !body || !('html' in body)) {
        const failure = body as ErrorEnvelope | null
        const detail = failure?.error?.output?.trim()
        throw new Error(
          [failure?.error?.message ?? 'Não foi possível compilar o projeto Pro.', detail]
            .filter(Boolean)
            .join('\n\n'),
        )
      }
      return body
    },
  }
}
