import { z } from 'zod'
import type { AssetManifest } from './assets'
import { canonicalJson, hashSchema, idSchema, timestampSchema } from './common'
import { importDecisionSchema } from './import-decision'

export const importOriginSchema = z.enum(['sistema-zero', 'fluxo-criativo'])
export const importProductSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const importPolicyVersionSchema = z.enum(['marketing-acervo-v1', 'marketing-acervo-v2'])
export const relativeSourcePathSchema = z
  .string()
  .min(1)
  .max(1000)
  .refine(
    (value) =>
      !/[\\:]/.test(value) &&
      [...value].every((character) => character.charCodeAt(0) >= 32) &&
      value.split('/').every((part) => part !== '' && part !== '.' && part !== '..'),
    'Use somente um caminho relativo à pasta selecionada',
  )
export const importCategorySchema = z.enum([
  'direction',
  'calendar',
  'copy',
  'research',
  'final-media',
  'support-media',
  'production-source',
  'history',
  'pedagogy',
  'technical',
  'unclassified',
])
export const inventoryEntrySchema = z
  .object({
    path: relativeSourcePathSchema,
    kind: z.enum(['file', 'directory']),
    product: importProductSchema,
    category: importCategorySchema,
    disposition: z.enum(['eligible', 'review', 'excluded', 'blocked']),
    validity: z.enum(['reference', 'historical', 'unverified']),
    reason: z.string().min(1).max(500),
    bytes: z
      .number()
      .int()
      .nonnegative()
      .max(2 ** 40)
      .nullable(),
    sha256: hashSchema.nullable(),
  })
  .strict()
  .superRefine((entry, ctx) => {
    if (
      ['eligible', 'review'].includes(entry.disposition) &&
      (entry.kind !== 'file' || entry.sha256 === null || entry.bytes === null)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Arquivo elegível precisa de tamanho e hash conferidos',
      })
    if (entry.kind === 'directory' && (entry.sha256 !== null || entry.bytes !== null))
      ctx.addIssue({
        code: 'custom',
        message: 'Subárvore excluída não contém contagem ou hash inferidos',
      })
  })
export type InventoryEntry = z.infer<typeof inventoryEntrySchema>
export const inventorySchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: importPolicyVersionSchema,
    origin: importOriginSchema,
    capturedAt: timestampSchema,
    digest: hashSchema,
    entries: z.array(inventoryEntrySchema).min(1).max(100000),
  })
  .strict()
  .superRefine((inventory, ctx) => {
    for (let i = 1; i < inventory.entries.length; i++) {
      if ((inventory.entries[i - 1]?.path ?? '') >= (inventory.entries[i]?.path ?? ''))
        ctx.addIssue({
          code: 'custom',
          path: ['entries', i],
          message: 'Origens precisam ser únicas e ordenadas',
        })
    }
  })
export type ImportInventory = z.infer<typeof inventorySchema>
export const importStartSchema = z
  .object({
    id: idSchema,
    origin: importOriginSchema,
    digest: hashSchema,
    policyVersion: importPolicyVersionSchema,
    capturedAt: timestampSchema,
    entryCount: z.number().int().min(1).max(100000),
  })
  .strict()
export type ImportStart = z.infer<typeof importStartSchema>
export const importChunkSchema = z
  .object({
    offset: z.number().int().min(0).max(99999),
    entries: z.array(inventoryEntrySchema).min(1).max(100),
  })
  .strict()
export type ImportChunk = z.infer<typeof importChunkSchema>
export const importRunSchema = importStartSchema.extend({
  projectId: idSchema,
  createdBy: idSchema,
  createdAt: timestampSchema,
  state: z.enum(['receiving', 'inventoried', 'retired']),
  received: z.number().int().nonnegative(),
})
export type ImportRun = z.infer<typeof importRunSchema>
export const preparedImportSchema = importStartSchema.extend({
  products: z.array(importProductSchema).min(1).max(1000),
  summary: z
    .object({
      eligible: z.number().int().nonnegative(),
      review: z.number().int().nonnegative(),
      excluded: z.number().int().nonnegative(),
      blocked: z.number().int().nonnegative(),
      bytes: z.number().int().nonnegative(),
      duplicates: z.number().int().nonnegative(),
    })
    .strict(),
})
export type PreparedImport = z.infer<typeof preparedImportSchema>
export const importSourceLoadSchema = z
  .object({
    operationId: idSchema,
    ordinal: z.number().int().min(0).max(99999),
    content: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('text'),
          base64: z
            .string()
            .max(262144)
            .regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
        })
        .strict(),
      z.object({ kind: z.literal('asset'), assetId: idSchema }).strict(),
    ]),
  })
  .strict()
