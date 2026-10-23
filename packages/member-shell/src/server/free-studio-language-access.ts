import 'server-only'
import { StudioFreeOptionsSchema } from '@sistemazero/core/studio/authoring-catalog'
import type { MembersClient } from './clients'

export class FreeStudioLanguageAccessError extends Error {
  constructor(readonly status: 403 | 503) {
    super(
      status === 403
        ? 'Conclua um curso desta linguagem e confira seu acesso ao Estúdio Pro.'
        : 'Não foi possível conferir o acesso ao Estúdio.',
    )
    this.name = 'FreeStudioLanguageAccessError'
  }
}

/** Browser-bound admission only. Service executors must authorize their persisted job instead. */
export async function assertFreeStudioLanguageAccess(
  members: Pick<MembersClient, 'studioFreeOptions'>,
  language: 'javascript' | 'python',
  pro: boolean,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted()
  const response = await members.studioFreeOptions({ signal })
  signal?.throwIfAborted()
  if (response.status !== 200)
    throw new FreeStudioLanguageAccessError([401, 403].includes(response.status) ? 403 : 503)
  const parsed = StudioFreeOptionsSchema.safeParse(response.body)
  if (!parsed.success) throw new FreeStudioLanguageAccessError(503)
  const options = parsed.data
  if (
    !(language === 'javascript' ? options.canCreateJavaScript : options.canCreatePython) ||
    (pro && !options.canCreatePro)
  )
    throw new FreeStudioLanguageAccessError(403)
}
