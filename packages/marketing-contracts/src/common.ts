import { z } from 'zod'
/** Revision 3 adds sourced demonstration recipes to strict video documents. */
export const WORKSPACE_PROTOCOL = 3
export const workspaceProtocolSchema = z
  .object({
    protocol: z.number().int().min(1).max(WORKSPACE_PROTOCOL),
    minimumDesktopProtocol: z.number().int().min(1).max(WORKSPACE_PROTOCOL),
  })
  .strict()
export const idSchema = z.string().uuid()
export const hashSchema = z.string().regex(/^[a-f0-9]{64}$/)
export const timestampSchema = z.string().datetime({ offset: true })
export const permissionSchema = z.enum(['read', 'edit', 'execute', 'approve', 'publish', 'admin'])
export type Permission = z.infer<typeof permissionSchema>
export const permissions = permissionSchema.options
export const httpUrlSchema = z
  .string()
  .url()
  .max(4000)
  .refine((value) => /^https?:\/\//i.test(value), 'Use um endereço HTTP ou HTTPS')
export const sourceSchema = z
  .object({
    label: z.string().max(500),
    url: httpUrlSchema.optional(),
    sourceKey: z.string().max(1500).optional(),
    sha256: hashSchema.optional(),
    observedAt: timestampSchema.optional(),
  })
  .strict()
export const conflictCodeSchema = z.enum([
  'REVISION_CONFLICT',
  'OPERATION_REUSED',
  'OBJECT_INACCESSIBLE',
  'ASSET_UNCONFIRMED',
  'LEASE_EXPIRED',
  'DEVICE_REVOKED',
  'CONTEXT_CHANGED',
  'DEPENDENCY_MISSING',
  'INVALID_TIMELINE',
  'CURSOR_EXPIRED',
])
export type ConflictCode = z.infer<typeof conflictCodeSchema>
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const encoded = JSON.stringify(value)
    if (encoded === undefined) throw new Error('Valor não serializável')
    return encoded
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const entries = Object.entries(value)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`)
    .join(',')
  return `{${entries}}`
}
