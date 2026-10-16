import { z } from 'zod'
import { importCoverageStateSchema } from '../../../marketing-contracts/src/import-coverage'
import { importDeltaStateSchema } from '../../../marketing-contracts/src/import-delta'
export const connectSchema = z
  .object({ origin: z.string().url().max(1000), label: z.string().trim().min(2).max(80) })
  .strict()
export const connectionStateSchema = z
  .object({
    origin: z.string().nullable(),
    userId: z.string().uuid().nullable(),
    deviceId: z.string().uuid().nullable(),
    status: z.enum(['disconnected', 'connected', 'offline']),
    storageProtected: z.boolean(),
    message: z.string().optional(),
  })
  .strict()
export type ConnectionState = z.infer<typeof connectionStateSchema>
export type PairingView = { code: string; expiresAt: string; intervalSeconds: number }
export const workspaceRequestSchema = z
  .object({
    scope: z.object({ origin: z.string().url(), userId: z.string().uuid() }).strict(),
    method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
    path: z.string().refine(validWorkspacePath, 'Caminho de marketing não permitido').max(1000),
    body: z.unknown().optional(),
  })
  .strict()
export type WorkspaceRequest = z.infer<typeof workspaceRequestSchema>
function validWorkspacePath(value: string) {
  const [pathname, query, ...extra] = value.split('?')
  if (
    extra.length ||
    !pathname ||
    !/^\/(projects|operations|batches|handoffs|protocol|head|context|runs|assets)(\/[a-zA-Z0-9-]+)*$/.test(
      pathname,
    )
  )
    return false
  if (!query) return true
  const params = new URLSearchParams(query),
    seen = new Set<string>()
  for (const [key, value] of params) {
    if (seen.has(key)) return false
    seen.add(key)
    if (key === 'q' && pathname.endsWith('/staff') && value.length >= 2 && value.length <= 100)
      continue
    if (key === 'cursor' && /^\d+$/.test(value)) continue
    if (
      key === 'days' &&
      /^\/projects\/[a-f0-9-]+\/(analytics|production)$/.test(pathname) &&
      /^\d+$/.test(value) &&
      Number(value) >= 1 &&
      Number(value) <= 365
    )
      continue
    if (
      key === 'at' &&
      /^\/projects\/[a-f0-9-]+\/snapshot-page$/.test(pathname) &&
      /^\d+$/.test(value) &&
      Number.isSafeInteger(Number(value))
    )
      continue
    if (/^\/projects\/[a-f0-9-]+\/imports\/[a-f0-9-]+\/compare$/.test(pathname)) {
      if (key === 'previousId' && z.string().uuid().safeParse(value).success) continue
      if (key === 'state' && (value === 'all' || importDeltaStateSchema.safeParse(value).success))
        continue
    }
    if (
      key === 'state' &&
      /^\/projects\/[a-f0-9-]+\/imports\/[a-f0-9-]+\/coverage$/.test(pathname) &&
      (value === 'all' || importCoverageStateSchema.safeParse(value).success)
    )
      continue
    if (
      ['entityId', 'before', 'after', 'revisionId'].includes(key) &&
      z.string().uuid().safeParse(value).success
    )
      continue
    return false
  }
  return seen.size > 0
}
export function serverOrigin(input: string, development: boolean) {
  const url = new URL(input)
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Informe somente o endereço do app de marketing')
  if (
    url.protocol !== 'https:' &&
    !(development && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('Use um servidor HTTPS')
  return url.origin
}