export type ImportSourceLoad = z.infer<typeof importSourceLoadSchema>
export const importDestinationSchema = z
  .object({ entityId: idSchema, revisionId: idSchema })
  .strict()
export const importSourceResultSchema = z
  .object({
    status: z.enum(['imported', 'reused']),
    sourceVersionId: idSchema,
    sourceHash: hashSchema,
    destinations: z.array(importDestinationSchema).min(1).max(10),
    previousSourceVersion: z.boolean(),
    classificationReview: z.boolean().optional(),
  })
  .strict()
export type ImportSourceResult = z.infer<typeof importSourceResultSchema>
export const importFileLoadResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('loaded'), result: importSourceResultSchema }).strict(),
  z.object({ status: z.literal('verifying'), assetId: idSchema }).strict(),
])
export type ImportFileLoadResult = z.infer<typeof importFileLoadResultSchema>
/** Font originals have a dedicated role for rendering. A derived final/proxy
 * never becomes the preserved source merely because its bytes match. */
export function isImportSourceAsset(asset: Pick<AssetManifest, 'role' | 'mime' | 'sourceAssetId'>) {
  return (
    asset.sourceAssetId === null &&
    (asset.role === 'original' || (asset.role === 'font' && asset.mime.startsWith('font/')))
  )
}
export const importSelectionSchema = z
  .object({
    product: importProductSchema.nullable(),
    categories: z.array(importCategorySchema).min(1).max(11),
    includeReview: z.boolean(),
  })
  .strict()
export type ImportSelection = z.infer<typeof importSelectionSchema>
export const importBatchResultSchema = z
  .object({
    selected: z.number().int().nonnegative(),
    loaded: z.number().int().nonnegative(),
    reused: z.number().int().nonnegative(),
    verifying: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative().default(0),
  })
  .strict()
export type ImportBatchResult = z.infer<typeof importBatchResultSchema>
export function selectedImportSource(entry: InventoryEntry, selection: ImportSelection) {
  return (
    (entry.disposition === 'eligible' ||
      (entry.disposition === 'review' && selection.includeReview)) &&
    (selection.product === null || entry.product === selection.product) &&
    selection.categories.includes(entry.category)
  )
}
/** Production code and large originals remain attachments, outside the textual evidence context. */
export function importSourceIsText(entry: InventoryEntry) {
  // Empty originals still have a meaningful hash/path. They require no media
  // upload and contain no executable code to add to the evidence context.
  if (entry.bytes === 0) return true
  return (
    entry.bytes !== null &&
    entry.bytes <= 196608 &&
    entry.category !== 'production-source' &&
    (/\.(md|txt|srt|csv|ya?ml)$/i.test(entry.path) ||
      /(?:^|\/)(?:LICENSE|COPYING)(?:-[^/.]+)?$/i.test(entry.path))
  )
}
export const importPageSchema = z
  .object({
    run: importRunSchema,
    entries: z
      .array(
        z
          .object({
            ordinal: z.number().int().nonnegative(),
            source: inventoryEntrySchema,
            result: importSourceResultSchema.nullable(),
            decision: importDecisionSchema.nullable().default(null),
          })
          .strict(),
      )
      .max(100),
    nextCursor: z.number().int().nonnegative().nullable(),
  })
  .strict()
export type ImportPage = z.infer<typeof importPageSchema>
/** Timestamps and local absolute paths do not determine content identity. */
export function inventoryDigestInput(
  input: Pick<ImportInventory, 'origin' | 'entries' | 'policyVersion'>,
): string {
  return canonicalJson({ schemaVersion: 1, ...input })
}
export function inventoryDigestBoundary(
  origin: ImportInventory['origin'],
  policyVersion: ImportInventory['policyVersion'],
) {
  return {
    prefix: '{"entries":[',
    suffix: `],${canonicalJson({ origin, policyVersion, schemaVersion: 1 }).slice(1)}`,
  }
}
export function inventorySummary(inventory: ImportInventory) {
  const summary = { eligible: 0, review: 0, excluded: 0, blocked: 0, bytes: 0, duplicates: 0 }
  const hashes = new Set<string>()
  for (const entry of inventory.entries) {
    summary[entry.disposition]++
    summary.bytes += entry.bytes ?? 0
    if (entry.sha256) {
      if (hashes.has(entry.sha256)) summary.duplicates++
      hashes.add(entry.sha256)
    }
  }
  return summary
}
