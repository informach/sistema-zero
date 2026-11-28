import { isStudioProArtifact } from '@sistemazero/core/studio/pro-artifact'
import type { StudioProRuntimeAdapter } from '@sistemazero/studio'
import { proRuntimeProjectInput } from './pro-toolchain'
/** Public account transport; the BFF applies the same authority as the free Pro page. */
export function createFreeProRuntime(
  request: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): StudioProRuntimeAdapter {
  return {
    // Keep document admission independent of the hosted request projection. Regional
    // documents retain their full engine; the BFF enforces compiler quotas after projection.
    async build({ project, signal }) {
      const response = await request('/api/studio/pro-runtime/free-build', {
        method: 'POST',
        cache: 'no-store',
        signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: proRuntimeProjectInput(project),
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        artifact?: unknown
        output?: string
        durationMs?: number
        error?: { message?: string; output?: string }
      } | null
      signal?.throwIfAborted()
      if (
        !response.ok ||
        !body ||
        !isStudioProArtifact(body.artifact) ||
        body.artifact.expiresAt <= Date.now()
      ) {
        const error = new Error(
          body?.error?.message ?? 'Não foi possível compilar o projeto.',
        ) as Error & { output?: string }
        if (body?.error?.output) error.output = body.error.output
        throw error
      }
      return { artifact: body.artifact, output: body.output, durationMs: body.durationMs }
    },
  }
}
