import {
  batchOperationSchema,
  canonicalJson,
  documentSchema,
  type EditorialBatch,
  type EditorialDocument,
  stableEditorialId,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'

const referenceSchema = z
  .object({
    title: z.string().trim().min(1).max(300),
    body: z.string().max(100000).default(''),
    label: z.string().trim().min(1).max(500),
    url: z.string().optional(),
    classification: z
      .enum(['fact', 'interpretation', 'hypothesis', 'reference'])
      .default('reference'),
    product: z.string().max(200).default(''),
    validity: z.enum(['current', 'historical', 'unverified']).default('unverified'),
    observedAt: z.string().datetime({ offset: true }).optional(),
    tags: z.array(z.string().max(100)).max(30).default([]),
  })
  .strict()
export type ImportedReference = z.infer<typeof referenceSchema>
/** RFC-style quoted CSV including multiline fields. Never evaluates formulas or HTML. */
function csvRows(text: string) {
  const rows: string[][] = []
  let row: string[] = [],
    field = '',
    quoted = false,
    closed = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          quoted = false
          closed = true
        }
      } else field += char
      continue
    }
    if (char === '"') {
      if (field || closed) throw new Error('Aspas fora do início do campo CSV')
      quoted = true
      continue
    }
    if (char === ',' || char === '\n' || char === '\r') {
      row.push(field)
      field = ''
      closed = false
      if (char !== ',') {
        if (row.some((value) => value.trim())) rows.push(row)
        row = []
        if (char === '\r' && text[i + 1] === '\n') i++
      }
      continue
    }
    if (closed) throw new Error('Texto após o fechamento de aspas no CSV')
    field += char
  }
  if (quoted) throw new Error('O CSV terminou dentro de um campo entre aspas')
  row.push(field)
  if (row.some((value) => value.trim())) rows.push(row)
  return rows
}
export function parseReferenceImport(text: string, format: 'json' | 'csv'): ImportedReference[] {
  if (new TextEncoder().encode(text).byteLength > 2_000_000)
    throw new Error('Importe no máximo 2 MB de referências por vez')
  let value: unknown
  if (format === 'json') value = JSON.parse(text.replace(/^\uFEFF/, ''))
  else {
    const [header, ...rows] = csvRows(text.replace(/^\uFEFF/, ''))
    if (!header || new Set(header).size !== header.length)
      throw new Error('Cabeçalho CSV ausente ou repetido')
    const allowed = new Set([
      'title',
      'body',
      'label',
      'url',
      'classification',
      'product',
      'validity',
      'observedAt',
      'tags',
    ])
    if (header.some((name) => !allowed.has(name)))
      throw new Error('O CSV contém uma coluna desconhecida')
    value = rows.map((row, index) => {
      if (row.length !== header.length)
        throw new Error(`A linha ${index + 2} tem uma quantidade diferente de colunas`)
      const item: Record<string, unknown> = {}
      header.forEach((name, column) => {
        const cell = row[column] ?? ''
        if (cell)
          item[name] =
            name === 'tags'
              ? cell
                  .split(';')
                  .map((tag) => tag.trim())
                  .filter(Boolean)
              : cell
      })
      return item
    })
  }
  return z.array(referenceSchema).min(1).max(100).parse(value)
}
export async function referenceImportBatch(
  projectId: string,
  name: string,
  references: ImportedReference[],
): Promise<EditorialBatch> {
  const bytes = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(canonicalJson(references)),
    ),
    sha256 = Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    )
  const changes = await Promise.all(
    references.map(async (reference, index) => {
      const entityId = await stableEditorialId(`${projectId}:${name}:${sha256}:${index}`)
      const document: EditorialDocument = documentSchema.parse({
        schemaVersion: 1,
        kind: 'evidence',
        title: reference.title,
        body: reference.body,
        classification: reference.classification,
        source: {
          label: reference.label,
          url: reference.url,
          observedAt: reference.observedAt,
          sourceKey: `${name}#${index + 1}`,
          sha256,
        },
        product: reference.product,
        validity: reference.validity,
        tags: reference.tags,
      })
      return { entityId, baseRevisionId: null, action: 'save' as const, document }
    }),
  )
  return batchOperationSchema.parse({
    schemaVersion: 1,
    operationId: await stableEditorialId(`${projectId}:${name}:${sha256}:import`),
    projectId,
    changes,
  })
}
