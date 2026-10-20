import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import type { PrepareProDependencies } from '@sistemazero/studio'

/** Transport only; authorization and canonical lock generation stay on the existing BFF. */
export function createProToolchainPreparer(
  url: string,
  fetchImpl: typeof fetch,
  context: Record<string, string> = {},
): PrepareProDependencies {
  return async ({ project, signal }) => {
    const response = await fetchImpl(url, {
      method: 'POST',
      cache: 'no-store',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Studio-Pro-Operation': 'prepare-dependencies',
      },
      body: JSON.stringify({
        ...context,
        project: {
          kind: 'pro',
          tree: project.tree,
          proMeta: project.proMeta,
          assets: project.assets,
        },
      }),
    })
    const body = (await response.json().catch(() => null)) as {
      packageLock?: unknown
      error?: { message?: string }
    } | null
    if (
      !response.ok ||
      typeof body?.packageLock !== 'string' ||
      body.packageLock.length > STUDIO_PRO_BUILD_LIMITS.maxFileChars
    )
      throw new Error(
        body?.error?.message ?? 'Não foi possível preparar a atualização segura do ambiente Pro.',
      )
    signal.throwIfAborted()
    return body.packageLock
  }
}
