import { z } from 'zod'
import {
  StudioCatalogIdSchema,
  StudioExactVersionSchema,
  StudioPortablePathSchema,
  StudioProjectEnvironmentSchema,
  StudioPythonProjectConfigSchema,
  studioPortableFileConflict,
} from './project-environment'
import {
  isStudioDocumentTemplateId,
  isStudioPublicationId,
  STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
} from './project-format'
import { StudioProjectIdSchema } from './project-identity'
import { copyStudioProjectJson } from './project-json'
import { parseStudioProAssistanceMeta, type StudioProAssistanceMeta } from './project-pro-metadata'
import type { StudioRuntimeRelease } from './runtime-catalog'

/** Prepared schema version. Activating the product writer is a separate migration step. */
export const STUDIO_PROJECT_DOCUMENT_V3 = STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION

const requiredPayload = z.unknown().refine((value) => value !== undefined, {
  message: 'O campo precisa estar presente, mesmo quando nulo.',
})
const timestamp = z.number().int().nonnegative()
export const STUDIO_PROJECT_NAME_MAX_LENGTH = 200
export const StudioProjectNameSchema = z.string().max(STUDIO_PROJECT_NAME_MAX_LENGTH)
export { StudioProjectIdSchema } from './project-identity'

const assistanceSchema = z.custom<StudioProAssistanceMeta>(
  (value) => {
    try {
      parseStudioProAssistanceMeta(value)
      return true
    } catch {
      return false
    }
  },
  { message: 'As decisões do projeto têm formato ou tamanho incompatível.' },
)
const publicationReferenceSchema = z.strictObject({
  playId: z.string().refine(isStudioPublicationId),
})

const commonProMeta = {
  templateId: z.string().refine(isStudioDocumentTemplateId),
  assistance: assistanceSchema.optional(),
  publication: publicationReferenceSchema.optional(),
  origin: z
    .strictObject({
      projectId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
      revision: z.number().int().nonnegative(),
    })
    .optional(),
}
export const StudioJavaScriptProMetadataSchema = z.strictObject({
  ...commonProMeta,
  devScript: z
    .string()
    .min(1)
    .max(80)
    .refine((value) => value.trim() === value),
})
const pythonProMetaSchema = z.strictObject(commonProMeta)

const treeNodeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('file'), content: z.string() }),
  z.strictObject({ kind: z.literal('dir') }),
])
/** Zod intentionally skips __proto__ record keys; reject before parsing instead of losing a file. */
function documentRecord<Value extends z.ZodType>(key: z.ZodString, value: Value) {
  return z
    .unknown()
    .superRefine((input, context) => {
      if (input && typeof input === 'object' && Object.hasOwn(input, '__proto__'))
        context.addIssue({
          code: 'custom',
          message: 'O caminho __proto__ é reservado. O original foi preservado.',
        })
    })
    .pipe(z.record(key, value))
}
export const StudioProjectTreeSchema = documentRecord(z.string(), treeNodeSchema)
export type StudioProjectTree = z.infer<typeof StudioProjectTreeSchema>
const pythonTreeSchema = documentRecord(StudioPortablePathSchema, treeNodeSchema).superRefine(
  (tree, context) => {
    const entries = Object.entries(tree)
    if (entries.length > 5000)
      context.addIssue({
        code: 'custom',
        message: 'A árvore excede o limite de arquivos e pastas.',
      })
    const aliases = new Set<string>()
    for (const [path] of entries) {
      if (aliases.has(path.toLowerCase()))
        context.addIssue({
          code: 'custom',
          path: [path],
          message: 'Há caminhos que colidem no computador.',
        })
      aliases.add(path.toLowerCase())
      const parts = path.split('/')
      for (let index = 1; index < parts.length; index++) {
        if (tree[parts.slice(0, index).join('/')]?.kind !== 'dir')
          context.addIssue({
            code: 'custom',
            path: [path],
            message: 'As pastas do caminho precisam existir explicitamente na árvore.',
          })
      }
    }
  },
)
const javascriptFilesSchema = z.strictObject({
  'index.html': z.string(),
  'style.css': z.string(),
  'script.js': z.string(),
})
const extrasSchema = z.array(
  z.strictObject({
    name: z.string(),
    language: z.enum(['html', 'css', 'javascript', 'typescript']),
    content: z.string(),
  }),
)
const pythonFilesSchema = documentRecord(StudioPortablePathSchema, z.string()).superRefine(
  (files, context) => {
    if (!Object.hasOwn(files, 'main.py'))
      context.addIssue({
        code: 'custom',
        path: ['main.py'],
        message: 'O projeto clássico precisa de main.py.',
      })
    if (studioPortableFileConflict(Object.keys(files)))
      context.addIssue({ code: 'custom', message: 'Há caminhos conflitantes nos arquivos.' })
  },
)

