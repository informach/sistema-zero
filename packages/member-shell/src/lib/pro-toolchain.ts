import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-limits'
import type { PrepareProDependencies, StudioProRuntimeBuildInput } from '@sistemazero/studio'

/** Transport only; authorization and canonical lock generation stay on the existing BFF. */
export function createProToolchainPreparer(
  url: string,
  fetchImpl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  context: Record<string, string | number> = {},
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
        project: proRuntimeProjectInput(project),
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

/** Build and preparation retain the extension identity required by regional 2D materials. */
export function proRuntimeProjectInput(project: StudioProRuntimeBuildInput['project']) {
  return {
    id: project.id,
    kind: 'pro' as const,
    programmingLanguage: project.programmingLanguage,
    tree: project.tree,
    assets: project.assets,
    proMeta: project.proMeta,
    installedExtensions: project.installedExtensions,
  }
}
