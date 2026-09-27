import type { Project } from '../core/project'
import {
  PROJECT_STORAGE_VERSION,
  projectAssetsKey,
  projectBlocksKey,
  projectFilesKey,
  projectMetaKey,
  projectStateKey,
} from './projectStorageKeys'

export function projectToMetaRecord(
  project: Project,
): Pick<
  Project,
  | 'id'
  | 'name'
  | 'createdAt'
  | 'updatedAt'
  | 'mode'
  | 'installedExtensions'
  | 'kind'
  | 'proMeta'
  | 'bridgeCodeAhead'
  | 'formatVersion'
  | 'projectTools'
  | 'coverAssetName'
> & { storageVersion: number } {
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
    proMeta: project.proMeta,
    bridgeCodeAhead: project.bridgeCodeAhead,
    formatVersion: project.formatVersion,
    projectTools: project.projectTools,
    // A capa escolhida mora no meta (é uma string): a lista e a nuvem a leem sem os assets.
    coverAssetName: project.coverAssetName,
  }
}

export function projectToFilesRecord(
  project: Project,
): Pick<Project, 'id' | 'files' | 'extraFiles' | 'tree'> {
  return {
    id: project.id,
    files: project.files,
    extraFiles: project.extraFiles,
    // Árvore real do modo profissional (path-keyed); ausente em classic.
    tree: project.tree,
  }
}

export function projectToStateRecord(project: Project): Pick<Project, 'id' | 'ir'> {
  return {
    id: project.id,
    ir: project.bridgeCodeAhead === true ? null : project.ir,
  }
}

export function projectToBlocksRecord(project: Project): Pick<Project, 'id' | 'blocksState'> {
  return {
    id: project.id,
    blocksState: project.blocksState,
  }
}

export function projectToAssetsRecord(project: Project): Pick<Project, 'id' | 'assets'> {
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
): Project | null {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return null
  if (!files || typeof files !== 'object' || Array.isArray(files)) return null
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null
  return {
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
  } as Project
}

export function projectStorageEntries(project: Project): Array<[string, unknown]> {
  return [
    [projectMetaKey(project.id), projectToMetaRecord(project)],
    [projectFilesKey(project.id), projectToFilesRecord(project)],
    [projectStateKey(project.id), projectToStateRecord(project)],
    [projectBlocksKey(project.id), projectToBlocksRecord(project)],
    [projectAssetsKey(project.id), projectToAssetsRecord(project)],
  ]
}