const common = {
  formatVersion: z.literal(STUDIO_PROJECT_DOCUMENT_V3),
  runtime: StudioProjectEnvironmentSchema.shape.runtime,
  id: StudioProjectIdSchema,
  name: StudioProjectNameSchema,
  createdAt: timestamp,
  updatedAt: timestamp,
  projectTools: z.array(z.string()).optional(),
  installedExtensions: z
    .array(
      z.strictObject({
        id: StudioCatalogIdSchema,
        version: StudioExactVersionSchema,
        installedAt: timestamp,
      }),
    )
    .max(100),
  assets: z.array(requiredPayload).optional(),
  coverAssetName: z.string().optional(),
  bridgeCodeAhead: z.literal(true).optional(),
}

const javascriptClassicSchema = z.strictObject({
  ...common,
  programmingLanguage: z.literal('javascript'),
  kind: z.literal('classic'),
  mode: z.enum(['blocks', 'bridge']),
  files: javascriptFilesSchema,
  extraFiles: extrasSchema.optional(),
  ir: requiredPayload,
  blocksState: requiredPayload,
})
const javascriptProSchema = z.strictObject({
  ...common,
  programmingLanguage: z.literal('javascript'),
  kind: z.literal('pro'),
  mode: z.literal('code'),
  files: javascriptFilesSchema,
  extraFiles: extrasSchema.optional(),
  tree: StudioProjectTreeSchema,
  proMeta: StudioJavaScriptProMetadataSchema,
  ir: requiredPayload,
  blocksState: requiredPayload,
})
const pythonClassicSchema = z
  .strictObject({
    ...common,
    programmingLanguage: z.literal('python'),
    kind: z.literal('classic'),
    publication: publicationReferenceSchema.optional(),
    mode: z.enum(['blocks', 'bridge']),
    files: pythonFilesSchema,
    python: StudioPythonProjectConfigSchema,
    ir: requiredPayload,
    blocksState: requiredPayload,
  })
  .superRefine((project, context) => {
    if (project.python.entrypoint !== 'main.py')
      context.addIssue({
        code: 'custom',
        path: ['python', 'entrypoint'],
        message: 'O projeto clássico começa em main.py.',
      })
  })
const pythonProSchema = z
  .strictObject({
    ...common,
    programmingLanguage: z.literal('python'),
    kind: z.literal('pro'),
    mode: z.literal('code'),
    tree: pythonTreeSchema,
    proMeta: pythonProMetaSchema,
    python: StudioPythonProjectConfigSchema,
    ir: z.null(),
    blocksState: z.null(),
  })
  .superRefine((project, context) => {
    if (project.tree[project.python.entrypoint]?.kind !== 'file')
      context.addIssue({
        code: 'custom',
        path: ['python', 'entrypoint'],
        message: 'O arquivo inicial precisa existir na árvore.',
      })
  })

const envelopeSchema = z
  .discriminatedUnion('programmingLanguage', [
    z.discriminatedUnion('kind', [javascriptClassicSchema, javascriptProSchema]),
    z.discriminatedUnion('kind', [pythonClassicSchema, pythonProSchema]),
  ])
  .superRefine((project, context) => {
    if (
      new Set(project.installedExtensions.map((extension) => extension.id)).size !==
      project.installedExtensions.length
    )
      context.addIssue({
        code: 'custom',
        path: ['installedExtensions'],
        message: 'Há extensões repetidas.',
      })
    if (
      project.programmingLanguage === 'python' &&
      project.python.dependencyLock.runtimeManifestSha256 !== project.runtime.manifestSha256
    )
      context.addIssue({
        code: 'custom',
        path: ['python', 'dependencyLock'],
        message: 'O lock não corresponde ao ambiente do projeto.',
      })
  })

/** Guard and copy before Zod visits the payload; callers cannot accidentally skip the budget. */
export const StudioProjectDocumentSchema = z
  .unknown()
  .transform((value, context) => {
    try {
      return copyStudioProjectJson(value)
    } catch (error) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Documento inválido.',
      })
      return z.NEVER
    }
  })
  .pipe(envelopeSchema)

/** Payload semantics (IR, Blockly, asset content) are refined by Studio's language adapters. */
export type StudioProjectDocument = z.infer<typeof envelopeSchema>
export type StudioJavaScriptClassicDocument = Extract<
  StudioProjectDocument,
  { programmingLanguage: 'javascript'; kind: 'classic' }
>
export type StudioJavaScriptProDocument = Extract<
  StudioProjectDocument,
  { programmingLanguage: 'javascript'; kind: 'pro' }
