import { canonicalJson, sha256Hex } from '@sistemazero/core/creations'
import {
  type StudioProjectDocument,
  StudioProjectDocumentSchema,
  StudioProjectIdSchema,
  StudioProjectNameSchema,
  StudioProjectTreeSchema,
} from '@sistemazero/core/studio/project-document'
import {
  STUDIO_DEFAULT_PROJECT_LANGUAGE,
  StudioProjectKindSchema,
  StudioProjectLanguageSchema,
  type StudioRuntimeSelection,
} from '@sistemazero/core/studio/project-environment'
import { copyStudioProjectJson } from '@sistemazero/core/studio/project-json'
import {
  type StudioRuntimeCatalog,
  type StudioRuntimeReleaseStatus,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import { z } from 'zod'
import { createBlankProjectSnapshot } from './blankProject'
import type { Project } from './project'
import { buildProProject } from './proProject'

const identity = {
  id: StudioProjectIdSchema,
  name: StudioProjectNameSchema,
  now: z.number().int().nonnegative().optional(),
}
const newProjectSchema = z.union([
  z.strictObject({
    ...identity,
    programmingLanguage: z.literal('javascript').optional(),
    kind: z.literal('classic').optional(),
  }),
  z.strictObject({
    ...identity,
    programmingLanguage: z.literal('javascript').optional(),
    kind: z.literal('pro'),
    template: z.strictObject({
      tree: StudioProjectTreeSchema,
      devScript: z.string(),
      id: z.string(),
      assets: z.array(z.unknown()).optional(),
    }),
  }),
  z.strictObject({
    ...identity,
    programmingLanguage: z.literal('python'),
    kind: StudioProjectKindSchema.optional(),
  }),
])
export type NewStudioProject = z.infer<typeof newProjectSchema>

export interface StudioProjectFactoryContext {
  /** Verified by the host at startup; never read from the learner's document. */
  catalog: StudioRuntimeCatalog
  runtime: StudioRuntimeSelection
  releaseStatus: StudioRuntimeReleaseStatus
}

/**
 * Creates a detached v3 document. Selecting an environment does not authorize
 * execution: the host still resolves capabilities and supplies a runtime provider.
 * Product callers switch to this factory together with the v3 reader/writer.
 */
export async function createStudioProjectDocument(
  options: NewStudioProject,
  context: StudioProjectFactoryContext,
): Promise<StudioProjectDocument> {
  // Snapshot template/source input before hashing or loading a language adapter.
  const input = newProjectSchema.parse(copyStudioProjectJson(options))
  const language = StudioProjectLanguageSchema.parse(
    input.programmingLanguage ?? STUDIO_DEFAULT_PROJECT_LANGUAGE,
  )
  const kind = StudioProjectKindSchema.parse(input.kind ?? 'classic')
  const mode = kind === 'pro' ? 'code' : 'blocks'
  const release = selectStudioRuntimeRelease(context.catalog, context.runtime)
  if (!release || context.releaseStatus !== 'active')
    throw new Error('O ambiente não está disponível para criar novos projetos.')
  if (
    release.manifest.programmingLanguage !== language ||
    !release.manifest.kinds.includes(kind) ||
    !release.manifest.modes.includes(mode)
  )
    throw new Error('O ambiente não corresponde à linguagem ou ao tipo de projeto escolhido.')
  const runtime = {
    profileId: release.profileId,
    releaseId: release.releaseId,
    manifestSha256: release.manifestSha256,
  }
  const now = input.now ?? Date.now()
  if (input.programmingLanguage !== 'python') {
    const legacy: Project =
      input.kind === 'pro'
        ? buildProProject(
            input.id,
            input.name,
            input.template.tree,
            input.template.devScript,
            input.template.id,
          )
        : createBlankProjectSnapshot(input.id, input.name)
    // Reuse existing semantic guards for JS templates. No Python data enters them.
    if (legacy.kind === 'pro') {
      const { sanitizeProTree, sanitizeProMeta } = await import('../state/proTree')
      const tree = sanitizeProTree(legacy.tree)
      const meta = sanitizeProMeta(legacy.proMeta)
      if (
        !tree ||
        !meta ||
        canonicalJson(tree) !== canonicalJson(legacy.tree) ||
        canonicalJson(meta) !== canonicalJson(legacy.proMeta)
      )
        throw new Error('O modelo JavaScript contém arquivos ou configuração inválidos.')
    }
    return StudioProjectDocumentSchema.parse({
      ...legacy,
      ...(input.kind === 'pro' ? { assets: input.template.assets ?? [] } : {}),
      formatVersion: 3,
      programmingLanguage: language,
      runtime,
      kind,
      createdAt: now,
      updatedAt: now,
    })
  }
  const python = {
    entrypoint: 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: release.manifest.python!.version,
      runtimeManifestSha256: release.manifestSha256,
      requirementsSha256: await sha256Hex(''),
      packages: [],
    },
  }
  return StudioProjectDocumentSchema.parse({
    formatVersion: 3,
    id: input.id,
    name: input.name,
    createdAt: now,
    updatedAt: now,
    programmingLanguage: language,
    runtime,
    kind,
    mode,
    python,
    projectTools: [],
    installedExtensions: [],
    assets: [],
    ir: null,
    blocksState: null,
    ...(kind === 'pro'
      ? {
          tree: {
            'main.py': { kind: 'file', content: '' },
            'requirements.txt': { kind: 'file', content: '' },
          },
          proMeta: { templateId: 'python-blank' },
        }
      : { files: { 'main.py': '', 'requirements.txt': '' } }),
  })
}

/** Product entry point: preserve template material and apply the same reader as saved projects. */
export async function createEditableStudioProject(
  options: NewStudioProject,
  context: StudioProjectFactoryContext,
) {
  const document = await createStudioProjectDocument(options, context)
  const { prepareEditableStudioProject } = await import('../state/editableProjectValidation')
  const project = await prepareEditableStudioProject(document)
  if (!project) throw new Error('Não foi possível criar o projeto neste ambiente.')
  return project
}
