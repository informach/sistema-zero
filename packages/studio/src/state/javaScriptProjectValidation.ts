import type { StudioProBuildLimits } from '@sistemazero/core/studio/pro-build'
import {
  StudioProjectDocumentSchema,
  StudioProjectIdSchema,
} from '@sistemazero/core/studio/project-document'
import type { JavaScriptProjectDocument } from '../core/project'
import { assertProjectContentPreserved, ProjectDocumentError } from '../core/projectDocument'
import { copyLocalRevision } from './projectStorageRevision'
import { sanitizeJavaScriptProjectPayload } from './projectValidation'
/**
 * Explicit v3 JavaScript adapter. Never migrates source or accepts Python payloads.
 * Runtime availability and grants are resolved separately by the host.
 */
export function refineJavaScriptProjectDocument(
  raw: unknown,
  options: { requestedId?: string; proBuildLimits?: StudioProBuildLimits } = {},
): JavaScriptProjectDocument {
  const document = StudioProjectDocumentSchema.parse(raw)
  if (document.programmingLanguage !== 'javascript')
    throw new ProjectDocumentError(
      'invalid-document',
      'Este documento precisa do adaptador de projetos Python.',
      '$.programmingLanguage',
    )
  const payload = sanitizeJavaScriptProjectPayload(
    document,
    // A validated v3 identity must never pass through the legacy import fallback
    // that invents an ULID for unsupported body ids.
    options.requestedId === undefined
      ? document.id
      : StudioProjectIdSchema.parse(options.requestedId),
    options.proBuildLimits,
  )
  if (!payload)
    throw new ProjectDocumentError('invalid-document', 'O conteúdo JavaScript é inválido.')
  const common = {
    id: payload.id,
    name: payload.name,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    projectTools: payload.projectTools,
    extraFiles: payload.extraFiles,
    files: payload.files,
    ir: payload.ir,
    blocksState: payload.blocksState ?? null,
    installedExtensions: payload.installedExtensions,
    assets: payload.assets,
    coverAssetName: payload.coverAssetName,
  }
  let project: JavaScriptProjectDocument
  if (document.kind === 'pro') {
    if (!payload.tree || !payload.proMeta)
      throw new ProjectDocumentError(
        'invalid-document',
        'A estrutura do projeto de Código é inválida.',
      )
    project = { ...document, ...common, tree: payload.tree, proMeta: payload.proMeta }
  } else project = { ...document, ...common }
  assertProjectContentPreserved(document, project)
  return copyLocalRevision(raw as { id: string }, project)
}
