import type { StudioProRuntimeAdapter } from '@sistemazero/studio'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/studio'

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
    limits: STUDIO_PRO_BUILD_LIMITS,
    async build({ project, signal }) {
      const response = await fetchImpl('/api/studio/pro-runtime/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // A autoria remota só consome a árvore e o template confiável. Projetar
        // o payload evita que assets/estado do editor contaminem a cota do BFF.
        body: JSON.stringify({
          project: { kind: 'pro', tree: project.tree, proMeta: project.proMeta },
        }),
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