>
export type StudioPythonClassicDocument = Extract<
  StudioProjectDocument,
  { programmingLanguage: 'python'; kind: 'classic' }
>
export type StudioPythonProDocument = Extract<
  StudioProjectDocument,
  { programmingLanguage: 'python'; kind: 'pro' }
>

export class StudioProjectUpgradeError extends Error {
  constructor(
    readonly code: 'invalid-document' | 'future-format' | 'legacy-migration-required',
    message: string,
  ) {
    super(message)
    this.name = 'StudioProjectUpgradeError'
  }
}

export interface StudioProjectDocumentUpgrade {
  document: StudioProjectDocument
  fromVersion: 2 | 3
  toVersion: 3
  changes: readonly { rule: string; path: string }[]
}

/**
 * Pure v2→v3 step, after the existing historical v1→v2 converter. No generators,
 * block transformations, storage or clock. The JS release must come from the verified
 * host catalog. This function does not activate the product's current writer version.
 */
export function upgradeStudioProjectDocumentV2(
  raw: unknown,
  javascriptRelease: StudioRuntimeRelease,
): StudioProjectDocumentUpgrade {
  const copied = copyStudioProjectJson(raw)
  if (!copied || typeof copied !== 'object' || Array.isArray(copied))
    throw new StudioProjectUpgradeError(
      'invalid-document',
      'O projeto precisa ser um documento JSON.',
    )
  const document = copied as Record<string, unknown>
  const fromVersion = document.formatVersion
  if (fromVersion === 3)
    return { document: envelopeSchema.parse(document), fromVersion, toVersion: 3, changes: [] }
  if (fromVersion === undefined || fromVersion === 1)
    throw new StudioProjectUpgradeError(
      'legacy-migration-required',
      'O projeto precisa passar pela conversão histórica antes da atualização de ambiente.',
    )
  if (typeof fromVersion === 'number' && Number.isInteger(fromVersion) && fromVersion > 3)
    throw new StudioProjectUpgradeError(
      'future-format',
      'Este projeto pertence a uma versão mais nova do Estúdio.',
    )
  if (
    fromVersion !== 2 ||
    (document.programmingLanguage !== undefined && document.programmingLanguage !== 'javascript') ||
    document.runtime !== undefined ||
    document.python !== undefined
  )
    throw new StudioProjectUpgradeError(
      'invalid-document',
      'O formato antigo não pode conter um ambiente diferente ou incompleto.',
    )
  if (javascriptRelease.manifest.programmingLanguage !== 'javascript')
    throw new StudioProjectUpgradeError(
      'invalid-document',
      'A migração precisa do ambiente JavaScript aprovado pelo host.',
    )
  const kind = document.kind === undefined ? 'classic' : document.kind
  if (kind !== 'classic' && kind !== 'pro')
    throw new StudioProjectUpgradeError('invalid-document', 'O tipo do projeto é desconhecido.')
  const changes = [
    { rule: 'document.environment-language', path: '$.programmingLanguage' },
    { rule: 'document.environment-runtime', path: '$.runtime' },
    { rule: 'document.format', path: '$.formatVersion' },
  ]
  if (document.kind === undefined) changes.push({ rule: 'document.explicit-kind', path: '$.kind' })
  if (kind === 'classic' && document.mode === 'code') {
    document.mode = 'bridge'
    changes.push({ rule: 'document.classic-code-mode', path: '$.mode' })
  }
  // Undefined projections in IndexedDB have no serialized document field. No defined
  // unknown field is removed; the strict envelope rejects it and preserves the input.
  for (const key of Object.keys(document)) if (document[key] === undefined) delete document[key]
  document.kind = kind
  document.formatVersion = 3
  document.programmingLanguage = 'javascript'
  document.runtime = {
    profileId: javascriptRelease.profileId,
    releaseId: javascriptRelease.releaseId,
    manifestSha256: javascriptRelease.manifestSha256,
  }
  const upgraded = envelopeSchema.parse(document)
  const manifest = javascriptRelease.manifest
  if (
    !manifest.kinds.includes(upgraded.kind) ||
    !manifest.modes.includes(upgraded.mode) ||
    upgraded.installedExtensions.some(
      (installed) =>
        !manifest.extensions.some(
          (supported) =>
            supported.id === installed.id && supported.versions.includes(installed.version),
        ),
    )
  )
    throw new StudioProjectUpgradeError(
      'invalid-document',
      'O ambiente escolhido não suporta o tipo, modo ou extensões deste projeto. O original foi preservado.',
    )
  return { document: upgraded, fromVersion, toVersion: 3, changes }
}
