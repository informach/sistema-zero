import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import { apiGet } from './api'

export function assertJavaScriptCreationOptions(raw: unknown, kind: 'classic' | 'pro'): void {
  const options = StudioFreeOptionsSchema.parse(raw)
  if (!options.canCreateJavaScript || (kind === 'pro' && !options.canCreatePro))
    throw new Error('Conquiste ferramentas JavaScript e o modo necessário para criar este projeto.')
}

/** A fresh server read before creating a free document; no grant comes from imported source. */
export async function authorizeJavaScriptCreation(kind: 'classic' | 'pro', signal?: AbortSignal) {
  signal?.throwIfAborted()
  const options = await apiGet('/api/studio/free-options', undefined, { signal })
  signal?.throwIfAborted()
  assertJavaScriptCreationOptions(options, kind)
}
