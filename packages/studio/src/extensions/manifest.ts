import { z } from 'zod'
import { SZIRSchema } from '#ir'
import type { ExtensionManifest } from './types'

export const ExtensionPermissionSchema = z.enum([
  'canvas',
  'keyboard',
  'mouse',
  'audio',
  'storage',
  'network',
])

// Tetos defensivos: um manifest é só metadados + docs, então strings imensas
// indicam dados malformados/maliciosos. Limites generosos para não atrapalhar
// extensões reais (o docs oficial tem ~1 KB) mas finitos para evitar exaustão
// de memória se um dia carregarmos extensões de terceiros.
const MAX_NAME_CHARS = 80
const MAX_DESCRIPTION_CHARS = 500
const MAX_CATEGORY_CHARS = 60
const MAX_DOCS_CHARS = 20_000
const MAX_EXAMPLES = 50

export const ExtensionExampleSchema = z.object({
  name: z.string().min(1).max(MAX_NAME_CHARS),
  description: z.string().max(MAX_DESCRIPTION_CHARS).optional(),
  ir: SZIRSchema,
})

export const ExtensionManifestSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9-]+$/, 'id deve ser kebab-case (apenas a-z, 0-9 e -)'),
  name: z.string().min(1).max(MAX_NAME_CHARS),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'version deve ser semver simples (ex.: 0.1.0)'),
  description: z.string().min(1).max(MAX_DESCRIPTION_CHARS),
  category: z.string().min(1).max(MAX_CATEGORY_CHARS),
  official: z.literal(true),
  enabledByDefault: z.boolean(),
  permissions: z.array(ExtensionPermissionSchema),
  docs: z.string().max(MAX_DOCS_CHARS),
  examples: z.array(ExtensionExampleSchema).max(MAX_EXAMPLES),
}) satisfies z.ZodType<ExtensionManifest>

export function validateManifest(input: unknown): ExtensionManifest {
  return ExtensionManifestSchema.parse(input)
}
