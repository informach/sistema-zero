import type { StudioProjectDocument } from '@sistemazero/core/studio/project-document'
import type { Project } from '../core/project'
import {
  PROJECT_STORAGE_VERSION,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectStateKey,
} from './projectStorageKeys'

/** The partition codec transports documents; payload validation belongs to the reader. */
export type StorableProjectDocument = Project | StudioProjectDocument
export type StoredProjectRecord = Record<string, unknown> & { id: string }

export function projectToMetaRecord(project: StorableProjectDocument) {
  return {
    id: project.id,
    name: project.name,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    mode: project.mode,
    installedExtensions: project.installedExtensions,
    storageVersion: PROJECT_STORAGE_VERSION,
    // Modo profissional: discriminante + metadados do dev-server. Ausentes em
    // projetos classic (undefined é preservado pelo structured clone do IDB).
    kind: project.kind,
    ...('proMeta' in project ? { proMeta: project.proMeta } : {}),
    ...('programmingLanguage' in project &&
    project.programmingLanguage === 'python' &&
    project.kind === 'classic' &&
    project.publication
      ? { publication: project.publication }
      : {}),
    bridgeCodeAhead: project.bridgeCodeAhead,
    formatVersion: project.formatVersion,
    projectTools: project.projectTools,
    // A capa escolhida mora no meta (é uma string): a lista e a nuvem a leem sem os assets.
    coverAssetName: project.coverAssetName,
    ...('programmingLanguage' in project
      ? { programmingLanguage: project.programmingLanguage, runtime: project.runtime }
      : {}),
  }
}

export function projectToFilesRecord(project: StorableProjectDocument) {
  if ('programmingLanguage' in project && project.programmingLanguage === 'python')
    return project.kind === 'pro'
      ? { id: project.id, tree: project.tree, python: project.python }
      : { id: project.id, files: project.files, python: project.python }
  return {
    id: project.id,
    files: project.files,
    extraFiles: project.extraFiles,
    // Árvore real do modo profissional (path-keyed); ausente em classic.
    ...('tree' in project ? { tree: project.tree } : {}),
  }
}

export function projectToStateRecord(project: StorableProjectDocument) {
  return {
    id: project.id,
    ir: project.bridgeCodeAhead === true ? null : project.ir,
  }
}

export function projectToBlocksRecord(project: StorableProjectDocument) {
  return {
    id: project.id,
    blocksState: project.blocksState,
  }
}

export function projectToAssetsRecord(project: StorableProjectDocument) {
  return {
    id: project.id,
    // Assets embutidos (imagens). Ausente/undefined em projetos sem assets — o
    // structured clone do IDB preserva undefined, e o load é tolerante.
    assets: project.assets,
  }
}

export function assembleProjectRecord(
  id: string,
  meta: unknown,
  files: unknown,
  state: unknown,
  assets?: unknown,
  blocks?: unknown,
): StoredProjectRecord | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  const assembled: StoredProjectRecord = {
    // An absent optional blocks partition means no derived cache. V3 documents
    // still carry the explicit null; a quick shell read must not invent blocks.
    blocksState: null,
    ...(meta as Record<string, unknown>),
    ...(files as Record<string, unknown>),
    ...(state as Record<string, unknown>),
    ...(blocks && typeof blocks === 'object' && !Array.isArray(blocks)
      ? (blocks as Record<string, unknown>)
      : {}),
    // Partição de assets (opcional): mescla só se for um registro válido. O
    // sanitizer do projectStore valida o conteúdo de `assets` depois.
    ...(assets && typeof assets === 'object' && !Array.isArray(assets)
      ? (assets as Record<string, unknown>)
      : {}),
    id,
  }
  // Partition layout is independent of the portable document format. Never leak
  // this local-only marker into a strict document, cloud snapshot or export.
  delete assembled.storageVersion
  // IndexedDB can retain omitted optional projections as undefined; JSON cannot.
  for (const key of Object.keys(assembled)) if (assembled[key] === undefined) delete assembled[key]
  return assembled
}

export function projectStorageEntries(project: StorableProjectDocument): Array<[string, unknown]> {
  return [
    [projectMetaKey(project.id), projectToMetaRecord(project)],
    [projectFilesKey(project.id), projectToFilesRecord(project)],
    [projectStateKey(project.id), projectToStateRecord(project)],
    [projectBlocksKey(project.id), projectToBlocksRecord(project)],
    [projectAssetsKey(project.id), projectToAssetsRecord(project)],
  ]
}
