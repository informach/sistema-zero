import { isStudioProArtifact } from '@sistemazero/core/studio'
import { createProToolchainPreparer } from '@sistemazero/member-shell/lib/pro-toolchain'
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
    prepareDependencies: createProToolchainPreparer('/api/studio/pro-runtime/build', fetchImpl),
    async build({ project, signal }) {
      const response = await fetchImpl('/api/studio/pro-runtime/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // O BFF valida código e materiais antes de enviá-los ao runtime isolado.
        body: JSON.stringify({
          project: {
            kind: 'pro',
            tree: project.tree,
            proMeta: project.proMeta,
            assets: project.assets,
          },
        }),
        cache: 'no-store',
        signal,
      })
      const body = (await response.json().catch(() => null)) as
        | { artifact: unknown; output?: string; durationMs?: number }
        | ErrorEnvelope
        | null
      if (!response.ok || !body || !('artifact' in body) || !isStudioProArtifact(body.artifact)) {
        const failure = body as ErrorEnvelope | null
        const detail = failure?.error?.output?.trim()
        throw new Error(
          [failure?.error?.message ?? 'Não foi possível compilar o projeto Pro.', detail]
            .filter(Boolean)
            .join('\n\n'),
        )
      }
      return { artifact: body.artifact, output: body.output, durationMs: body.durationMs }
    },
  }
}
