import { z } from 'zod'
import type { TeacherRecipientDirectory } from '../../domain/ports/teacher-broadcast-repository.port'

const page = z.object({
  total: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      profileId: z.uuid(),
      accountId: z.uuid(),
      name: z.string(),
      accountName: z.string(),
      accountEmail: z.string(),
    }),
  ),
})

export function teacherRecipientDirectory(
  baseUrl: string,
  token?: string,
): TeacherRecipientDirectory {
  return {
    async list(input) {
      const query = new URLSearchParams({
        offset: String(input.offset),
        limit: String(input.limit),
      })
      if (input.q) query.set('q', input.q)
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/auth/internal/teacher-recipients?${query}`,
        {
          headers: token ? { 'x-internal-token': token } : {},
          signal: AbortSignal.timeout(8000),
        },
      )
      if (!response.ok) throw new Error('Não foi possível consultar os alunos. Tente novamente.')
      return page.parse(await response.json())
    },
  }
}
